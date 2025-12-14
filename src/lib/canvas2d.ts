import { getLineNameCanvas } from "./brush";
import { canvasEl, lineState } from "./globals";
let ctx: CanvasRenderingContext2D | null = null;

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

export function redrawCanvasLines(dataset, parcoords) {
  if (!ctx || !canvasEl || !dataset) return;
  ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

  for (const d of dataset) {
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
}

export function initCanvas2D(dpr: number) {
  ctx = canvasEl.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 2D only
  return ctx;
}
