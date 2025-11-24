import * as THREE from 'three';
import { WebGLRenderer } from 'three';
import { canvasEl, lineState } from "./globals";
import { getLineName } from "./brush";

let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let activeLineSegments: THREE.LineSegments;
let inactiveLineSegments: THREE.LineSegments;

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
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("GPU adapter unavailable.");
  }

  const device = await adapter.requestDevice();

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl });
  renderer.setSize(canvasEl.width, canvasEl.height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xffffff, 0);

  scene = new THREE.Scene();

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);

  // Create initial empty geometries
  const activeGeometry = new THREE.BufferGeometry();
  const inactiveGeometry = new THREE.BufferGeometry();

  const activeMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(0, 129 / 255, 175 / 255), transparent: true, opacity: 0.5 });
  const inactiveMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color(211 / 255, 211 / 255, 211 / 255), transparent: true, opacity: 0.5 });

  activeLineSegments = new THREE.LineSegments(activeGeometry, activeMaterial);
  inactiveLineSegments = new THREE.LineSegments(inactiveGeometry, inactiveMaterial);

  scene.add(activeLineSegments);
  scene.add(inactiveLineSegments);
}

export function redrawWebGPULinesThreeJS(dataset: any[], parcoords: any) {
  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvasEl.width;
  const canvasHeight = canvasEl.height;

  const activePositions: number[] = [];
  const activeIndices: number[] = [];
  const inactivePositions: number[] = [];
  const inactiveIndices: number[] = [];

  let activeVertexIndex = 0;
  let inactiveVertexIndex = 0;

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;

    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    const positions = active ? activePositions : inactivePositions;
    const indices = active ? activeIndices : inactiveIndices;
    let vertexIndex = active ? activeVertexIndex : inactiveVertexIndex;

    for (let i = 0; i < pts.length; i++) {
      const x = pts[i][0];
      const y = pts[i][1];
      const xClip = (x / canvasWidth) * 2 - 1;
      const yClip = 1 - (y / canvasHeight) * 2;
      positions.push(xClip, yClip, 0); // z=0
    }

    for (let i = 0; i < pts.length - 1; i++) {
      indices.push(vertexIndex + i, vertexIndex + i + 1);
    }

    if (active) {
      activeVertexIndex += pts.length;
    } else {
      inactiveVertexIndex += pts.length;
    }
  }

  // Update geometries
  activeLineSegments.geometry.setAttribute('position', new THREE.Float32BufferAttribute(activePositions, 3));
  activeLineSegments.geometry.setIndex(activeIndices);

  inactiveLineSegments.geometry.setAttribute('position', new THREE.Float32BufferAttribute(inactivePositions, 3));
  inactiveLineSegments.geometry.setIndex(inactiveIndices);

  renderer.render(scene, camera);
}
