import { getLineNameCanvas } from "./brush";
import { canvasEl, drawState, lineState, parcoords } from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";
import * as PIXI from "pixi.js-legacy";

let renderer: PIXI.Renderer | null = null;  // WebGL renderer
let stage: PIXI.Container | null = null;
let linesContainer: PIXI.Container | null = null;

const lineGraphics: Map<string, PIXI.Graphics> = new Map();
let lineDataMap: Map<PIXI.Graphics, any> = new Map();
let ptsMap: Map<string, [number, number][]> = new Map();
let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let isInitialized = false;
let currentParcoords: any = null;

interface LineStyle {
  color: number;
  width: number;
  alpha: number;
  zIndex: number;
}

const activeStyle: LineStyle = {
  color: 0x80bfd6,
  width: 3,
  alpha: 1,
  zIndex: 0,
};
const inactiveStyle: LineStyle = {
  color: 0x80bfd6,
  width: 2,
  alpha: 1,
  zIndex: 0,
};
const hoverStyle: LineStyle = {
  color: 0xff3333,
  width: 4,
  alpha: 1,
  zIndex: 1,
};
const selectedStyle: LineStyle = {
  color: 0xff8000, // orange
  width: 4,
  alpha: 1,
  zIndex: 2,
};

export function disposeWebGLPixi() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.removeEventListener("click", onCanvasClick);
  clearDataPointLabels();
  if (linesContainer) {
    linesContainer.removeChildren();
  }
  for (const [_, graphics] of lineGraphics) {
    graphics.destroy();
  }
  lineGraphics.clear();
  lineDataMap.clear();
  ptsMap.clear();
  if (stage) {
    stage.destroy(true);
    stage = null;
  }
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  linesContainer = null;
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  currentParcoords = null;
  isInitialized = false;
}

function getLineStyle(id: string): LineStyle {
  const isHovered = hoveredLineIds.has(id);
  const isSelected = selectedLineIds.has(id);
  const active = lineState[id]?.active ?? true;
  if (isSelected) {
    return selectedStyle;
  } else if (isHovered) {
    return hoverStyle;
  } else {
    return active ? activeStyle : inactiveStyle;
  }
}

function drawLine(
  graphics: PIXI.Graphics,
  pts: [number, number][],
  style: LineStyle
) {
  graphics.clear();
  if (pts.length > 0) {
    graphics.lineStyle(style.width, style.color, style.alpha);
    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      graphics.lineTo(pts[i][0], pts[i][1]);
    }
  }
  graphics.zIndex = style.zIndex;
}

function updateLineStyles() {
  for (const [id, graphics] of lineGraphics) {
    const pts = ptsMap.get(id);
    if (pts) {
      const style = getLineStyle(id);
      drawLine(graphics, pts, style);
    }
  }
  if (linesContainer) {
    linesContainer.sortChildren();
  }
}

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    hoveredIds.forEach((id) => hoveredLineIds.add(id));
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
    hoveredIds.forEach((id) => selectedLineIds.add(id));
  }
  updateLineStyles();
  if (renderer && stage) {
    renderer.render(stage);
  }
}

function onCanvasClick(event: MouseEvent) {
  if (event.shiftKey) {
    if (hoveredLineIds.size > 0) {
      hoveredLineIds.forEach((id) => selectedLineIds.add(id));
    }
  } else if (drawState.wasDrawing === false) {
    // Regular click: clear selected
    selectedLineIds.clear();
  } else {
    drawState.wasDrawing = false;
  }
  updateLineStyles();
  if (renderer && stage) {
    renderer.render(stage);
  }
}

function setupCanvasClickHandling() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("click", onCanvasClick);
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

export function redrawWebGLLinesPixiJS(newDataset: any[], parcoords: any) {
  if (!renderer || !stage || !linesContainer || !isInitialized) {
    console.warn("WebGL-Pixi not initialized, skipping redraw");
    return;
  }
  dataset = newDataset;
  currentParcoords = parcoords;
  const usedIds = new Set<string>();
  dataset.forEach((d, index) => {
    const id = getLineNameCanvas(d);
    usedIds.add(id);
    const pts = getPolylinePoints(d, parcoords);
    let graphics = lineGraphics.get(id);
    if (!graphics) {
      graphics = new PIXI.Graphics();
      linesContainer.addChild(graphics);
      lineGraphics.set(id, graphics);
      lineDataMap.set(graphics, d);
    } else {
      lineDataMap.set(graphics, d);
    }
    ptsMap.set(id, pts);
  });
  for (const [id, graphics] of lineGraphics) {
    if (!usedIds.has(id)) {
      linesContainer.removeChild(graphics);
      graphics.destroy();
      lineDataMap.delete(graphics);
      lineGraphics.delete(id);
      ptsMap.delete(id);
    }
  }
  updateLineStyles();
  if (linesContainer) {
    linesContainer.sortChildren();
  }
  renderer.render(stage);
}

export async function initCanvasWebGLPixiJS() {
  disposeWebGLPixi();
  const dpr = window.devicePixelRatio || 1;
  renderer = new PIXI.Renderer({
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
  linesContainer.sortableChildren = true;
  stage.addChild(linesContainer);

  createLabelsContainer();
  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();
  isInitialized = true;

  return renderer;
}

export function destroyPixiRenderer() {
  disposeWebGLPixi();
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}
