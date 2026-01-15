import { getLineNameCanvas } from "../brush";
import { activeTool, drawState, hoverTech, resetDrawState } from "../globals";
import { clearSvgDraw, startSvgDraw, updateSvgDraw } from "../selection";
import {
  SelectionMode,
  HoverResult,
  IHoverDetectionBackend,
  HoverDetectionConfig,
  DEFAULT_CONFIG,
  DetectionParams,
} from "./hoverTypes";
import { GPUHoverBackend } from "./gpuHover";
import { CPUHoverBackend } from "./cpuHover";

export type { SelectionMode, DrawState, HoverResult } from "./hoverTypes";

interface HoverState {
  backend: IHoverDetectionBackend;
  lineCount: number;
  hoveredIds: Set<string>;
  mouseMoveHandler: ((e: MouseEvent) => void) | null;
  mouseDownHandler: ((e: MouseEvent) => void) | null;
  mouseUpHandler: ((e: MouseEvent) => void) | null;
  lastSelectionMode: SelectionMode;
  parcoords: any;
  onHoveredLinesChange: any;
}

let hoverState: HoverState | null = null;

const config: HoverDetectionConfig = { ...DEFAULT_CONFIG };

function createBackend(): IHoverDetectionBackend {
  const gpuBackend = new GPUHoverBackend();
  if (gpuBackend.isAvailable() && hoverTech === "GPU") {
    console.log("[HoverDetection] Using GPU backend");
    return gpuBackend;
  }
  console.log("[HoverDetection] Using CPU backend");
  return new CPUHoverBackend();
}

function cleanupHoverDetection(): void {
  if (!hoverState) return;

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  if (hoverState.mouseMoveHandler) {
    plotArea.removeEventListener("mousemove", hoverState.mouseMoveHandler);
  }
  if (hoverState.mouseDownHandler) {
    plotArea.removeEventListener("mousedown", hoverState.mouseDownHandler);
  }
  if (hoverState.mouseUpHandler) {
    plotArea.removeEventListener("mouseup", hoverState.mouseUpHandler);
  }

  resetDrawState();
  clearSvgDraw();

  hoverState.backend.destroy();
  hoverState = null;
}

export async function initHoverDetection(
  parcoords: any,
  onHoveredLinesChange: any
): Promise<void> {
  cleanupHoverDetection();

  const dataset = parcoords.newDataset;
  const backend = createBackend();

  await backend.init(dataset.length, config);

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  const mouseMoveHandler = async (e: MouseEvent) => {
    if (!hoverState) return;

    const r = plotArea.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (drawState.isDrawing) {
      drawState.endX = x;
      drawState.endY = y;
      updateSvgDraw(
        drawState.startX,
        drawState.startY,
        drawState.endX,
        drawState.endY
      );
    } else {
      await detectHoveredPolylines(
        x,
        y,
        parcoords,
        onHoveredLinesChange,
        "hover"
      );
    }
  };

  const mouseDownHandler = (e: MouseEvent) => {
    if (e.shiftKey) return;

    const r = plotArea.getBoundingClientRect();

    drawState.isDrawing = true;
    drawState.startX = e.clientX - r.left;
    drawState.startY = e.clientY - r.top;
    drawState.endX = drawState.startX;
    drawState.endY = drawState.startY;

    startSvgDraw(drawState.startX, drawState.startY);
  };

  const mouseUpHandler = async () => {
    if (!hoverState || !drawState.isDrawing) return;

    drawState.isDrawing = false;
    drawState.wasDrawing = true;
    clearSvgDraw();

    const selectionMode: SelectionMode = activeTool === "line" ? "line" : "box";

    await detectHoveredPolylines(
      drawState.endX,
      drawState.endY,
      parcoords,
      onHoveredLinesChange,
      selectionMode
    );
  };

  plotArea.addEventListener("mousemove", mouseMoveHandler);
  plotArea.addEventListener("mousedown", mouseDownHandler);
  plotArea.addEventListener("mouseup", mouseUpHandler);

  hoverState = {
    backend,
    lineCount: dataset.length,
    hoveredIds: new Set(),
    mouseMoveHandler,
    mouseDownHandler,
    mouseUpHandler,
    lastSelectionMode: "hover",
    parcoords,
    onHoveredLinesChange,
  };

  updateLineDataBuffer(dataset, parcoords);
}

export function updateLineDataBuffer(dataset: any[], parcoords: any): void {
  if (!hoverState) return;

  const data = new Float32Array(
    hoverState.lineCount * config.maxPointsPerLine * 2
  );

  dataset.forEach((d, i) => {
    const pts = getPolylinePoints(d, parcoords);
    pts.forEach((p, j) => {
      const o = (i * config.maxPointsPerLine + j) * 2;
      data[o] = p[0];
      data[o + 1] = p[1];
    });
  });

  hoverState.backend.updateLineData(data);
}

export async function detectHoveredPolylines(
  x: number,
  y: number,
  parcoords: any,
  onHoveredLinesChange: any,
  mode?: SelectionMode
): Promise<HoverResult> {
  if (!hoverState) {
    return { hoveredIds: new Set(), hoveredList: [], selectionMode: "hover" };
  }

  const selectionMode: SelectionMode = mode || "hover";

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  const rect = plotArea.getBoundingClientRect();

  const params: DetectionParams = {
    mouseX: x,
    mouseY: y,
    mode: selectionMode,
    offset: { x: rect.left, y: rect.top },
  };

  if (selectionMode !== "hover") {
    params.drawStart = { x: drawState.startX, y: drawState.startY };
    params.drawEnd = { x: drawState.endX, y: drawState.endY };
  }

  const results = await hoverState.backend.detect(params);

  hoverState.hoveredIds.clear();
  const hoveredList: string[] = [];

  parcoords.newDataset.forEach((d: any, i: number) => {
    if (results[i]) {
      const id = getLineNameCanvas(d);
      hoverState!.hoveredIds.add(id);
      hoveredList.push(id);
    }
  });

  hoverState.lastSelectionMode = selectionMode;
  onHoveredLinesChange(hoveredList, selectionMode);

  return {
    hoveredIds: new Set(hoverState.hoveredIds),
    hoveredList,
    selectionMode,
  };
}

export function getPolylinePoints(d: any, parcoords: any): [number, number][] {
  return parcoords.newFeatures.map((name: string) => [
    parcoords.dragging[name] ?? parcoords.xScales(name),
    parcoords.yScales[name](d[name]),
  ]);
}

export function getHoveredIds(): Set<string> {
  return hoverState?.hoveredIds ?? new Set();
}

export function getCurrentBackendType(): "gpu" | "cpu" | null {
  if (!hoverState) return null;
  return hoverState.backend instanceof GPUHoverBackend ? "gpu" : "cpu";
}
