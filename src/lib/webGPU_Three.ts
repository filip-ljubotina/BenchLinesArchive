import { canvasEl, lineState } from "./globals";
import { getLineName } from "./brush";
// @ts-ignore
import * as THREE from 'three/webgpu';

let renderer: THREE.WebGPURenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let activeMaterial: THREE.LineBasicMaterial;
let inactiveMaterial: THREE.LineBasicMaterial;

function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

export async function initCanvasWebGPUThreeJS() {
  // Setup Three.js WebGPU renderer
  renderer = new THREE.WebGPURenderer({ canvas: canvasEl, antialias: true, alpha: true });
  await renderer.init();
  renderer.setClearColor(0x000000, 0); // transparent
  renderer.setSize(canvasEl.width, canvasEl.height, false);

  // Setup scene and camera
  scene = new THREE.Scene();
  const dpr = window.devicePixelRatio || 1;
  camera = new THREE.OrthographicCamera(
    0, canvasEl.width * dpr, canvasEl.height * dpr, 0, -1, 1
  );

  // Materials for active/inactive lines
  activeMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(0, 129 / 255, 175 / 255),
    transparent: true,
    opacity: 0.5,
  });
  inactiveMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(211 / 255, 211 / 255, 211 / 255),
    transparent: true,
    opacity: 0.4,
  });
}

export function redrawWebGPULinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !camera) {
    throw new Error("WebGPU renderer not initialized. Call initCanvasWebGPUThreeJS first.");
  }

  // Clear previous lines
  while (scene.children.length > 0) scene.remove(scene.children[0]);

  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvasEl.width * dpr;
  const canvasHeight = canvasEl.height * dpr;

  let activeCount = 0;
  let inactiveCount = 0;

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    if (active) activeCount++; else inactiveCount++;

    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    // Convert to Three.js Vector3 array
    const vertices: THREE.Vector3[] = pts.map(([x, y]) => new THREE.Vector3(x, y, 0));
    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);

    const line = new THREE.Line(geometry, active ? activeMaterial : inactiveMaterial);
    scene.add(line);
  }

  renderer.render(scene, camera);
}