import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let lines: Line2;
let lineMaterial: LineMaterial;
let lineGeometry: LineSegmentsGeometry;

let maxVertices = 100000 * 2;
let positions = new Float32Array(maxVertices * 3);
let colors = new Float32Array(maxVertices * 3);

export function initCanvasWebGLThreeJS() {
  const width = canvasEl.clientWidth;
  const height = canvasEl.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  lineGeometry = new LineSegmentsGeometry();
  lineMaterial = new LineMaterial({
    color: 0xffffff,
    linewidth: 2,
    vertexColors: true,
  });
  lineMaterial.resolution.set(width, height);

  lines = new Line2(lineGeometry, lineMaterial);
  scene.add(lines);

  return renderer;
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

export function redrawWebGLLinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !lines) return;

  let offset = 0;

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    const pts = getPolylinePoints(d, parcoords);
    if (pts.length < 6) continue;

    const color = active ? [0.5, 0.75, 0.84] : [0.92, 0.92, 0.92]; // RGB normalized

    // convert polyline to segments like we do in webgl
    for (let i = 0; i < pts.length - 3; i += 3) {
      positions.set(pts.slice(i, i + 3), offset * 3);
      colors.set(color, offset * 3);
      offset++;

      positions.set(pts.slice(i + 3, i + 6), offset * 3);
      colors.set(color, offset * 3);
      offset++;
    }
  }

  lineGeometry.setPositions(positions.subarray(0, offset * 3));
  lineGeometry.setColors(colors.subarray(0, offset * 3));
  lineMaterial.needsUpdate = true;

  renderer.render(scene, camera);
}
