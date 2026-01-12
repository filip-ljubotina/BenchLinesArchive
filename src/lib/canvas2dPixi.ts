import { getLineNameCanvas } from "./brush";
import { canvasEl, lineState } from "./globals";
import * as PIXI from "pixi.js-legacy";

let renderer: PIXI.CanvasRenderer | null = null;
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

export function redrawPixiCanvasLines(dataset: any[], parcoords: any) {
  if (!renderer || !stage || !linesContainer || !dataset) return;

  linesContainer.removeChildren();
  lineGraphics.clear();

  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;

    const pts = getPolylinePoints(d, parcoords);
    if (!pts.length) continue;

    const graphics = new PIXI.Graphics();

    const color = active ? 0x0081af : 0xd3d3d3;
    const alpha = active ? 0.5 : 0.4;
    

    graphics.lineStyle(2, color, 1.0);
    graphics.alpha = 0.5;

    graphics.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      graphics.lineTo(pts[i][0], pts[i][1]);
    }

    linesContainer.addChild(graphics);
    lineGraphics.set(id, graphics);
  }

  renderer.render(stage);
}

export function initPixiCanvas2D(dpr: number) {
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

  return renderer;
}

export function destroyPixiRenderer() {
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
}
