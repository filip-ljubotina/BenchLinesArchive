import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { getLineNameCanvas } from "./brush";
import { canvasEl, drawState, lineState, parcoords } from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";

let scene: THREE.Scene;
let camera: THREE.OrthographicCamera;
let renderer: THREE.WebGLRenderer;
let lines: Line2; 
let lineMaterial: LineMaterial;
let lineGeometry: LineSegmentsGeometry;

// Hover and selection state
let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let currentParcoords: any = null;

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        hoveredLineIds.add(id);
      }
    });
    if (hoveredIds.length > 0) {
      const data = dataset.find((d) => getLineNameCanvas(d) === hoveredIds[0]);
      if (data) {
        showDataPointLabels(currentParcoords, data);
      }
    } else {
      clearDataPointLabels();
    }
  } else {
    selectedLineIds.clear();
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        selectedLineIds.add(id);
      }
    });
  }
  redrawWebGLLinesThreeJS(dataset, currentParcoords);
}

function onCanvasClick(event: MouseEvent) {
  if (event.shiftKey) {
    // Shift + click: add hovered lines to selected
    if (hoveredLineIds.size > 0) {
      hoveredLineIds.forEach((id) => selectedLineIds.add(id));
    }
  } else if (drawState.wasDrawing === false) {
    // Regular click: clear selected
    selectedLineIds.clear();
  } else {
    drawState.wasDrawing = false;
  }
  redrawWebGLLinesThreeJS(dataset, currentParcoords);
}

function setupCanvasClickHandling() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("click", onCanvasClick);
}

export async function initCanvasWebGLThreeJS(dataset: any[], parcoords: any) {
  const width = canvasEl.clientWidth;
  const height = canvasEl.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  lineGeometry = new LineSegmentsGeometry();
  lineMaterial = new LineMaterial({
    color: 0x80bfd6,
    linewidth: 2,
    vertexColors: true,
  });
  lineMaterial.resolution.set(width, height);

  lines = new Line2(lineGeometry, lineMaterial);
  scene.add(lines);

  // Initialize hover detection and click handling
  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();
  createLabelsContainer();
  currentParcoords = parcoords;

  return renderer;
}

export function redrawWebGLLinesThreeJS(newDataset: any[], parcoords: any) {
  if (!renderer || !scene || !lines) return;

  // Store dataset for hover use
  dataset = newDataset;
  currentParcoords = parcoords;

  const height = canvasEl.clientHeight;

  let totalSegments = 0;
  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    if (!active) continue;
    const n = parcoords.newFeatures.length;
    if (n >= 2) totalSegments += n - 1;
  }

  const positions = new Float32Array(totalSegments * 2 * 3);
  const colors = new Float32Array(totalSegments * 2 * 3);

  let offset = 0;
  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    if (!active) continue; // skip inactive lines like webGL.ts
    const isHovered = hoveredLineIds.has(id);
    const isSelected = selectedLineIds.has(id);

    let color: [number, number, number];
    if (isSelected) {
      color = [1, 0.502, 0]; // Orange for selected
    } else if (isHovered) {
      color = [1, 0, 0]; // Red for hovered
    } else {
      color = [0.5, 0.75, 0.84]; // Blue for active
    }

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

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}

export function disposeWebGLThreeJS() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.removeEventListener("click", onCanvasClick);
  clearDataPointLabels();
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  currentParcoords = null;
}