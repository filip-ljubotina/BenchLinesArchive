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

export function redrawWebGLLinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !lines) return;

  const height = canvasEl.clientHeight;

  let totalSegments = 0;
  for (const d of dataset) {
    const n = parcoords.newFeatures.length;
    if (n >= 2) totalSegments += n - 1;
  }

  const positions = new Float32Array(totalSegments * 2 * 3);
  const colors = new Float32Array(totalSegments * 2 * 3);

  let offset = 0;
  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    const color = active ? [0.5, 0.75, 0.84] : [0.92, 0.92, 0.92];

    // Compute polyline points
    const pts: [number, number, number][] = parcoords.newFeatures.map((name: string) => {
      const x = parcoords.dragging[name] ?? parcoords.xScales(name);
      const y = height - parcoords.yScales[name](d[name]);
      return [x, y, 0];
    });
    if (pts.length < 2) continue;

    for (let i = 0; i < pts.length - 1; i++) {
      // Vertex 1
      positions.set(pts[i], offset);
      colors.set(color, offset);
      offset += 3;

      // Vertex 2
      positions.set(pts[i + 1], offset);
      colors.set(color, offset);
      offset += 3;
    }
  }

  lineGeometry.setPositions(positions);
  lineGeometry.setColors(colors);
  lineMaterial.needsUpdate = true;

  renderer.render(scene, camera);
}