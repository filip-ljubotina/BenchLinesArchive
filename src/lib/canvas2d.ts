import { getLineNameCanvas } from "./brush";
import { canvasEl, lineState, parcoords } from "./globals";
import { initHoverDetection } from "./hover";

let ctx: CanvasRenderingContext2D | null = null;
let overlayCanvasEl: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D | null = null;

let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];

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

function onHoveredLinesChange(hoveredIds: string[]) {
  hoveredLineIds.clear();
  hoveredIds.forEach((id) => hoveredLineIds.add(id));
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
    } else {
      // Regular click: clear selected
      selectedLineIds.clear();
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
      ? "rgba(255, 255, 0, 0.8)" // Yellow for selected
      : "rgba(255, 0, 0, 0.8)"; // Red for hovered

    overlayCtx.stroke();
  }
}

export function redrawCanvasLines(newDataset: any, parcoords: any) {
  if (!ctx || !canvasEl || !newDataset) return;

  // Store dataset for overlay use
  dataset = newDataset;

  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  for (const d of newDataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);

    ctx.lineWidth = 2;
    ctx.strokeStyle = active
      ? "rgba(0,129,175,0.5)" // active
      : "rgba(211,211,211,0.4)"; // inactive (faded)

    ctx.stroke();
  }

  // Redraw the hover overlay with current hovered lines
  redrawHoverOverlay();
}

export async function initCanvas2D(dpr: number) {
  ctx = canvasEl.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only

  // Create and initialize overlay canvas
  overlayCanvasEl = createOverlayCanvas();
  overlayCtx = overlayCanvasEl.getContext("2d")!;
  overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only

  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();

  return ctx;
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}
