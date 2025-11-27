import { 
  Engine3D, 
  Scene3D, 
  Camera3D, 
  View3D, 
  Vector3, 
  Color, 
  Object3D,
} from '@orillusion/core';
import { 
  Graphic3D,
} from '@orillusion/graphic';
import { canvasEl } from "./globals";
import { getLineName } from "./brush";
import { lineState } from "./globals";

let scene: Scene3D;
let camera: Camera3D;
let view: View3D;
let graphic3D: Graphic3D;

function getPolylinePoints(d: any, parcoords: any): number[] {
  const pts: number[] = [];
  const height = canvasEl.clientHeight;
  parcoords.newFeatures.forEach((name: string) => {
    const width = canvasEl.clientWidth;
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) - width / 2;
    const y = height + 40 - parcoords.yScales[name](d[name]) - height / 2;
    pts.push(x, y, 0);
  });
  return pts;
}

export async function initCanvasWebGPUOrillusion() {
    const dpr = window.devicePixelRatio || 1;
    const width = canvasEl.clientWidth;
    const height = canvasEl.clientHeight;
    console.log("Canvas size:", width, height);
    await Engine3D.init({
      canvasConfig: { canvas: canvasEl }, 
    });
    console.log("Orillusion WebGPU initialized");
    scene = new Scene3D();
    let cameraObj = new Object3D();
    camera = cameraObj.addComponent(Camera3D);
    camera.orthoOffCenter(
      -width / 2,
      width / 2,
      height / 2,
      -height / 2,
      -1,
      1
    );
    scene.addChild(cameraObj);
    view = new View3D();
    view.scene = scene;
    view.camera = camera;
    graphic3D = new Graphic3D();
    scene.addChild(graphic3D);
    // Engine3D.startRenderView(view);
    // https://github.com/Orillusion/orillusion/issues/488
    // https://github.com/Orillusion/orillusion/issues/402
    Engine3D.setting.gi.autoRenderProbe = true;
    console.log("Orillusion WebGPU rendering started");
    return view;
  }


export function redrawWebGPULinesOrillusion(dataset: any[], parcoords: any) {
  if (!scene || !graphic3D) return;
  Engine3D.startRenderView(view);
  scene.removeChild(graphic3D);
  graphic3D = new Graphic3D();
  scene.addChild(graphic3D);

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    const points = getPolylinePoints(d, parcoords);    

    if (points.length < 6) continue;

    // Convert flat number[] to Vector3[]
    const vectors: Vector3[] = [];
    for (let i = 0; i < points.length; i += 3) {
      vectors.push(new Vector3(points[i], points[i + 1], points[i + 2]));
    }

    const color = active 
      ? new Color(0.5, 0.75, 0.84, 1.0)
      : new Color(0.92, 0.92, 0.92, 1.0);

    graphic3D.drawLines(id, vectors, color);
  }

  // log active and inactive lines
  let activeCount = 0;
  let inactiveCount = 0;
  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    if (active) {
      activeCount++;
    } else {
      inactiveCount++;
    }
  }
  // console.log(`Orillusion WebGPU: Active lines: ${activeCount}, Inactive lines: ${inactiveCount}`);
}