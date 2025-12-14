import * as THREE from "three/webgpu";
import { Line2 } from "three/examples/jsm/lines/webgpu/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { getLineNameCanvas } from "./brush";
import { canvasEl, lineState } from "./globals";
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

let hoveredLine: Line2 | null = null;
let hoveredLineOriginalMaterial: THREE.Line2NodeMaterial | null = null;
let isMouseOverCanvas = false;
let isInitialized = false;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const HOVER_THRESHOLD = 5;

let currentParcoords: any = null;

export function disposeWebGPUThreeJS() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  plotArea.removeEventListener("mousemove", onMouseMove);
  plotArea.removeEventListener("mouseenter", onMouseEnter!);
  plotArea.removeEventListener("mouseleave", onMouseLeave!);

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
  lineMaterial = null;
  inactiveLineMaterial = null;
  hoverLineMaterial = null;

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }

  if (scene) {
    scene.clear();
    scene = null;
  }

  camera = null;
  hoveredLine = null;
  hoveredLineOriginalMaterial = null;
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

  raycaster.params.Line2 = { threshold: HOVER_THRESHOLD };

  createLabelsContainer();

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("mousemove", onMouseMove);
  plotArea.addEventListener("mouseenter", onMouseEnter);
  plotArea.addEventListener("mouseleave", onMouseLeave);

  isInitialized = true;

  return renderer;
}

function onMouseMove(event: MouseEvent) {
  if (!renderer || !scene || !camera || !isInitialized) return;

  const rect = canvasEl.getBoundingClientRect();

  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  checkHover();
}

function onMouseEnter() {
  isMouseOverCanvas = true;
}

function onMouseLeave() {
  isMouseOverCanvas = false;
  clearHover();
  clearDataPointLabels();
  if (renderer && scene && camera && isInitialized) {
    renderer.render(scene, camera);
  }
}

function checkHover() {
  if (!isMouseOverCanvas || !scene || !camera) return;

  raycaster.setFromCamera(mouse, camera);

  const lineArray = Array.from(lineObjects.values());
  const intersects = raycaster.intersectObjects(lineArray, false);

  if (intersects.length > 0) {
    const closestLine = intersects[0].object as Line2;

    if (hoveredLine !== closestLine) {
      clearHover();

      hoveredLine = closestLine;
      hoveredLineOriginalMaterial =
        closestLine.material as THREE.Line2NodeMaterial;
      closestLine.material = hoverLineMaterial!;
      closestLine.renderOrder = 1;

      const data = lineDataMap.get(closestLine);
      if (data) {
        onLineHover(true);
        showDataPointLabels(currentParcoords, data);
      }
    }
  } else {
    if (hoveredLine) {
      const data = lineDataMap.get(hoveredLine);
      clearHover();
      clearDataPointLabels();
      if (data) {
        onLineHover(false);
      }
    }
  }

  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function clearHover() {
  if (hoveredLine && hoveredLineOriginalMaterial) {
    hoveredLine.material = hoveredLineOriginalMaterial;
    hoveredLine.renderOrder = 0;
    hoveredLine = null;
    hoveredLineOriginalMaterial = null;
  }
}

function onLineHover(isHovered: boolean) {
  if (isHovered) {
    canvasEl.style.cursor = "pointer";
  } else {
    canvasEl.style.cursor = "default";
  }
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

export function redrawWebGPULinesThreeJS(dataset: any[], parcoords: any) {
  if (!renderer || !scene || !isInitialized) {
    console.warn("WebGPU-Three not initialized, skipping redraw");
    return;
  }

  currentParcoords = parcoords;

  const usedIds = new Set<string>();

  dataset.forEach((d, index) => {
    const id = getLineNameCanvas(d);
    usedIds.add(id);

    const active = lineState[id]?.active ?? true;
    const pts = getPolylinePoints(d, parcoords);

    let line = lineObjects.get(id);

    if (!line) {
      const geometry = new LineGeometry();
      geometry.setPositions(pts);

      line = new Line2(
        geometry,
        active ? lineMaterial! : inactiveLineMaterial!
      );
      line.computeLineDistances();

      lineObjects.set(id, line);
      lineDataMap.set(line, d);
      scene.add(line);
    } else {
      const geometry = line.geometry as LineGeometry;
      geometry.setPositions(pts);
      line.computeLineDistances();

      if (line !== hoveredLine) {
        line.material = active ? lineMaterial! : inactiveLineMaterial!;
      } else {
        hoveredLineOriginalMaterial = active
          ? lineMaterial!
          : inactiveLineMaterial!;
      }

      lineDataMap.set(line, d);
    }
  });

  for (const [id, line] of lineObjects) {
    if (!usedIds.has(id)) {
      if (line === hoveredLine) {
        clearHover();
        clearDataPointLabels();
      }
      scene.remove(line);
      line.geometry.dispose();
      lineDataMap.delete(line);
      lineObjects.delete(id);
    }
  }

  if (hoveredLine) {
    const data = lineDataMap.get(hoveredLine);
    if (data) {
      showDataPointLabels(currentParcoords, data);
    }
  }

  renderer.render(scene, camera!);
}
