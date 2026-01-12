import { getLineNameCanvas } from "./brush";
import { canvasEl, lineState } from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";
import * as PIXI from "pixi.js-legacy";

let renderer: PIXI.CanvasRenderer | null = null;
let stage: PIXI.Container | null = null;
let linesContainer: PIXI.Container | null = null;

const lineGraphics: Map<string, PIXI.Graphics> = new Map();

let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let parcoords: any;

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        hoveredLineIds.add(id);
      }
    });
    if (hoveredIds.length > 0) {
      const data = dataset.find((d) => getLineNameCanvas(d) === hoveredIds[0]);
      if (data) {
        showDataPointLabels(parcoords, data);
      }
    } else {
      clearDataPointLabels();
    }
  } else {
    selectedLineIds.clear();
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        selectedLineIds.add(id);
      }
    });
  }
  redrawPixiCanvasLines(dataset, parcoords);
}

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

export function redrawPixiCanvasLines(dataset: any[], parcoords: any) {
  if (!renderer || !stage || !linesContainer || !dataset) return;

  linesContainer.removeChildren();
  lineGraphics.clear();

  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    const isHovered = hoveredLineIds.has(id);
    const isSelected = selectedLineIds.has(id);

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    const graphics = new PIXI.Graphics();

    let color: number;
    let alpha = 1.0;

    if (isSelected) {
      color = 0xff8000; // orange
    } else if (isHovered) {
      color = 0xff3333; // red
    } else {
      color = active ? 0x80bfd6 : 0xebebeb;
    }

    graphics.lineStyle(2, color, alpha);
    graphics.alpha = 1.0;

    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      graphics.lineTo(pts[i][0], pts[i][1]);
    }

    linesContainer.addChild(graphics);
    lineGraphics.set(id, graphics);
  }

  renderer.render(stage);
}

export async function initPixiCanvas2D(dpr: number, datasetArg: any[], parcoordsArg: any) {
  dataset = datasetArg;
  parcoords = parcoordsArg;

  renderer = new PIXI.CanvasRenderer({
    view: canvasEl,
    width: canvasEl.width / dpr,
    height: canvasEl.height / dpr,
    resolution: dpr,
    backgroundAlpha: 0,
    autoDensity: true,
    clearBeforeRender: true,
  });

  stage = new PIXI.Container();
  linesContainer = new PIXI.Container();
  stage.addChild(linesContainer);

  createLabelsContainer();

  await initHoverDetection(parcoords, onHoveredLinesChange);

  return renderer;
}

export function destroyPixiRenderer() {
  clearDataPointLabels();
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  if (stage) {
    stage.destroy({ children: true });
    stage = null;
  }
  linesContainer = null;
  lineGraphics.clear();
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  parcoords = null;
}
