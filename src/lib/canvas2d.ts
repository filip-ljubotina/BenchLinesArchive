import { getLineNameCanvas } from "./brush";
import {
  canvasEl,
  drawState,
  getDrawState,
  lineState,
  parcoords,
} from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";
// the backgrounds are generated using webgl
import {
  initLineTextureWebGL,
  drawInactiveLinesTexture,
  rasterizeInactiveLinesToCanvas,
} from "./lineTexture";

let ctx: CanvasRenderingContext2D | null = null;
let overlayCanvasEl: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D | null = null;

// Background canvas
let inactiveLinesCanvas: HTMLCanvasElement;
let bgGlCanvas: HTMLCanvasElement | null = null; // persistent canvas (offscreen) to render the inactive lines to before saving as a texture and putting it on the inactiveLinesCanvas

let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let currentParcoords: any = null;

function getPolylinePoints(d: any, parcoords: any): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x =
      parcoords.dragging[name] !== undefined
        ? parcoords.dragging[name]
        : parcoords.xScales(name);
    const y = parcoords.yScales[name](d[name]);
    pts.push([x, y]);
  });
  return pts;
}

function createOverlayCanvas(): HTMLCanvasElement {
  const overlay = document.createElement("canvas");
  overlay.width = canvasEl.width;
  overlay.height = canvasEl.height;
  overlay.style.width = canvasEl.style.width;
  overlay.style.height = canvasEl.style.height;
  overlay.style.position = "absolute";
  overlay.style.top = canvasEl.style.top;
  overlay.style.left = canvasEl.style.left;

  canvasEl.parentNode?.insertBefore(overlay, canvasEl.nextSibling);

  return overlay;
}

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    // hoveredIds.forEach((id) => hoveredLineIds.add(id));
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        hoveredLineIds.add(id);
      }
    });
    if (hoveredIds.length > 0) {
      const data = dataset.find((d) => getLineNameCanvas(d) === hoveredIds[0]);
      if (data) {
        showDataPointLabels(currentParcoords, data);
      }
    } else {
      clearDataPointLabels();
    }
  } else {
    selectedLineIds.clear();
    // hoveredIds.forEach((id) => selectedLineIds.add(id));
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        selectedLineIds.add(id);
      }
    });
  }
  redrawHoverOverlay();
}

function setupCanvasClickHandling() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  plotArea.addEventListener("click", (e) => {
    if (e.shiftKey) {
      // Shift + click: add hovered lines to selected
      if (hoveredLineIds.size > 0) {
        hoveredLineIds.forEach((id) => selectedLineIds.add(id));
      }
    } else if (drawState.wasDrawing === false) {
      // Regular click: clear selected
      selectedLineIds.clear();
    } else {
      drawState.wasDrawing = false;
    }
    redrawHoverOverlay();
  });
}

function redrawHoverOverlay() {
  if (!overlayCtx || !overlayCanvasEl || dataset.length === 0) return;

  overlayCtx.clearRect(0, 0, overlayCanvasEl.width, overlayCanvasEl.height);
  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const isHovered = hoveredLineIds.has(id);
    const isSelected = selectedLineIds.has(id);

    if (!isHovered && !isSelected) continue;

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    overlayCtx.beginPath();
    overlayCtx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      overlayCtx.lineTo(pts[i][0], pts[i][1]);
    }

    overlayCtx.lineWidth = 2;
    overlayCtx.strokeStyle = isSelected
      ? "rgba(255, 128, 0, 1.0)"
      : "rgba(255, 51, 51, 1.0)"; // Red for hovered

    overlayCtx.stroke();
  }
}

export function redrawCanvasLines(newDataset: any, parcoords: any) {
  // Store dataset for overlay use
  dataset = newDataset;
  currentParcoords = parcoords;

  if (!ctx || !canvasEl || !newDataset) return;

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  for (const d of newDataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    if (!active) continue; // skip inactive lines

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);

    ctx.lineWidth = 2;
    ctx.strokeStyle = active
      ? "rgba(128, 191, 214, 1.0)" // active
      : "rgba(235, 235, 235, 1.0)"; // inactive (faded)

    ctx.stroke();
  }

  // Redraw the hover overlay with current hovered lines
  redrawHoverOverlay();
}

export async function initCanvas2D(
  dpr: number,
  dataset: any[],
  parcoords: any
) {
  currentParcoords = parcoords;
  ctx = canvasEl.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only

  // Create and initialize overlay canvas
  overlayCanvasEl = createOverlayCanvas();
  overlayCtx = overlayCanvasEl.getContext("2d")!;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only

  //create background lines image
  inactiveLinesCanvas = document.createElement("canvas");
  inactiveLinesCanvas.width = canvasEl.width;
  inactiveLinesCanvas.height = canvasEl.height;
  inactiveLinesCanvas.style.position = "absolute";
  inactiveLinesCanvas.style.pointerEvents = "none";
  inactiveLinesCanvas.style.width = canvasEl.style.width;
  inactiveLinesCanvas.style.height = canvasEl.style.height;
  inactiveLinesCanvas.style.top = canvasEl.style.top;
  inactiveLinesCanvas.style.left = canvasEl.style.left;

  // Insert behind the main canvas
  canvasEl.parentNode?.insertBefore(inactiveLinesCanvas, canvasEl);
  redrawCanvas2DBackgroundLines(dataset, parcoords);

  createLabelsContainer();

  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();

  return ctx;
}

export function redrawCanvas2DBackgroundLines(dataset: any[], parcoords: any) {
  if (!inactiveLinesCanvas) {
    console.warn("Inactive background canvas not initialized");
    return;
  }

  const w = inactiveLinesCanvas.width;
  const h = inactiveLinesCanvas.height;

  // Create the offscreen WebGL canvas once
  if (!bgGlCanvas) {
    bgGlCanvas = document.createElement("canvas");
    bgGlCanvas.width = w;
    bgGlCanvas.height = h;
  }

  // Initialize WebGL and draw the inactive lines
  initLineTextureWebGL(bgGlCanvas);
  drawInactiveLinesTexture(dataset, parcoords);

  // Rasterize result into the 2D background canvas
  rasterizeInactiveLinesToCanvas(inactiveLinesCanvas);
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}
