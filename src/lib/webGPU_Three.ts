import { canvasEl, lineState } from "./globals";
import { getLineName } from "./brush";
// @ts-ignore
import * as THREE from 'three/webgpu';

let renderer: THREE.WebGPURenderer;
let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let activeMaterial: THREE.LineBasicMaterial;
let inactiveMaterial: THREE.LineBasicMaterial;

// --- OPTIMIZATION: Consolidated Line Objects ---
// These will hold ALL active and ALL inactive lines as a single geometry
let activeLines: THREE.LineSegments;
let inactiveLines: THREE.LineSegments;
// ----------------------------------------------

/**
 * Calculates the screen coordinates for a single data point across all axes.
 * @returns An array of [x, y] coordinate pairs.
 */
function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  // Assuming parcoords.newFeatures is the list of currently visible axes
  for (let i = 0; i < parcoords.newFeatures.length; i++) {
    const name = parcoords.newFeatures[i];
    // Use dragging position if dragging, otherwise use the fixed scale position
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    // Apply the y-scale for the dimension to the data value
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  }
  return pts;
}

/**
 * Initializes the Three.js WebGPU environment and sets up the consolidated line objects.
 */
export async function initCanvasWebGPUThreeJS() {
  renderer = new THREE.WebGPURenderer({ canvas: canvasEl, antialias: true, alpha: true });
  await renderer.init();
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(canvasEl.width, canvasEl.height, false);

  scene = new THREE.Scene();
  const dpr = window.devicePixelRatio || 1;
  camera = new THREE.OrthographicCamera(
    0, canvasEl.width * dpr, canvasEl.height * dpr, 0, -1, 1
  );

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

  // Create the container objects for the consolidated geometries (only 2 objects)
  activeLines = new THREE.LineSegments(
    new THREE.BufferGeometry(), // Start with an empty geometry
    activeMaterial
  );
  inactiveLines = new THREE.LineSegments(
    new THREE.BufferGeometry(), // Start with an empty geometry
    inactiveMaterial
  );

  scene.add(activeLines, inactiveLines);
}

// --- NEW HELPER FUNCTION FOR EFFICIENT GEOMETRY UPDATE ---

/**
 * Updates a THREE.LineSegments object's geometry attribute, resizing the buffer 
 * only when necessary to improve performance.
 */
function updateConsolidatedLines(
    lineObject: THREE.LineSegments, 
    vertices: number[]
) {
  const count = vertices.length / 3; // Number of vertices (position components / 3)
  
  // If there are no points, ensure the geometry is empty and return
  if (count === 0) {
    if (lineObject.geometry.attributes.position) {
      lineObject.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    }
    return;
  }

  let geometry = lineObject.geometry as THREE.BufferGeometry;
  let positionAttribute: THREE.BufferAttribute;

  if (geometry.attributes.position) {
    // Reuse existing geometry and attribute
    positionAttribute = geometry.attributes.position as THREE.BufferAttribute;
    
    // Check if the existing array is large enough
    if (positionAttribute.array.length >= vertices.length) {
      // 1. Copy new data into the existing array (CPU operation)
      (positionAttribute.array as Float32Array).set(vertices, 0);
      positionAttribute.count = count;
      // 2. Mark the attribute for upload to the GPU
      positionAttribute.needsUpdate = true;
    } else {
      // Array is too small, create a new larger buffer
      positionAttribute = new THREE.BufferAttribute(new Float32Array(vertices), 3);
      geometry.setAttribute('position', positionAttribute);
    }
  } else {
    // First time update, create new attribute
    positionAttribute = new THREE.BufferAttribute(new Float32Array(vertices), 3);
    geometry.setAttribute('position', positionAttribute);
  }
}

// --- OPTIMIZED REDRAW FUNCTION ---

export function redrawWebGPULinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !camera) {
    throw new Error("WebGPU renderer not initialized. Call initCanvasWebGPUThreeJS first.");
  }

  const dpr = window.devicePixelRatio || 1;
  const activeVertices: number[] = [];
  const inactiveVertices: number[] = [];
  
  for (let i = 0; i < dataset.length; i++) {
    const d = dataset[i];
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    
    // Determine which buffer array to push vertices to
    const verticesArray = active ? activeVertices : inactiveVertices;

    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    // Convert the polyline (v0, v1, v2, ...) into line segments (v0-v1, v1-v2, v2-v3, ...)
    for (let j = 0; j < pts.length - 1; j++) {
      // Start point of segment (x, y, z)
      verticesArray.push(pts[j][0], pts[j][1], 0);
      // End point of segment (x, y, z)
      verticesArray.push(pts[j + 1][0], pts[j + 1][1], 0);
    }
  }

  // This step replaces the N individual line updates with just two buffer updates.
  updateConsolidatedLines(activeLines, activeVertices);
  updateConsolidatedLines(inactiveLines, inactiveVertices);

  // 3. RENDER (Only 2 GPU Draw Calls)
  renderer.render(scene, camera);
}