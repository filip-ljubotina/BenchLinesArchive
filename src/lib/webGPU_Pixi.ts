
import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";
import { WebGPURenderer } from 'pixi.js';

export async function initCanvasWebGPUPixi() {
}

function getPolylinePoints(d: any, parcoords: any): number[] {
  const pts: number[] = [];
  const height = canvasEl.clientHeight;
  parcoords.newFeatures.forEach((name: string) => {
    const x = parcoords.dragging[name] ?? parcoords.xScales(name);
    const y = height - parcoords.yScales[name](d[name]);
    pts.push(x, y, 0);
  });
  return pts;
}

export function redrawWebGPUPixiLines(dataset: any[], parcoords: any) {
}
