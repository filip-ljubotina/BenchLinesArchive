import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let linesGroup: THREE.Group;

export function initCanvasWebGLThreeJS() {
  const width = canvasEl.clientWidth;
  const height = canvasEl.clientHeight;

  scene = new THREE.Scene();

  // Orthographic camera: top-left (0,0) origin like HTML canvas
  camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  linesGroup = new THREE.Group();
  scene.add(linesGroup);

  return renderer;
}

function getPolylinePoints(d: any, parcoords: any): number[] {
  const pts: number[] = [];
  const height = canvasEl.clientHeight;
  parcoords.newFeatures.forEach((name: string) => {
    const x = parcoords.dragging[name] ?? parcoords.xScales(name);
    const y = height - parcoords.yScales[name](d[name]);
    pts.push(x, y, 0); // z=0 for 2D lines
  });
  return pts;
}

export function redrawWebGLLinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !linesGroup) return;

  linesGroup.clear(); // remove previous lines

  const dpr = window.devicePixelRatio || 1;

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;

    const pts = getPolylinePoints(d, parcoords);
    if (pts.length < 6) continue; // at least 2 points

    const color = active ? 0x80c0d7 : 0xeaeaea; // blue or gray

    const geometry = new LineGeometry();
    geometry.setPositions(pts);

    const material = new LineMaterial({
      color,
      linewidth: 2,        // 1px thick line
      vertexColors: false,
      dashed: false,
    });

    //resolution must match canvas in pixels
    material.resolution.set(canvasEl.clientWidth * dpr, canvasEl.clientHeight * dpr);
    material.needsUpdate = true;

    const line = new Line2(geometry, material);
    line.computeLineDistances();

    linesGroup.add(line);
  }

  renderer.render(scene, camera);
}