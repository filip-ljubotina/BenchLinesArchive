/* =======================
   SVG Drawing Overlay
======================= */

import { activeTool } from "./globals";

let svgOverlayGroup: SVGGElement | null = null;
let svgDrawElement: SVGLineElement | SVGRectElement | null = null;

function initSvgOverlay() {
  if (svgOverlayGroup && svgOverlayGroup.parentNode) {
    svgOverlayGroup.parentNode.removeChild(svgOverlayGroup);
  }

  const svg = document.getElementById("pc_svg");
  if (!svg) throw new Error("pc_svg not found");

  svgOverlayGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  svgOverlayGroup.setAttribute("class", "draw-overlay");
  svgOverlayGroup.style.pointerEvents = "none";

  svg.appendChild(svgOverlayGroup);
}

export function startSvgDraw(x: number, y: number) {
  if (!svgOverlayGroup || !svgOverlayGroup.parentNode) {
    initSvgOverlay();
  }

  clearSvgDraw();

  if (activeTool === "line") {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", `${x}`);
    line.setAttribute("y1", `${y}`);
    line.setAttribute("x2", `${x}`);
    line.setAttribute("y2", `${y}`);
    line.setAttribute("stroke", "#3b82f6");
    line.setAttribute("stroke-width", "1.5");
    line.setAttribute("stroke-dasharray", "4 2");

    svgOverlayGroup!.appendChild(line);
    svgDrawElement = line;
  } else {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

    rect.setAttribute("x", `${x}`);
    rect.setAttribute("y", `${y}`);
    rect.setAttribute("width", "0");
    rect.setAttribute("height", "0");
    rect.setAttribute("fill", "none");
    rect.setAttribute("stroke", "#3b82f6");
    rect.setAttribute("stroke-width", "1.5");
    rect.setAttribute("stroke-dasharray", "4 2");

    svgOverlayGroup!.appendChild(rect);
    svgDrawElement = rect;
  }
}

export function updateSvgDraw(x0: number, y0: number, x1: number, y1: number) {
  if (!svgDrawElement) return;

  if (svgDrawElement.tagName === "line") {
    svgDrawElement.setAttribute("x2", `${x1}`);
    svgDrawElement.setAttribute("y2", `${y1}`);
  } else {
    const minX = Math.min(x0, x1);
    const minY = Math.min(y0, y1);
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);

    svgDrawElement.setAttribute("x", `${minX}`);
    svgDrawElement.setAttribute("y", `${minY}`);
    svgDrawElement.setAttribute("width", `${w}`);
    svgDrawElement.setAttribute("height", `${h}`);
  }
}

export function clearSvgDraw() {
  if (svgDrawElement && svgOverlayGroup) {
    svgOverlayGroup.removeChild(svgDrawElement);
  }
  svgDrawElement = null;
}
