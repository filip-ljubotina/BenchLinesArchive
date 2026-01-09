import * as THREE from "three/webgpu";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { getLineNameCanvas } from "./brush";
import { canvasEl, drawState, lineState, parcoords } from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";

let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let renderer: THREE.WebGPURenderer | null = null;
let lineObjects: Map<string, Line2> = new Map();
let lineDataMap: Map<Line2, any> = new Map();
let lineMaterial: THREE.Line2NodeMaterial | null = null;
let inactiveLineMaterial: THREE.Line2NodeMaterial | null = null;
let hoverLineMaterial: THREE.Line2NodeMaterial | null = null;
let selectedLineMaterial: THREE.Line2NodeMaterial | null = null;
let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let isInitialized = false;
let currentParcoords: any = null;

export function disposeWebGPUThreeJS() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.removeEventListener("click", onCanvasClick);
  clearDataPointLabels();
  for (const [_, line] of lineObjects) {
    if (scene) scene.remove(line);
    line.geometry.dispose();
  }
  lineObjects.clear();
  lineDataMap.clear();
  lineMaterial?.dispose();
  inactiveLineMaterial?.dispose();
  hoverLineMaterial?.dispose();
  selectedLineMaterial?.dispose();
  lineMaterial = null;
  inactiveLineMaterial = null;
  hoverLineMaterial = null;
  selectedLineMaterial = null;
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  if (scene) {
    scene.clear();
    scene = null;
  }
  camera = null;
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  currentParcoords = null;
  isInitialized = false;
}

export async function initCanvasWebGPUThreeJS() {
  disposeWebGPUThreeJS();
  const width = canvasEl.clientWidth;
  const height = canvasEl.clientHeight;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, width, height, 0, -1, 1);
  try {
    renderer = new THREE.WebGPURenderer({
      canvas: canvasEl,
      alpha: true,
      antialias: true,
    });
    await renderer.init();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
  } catch (error) {
    console.error("Failed to initialize WebGPU renderer:", error);
    throw error;
  }
  lineMaterial = new THREE.Line2NodeMaterial({
    color: 0x80bfd6,
    linewidth: 3,
    worldUnits: false,
    alphaToCoverage: true,
  });
  inactiveLineMaterial = new THREE.Line2NodeMaterial({
    color: 0xebebeb,
    linewidth: 2,
    worldUnits: false,
    alphaToCoverage: true,
  });
  hoverLineMaterial = new THREE.Line2NodeMaterial({
    color: 0xff3333,
    linewidth: 4,
    worldUnits: false,
    alphaToCoverage: true,
  });
  selectedLineMaterial = new THREE.Line2NodeMaterial({
    color: 0xff8000,
    linewidth: 4,
    worldUnits: false,
    alphaToCoverage: true,
  });
  createLabelsContainer();
  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();
  isInitialized = true;
  return renderer;
}

function updateLineMaterials() {
  for (const [id, line] of lineObjects) {
    const isHovered = hoveredLineIds.has(id);
    const isSelected = selectedLineIds.has(id);
    const active = lineState[id]?.active ?? true;
    let material: THREE.Line2NodeMaterial;
    let renderOrder = 0;
    if (isSelected) {
      material = selectedLineMaterial!;
      renderOrder = 2;
    } else if (isHovered) {
      material = hoverLineMaterial!;
      renderOrder = 1;
    } else {
      material = active ? lineMaterial! : inactiveLineMaterial!;
    }
    line.material = material;
    line.renderOrder = renderOrder;
  }
}

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    hoveredIds.forEach((id) => hoveredLineIds.add(id));
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
    hoveredIds.forEach((id) => selectedLineIds.add(id));
  }
  updateLineMaterials();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
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
  updateLineMaterials();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function setupCanvasClickHandling() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("click", onCanvasClick);
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

export function redrawWebGPULinesThreeJS(newDataset: any[], parcoords: any) {
  if (!renderer || !scene || !isInitialized) {
    console.warn("WebGPU-Three not initialized, skipping redraw");
    return;
  }
  dataset = newDataset;
  currentParcoords = parcoords;
  const usedIds = new Set<string>();
  dataset.forEach((d, index) => {
    const id = getLineNameCanvas(d);
    usedIds.add(id);
    const pts = getPolylinePoints(d, parcoords);
    let line = lineObjects.get(id);
    if (!line) {
      const geometry = new LineGeometry();
      geometry.setPositions(pts);
      line = new Line2(geometry, lineMaterial!); // Initial material, will be updated below
      line.computeLineDistances();
      lineObjects.set(id, line);
      lineDataMap.set(line, d);
      scene.add(line);
    } else {
      const geometry = line.geometry as LineGeometry;
      geometry.setPositions(pts);
      line.computeLineDistances();
      lineDataMap.set(line, d);
    }
  });
  for (const [id, line] of lineObjects) {
    if (!usedIds.has(id)) {
      scene.remove(line);
      line.geometry.dispose();
      lineDataMap.delete(line);
      lineObjects.delete(id);
    }
  }
  updateLineMaterials();
  renderer.render(scene, camera!);
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}
