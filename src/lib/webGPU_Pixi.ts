
import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";
import { WebGPURenderer, Container, Graphics } from 'pixi.js';

let renderer: WebGPURenderer | null = null;
let stage: Container | null = null;
let linesContainer: Container | null = null;
const lineGraphics: Map<string, Graphics> = new Map();

export async function initCanvasWebGPUPixi() {
  const dpr = window.devicePixelRatio || 1;
  renderer = new WebGPURenderer();
  await renderer.init({
    canvas: canvasEl,
    width: canvasEl.clientWidth,
    height: canvasEl.clientHeight,
    resolution: dpr,
    backgroundAlpha: 0,
  });

  stage = new Container();
  linesContainer = new Container();
  stage.addChild(linesContainer);

  return renderer;
}

function getPolylinePoints(d: any, parcoords: any): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = parcoords.dragging[name] ?? parcoords.xScales(name);
    const y = parcoords.yScales[name](d[name]);
    pts.push([x, y]);
  });
  return pts;
}

export function redrawWebGPUPixiLines(dataset: any[], parcoords: any) {
}
