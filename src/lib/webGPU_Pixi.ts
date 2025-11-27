import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";
import * as PIXI from "pixi.js"; // Use the main pixi.js package for v8+ with WebGPU support

let renderer: PIXI.WebGPURenderer | null = null;
let stage: PIXI.Container | null = null;
let linesContainer: PIXI.Container | null = null;

const lineGraphics: Map<string, PIXI.Graphics> = new Map();

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

export async function initCanvasWebGPUPixi() {
  const dpr = window.devicePixelRatio || 1;
  renderer = new PIXI.WebGPURenderer();
  await renderer.init({
    canvas: canvasEl,
    width: canvasEl.width / dpr, // Match the WebGL version's sizing
    height: canvasEl.height / dpr,
    resolution: dpr,
    backgroundAlpha: 0, // Use backgroundAlpha for transparency
    backgroundColor: 0x000000, // Optional: set a background color (black here), but with alpha 0 it's transparent
    antialias: true,
    autoDensity: true,
    clearBeforeRender: true,
  });

  stage = new PIXI.Container();
  linesContainer = new PIXI.Container();
  stage.addChild(linesContainer);

  return renderer;
}

export function redrawWebGPUPixiLines(dataset: any[], parcoords: any) {
  if (!renderer || !stage || !linesContainer || !dataset) return;

  linesContainer.removeChildren();
  lineGraphics.clear();

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    const graphics = new PIXI.Graphics();

    const color = active ? 0x0081af : 0xd3d3d3;
    const alpha = active ? 0.5 : 0.4;

    // Use the new chainable Graphics API for v8
    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      graphics.lineTo(pts[i][0], pts[i][1]);
    }
    graphics.stroke({ width: 2, color, alpha });

    linesContainer.addChild(graphics);
    lineGraphics.set(id, graphics);
  }

  renderer.render(stage);
}