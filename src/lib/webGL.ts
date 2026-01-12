import { getLineNameCanvas } from "./brush";
import { canvasEl, drawState, lineState, parcoords, selected } from "./globals";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";
import {
  initLineTextureWebGL,
  drawInactiveLinesTexture,
  rasterizeInactiveLinesToCanvas,
} from "./lineTexture";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram;

// Overlay canvas and context
let overlayCanvasEl: HTMLCanvasElement;
let overlayGl: WebGLRenderingContext | null = null;
let overlayProgram: WebGLProgram;

// Background canvas
let inactiveLinesCanvas: HTMLCanvasElement;
let bgGlCanvas: HTMLCanvasElement | null = null; // persistent canvas (offscreen) to render the inactive lines to before saving as a texture and putting it on the inactiveLinesCanvas

// Persistent buffers
let vertexBuffer: WebGLBuffer | null = null;
let colorBuffer: WebGLBuffer | null = null;
let overlayVertexBuffer: WebGLBuffer | null = null;
let overlayColorBuffer: WebGLBuffer | null = null;

// Shader attribute/uniform locations
let posLoc: number;
let colorLoc: number;
let resolutionLoc: WebGLUniformLocation;
let overlayPosLoc: number;
let overlayColorLoc: number;
let overlayResolutionLoc: WebGLUniformLocation;

// Hover and selection state
let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let currentParcoords: any = null;

// Vertex and fragment shaders
const vertexShaderSrc = `
attribute vec2 position;
attribute vec4 a_color;
uniform vec2 resolution;
varying vec4 v_color;

void main() {
    vec2 zeroToOne = position / resolution;
    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_color = a_color;
}
`;

const fragmentShaderSrc = `
precision mediump float;
varying vec4 v_color;
void main() {
    gl_FragColor = v_color;
}
`;

// Shader helpers
function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    throw new Error("Shader compile failed");
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  vShader: WebGLShader,
  fShader: WebGLShader
) {
  const program = gl.createProgram();
  if (!program) throw new Error("createProgram failed");
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error("Program link failed");
  }
  return program;
}

function createOverlayCanvas(): HTMLCanvasElement {
  const overlay = document.createElement("canvas");
  overlay.width = canvasEl.width;
  overlay.height = canvasEl.height;
  overlay.style.width = canvasEl.style.width;
  overlay.style.height = canvasEl.style.height;
  overlay.style.position = "absolute";
  overlay.style.top = canvasEl.style.top;
  overlay.style.left = canvasEl.style.left;

  canvasEl.parentNode?.insertBefore(overlay, canvasEl.nextSibling);

  return overlay;
}

function initOverlayWebGL() {
  overlayGl = overlayCanvasEl.getContext("webgl");
  if (!overlayGl) throw new Error("WebGL not supported on overlay canvas");

  const vShader = createShader(
    overlayGl,
    overlayGl.VERTEX_SHADER,
    vertexShaderSrc
  );
  const fShader = createShader(
    overlayGl,
    overlayGl.FRAGMENT_SHADER,
    fragmentShaderSrc
  );
  overlayProgram = createProgram(overlayGl, vShader, fShader);

  overlayGl.viewport(0, 0, overlayCanvasEl.width, overlayCanvasEl.height);
  overlayGl.enable(overlayGl.BLEND);
  overlayGl.blendFunc(overlayGl.SRC_ALPHA, overlayGl.ONE_MINUS_SRC_ALPHA);

  // Persistent buffers for overlay
  overlayVertexBuffer = overlayGl.createBuffer();
  overlayColorBuffer = overlayGl.createBuffer();
  if (!overlayVertexBuffer || !overlayColorBuffer)
    throw new Error("Failed to create overlay buffers");

  // Cache locations
  overlayPosLoc = overlayGl.getAttribLocation(overlayProgram, "position");
  overlayColorLoc = overlayGl.getAttribLocation(overlayProgram, "a_color");
  overlayResolutionLoc = overlayGl.getUniformLocation(
    overlayProgram,
    "resolution"
  )!;

  // Enable attributes
  overlayGl.enableVertexAttribArray(overlayPosLoc);
  overlayGl.enableVertexAttribArray(overlayColorLoc);
}

function onHoveredLinesChange(
  hoveredIds: string[],
  selectionMode: SelectionMode
) {
  if (selectionMode === "hover") {
    hoveredLineIds.clear();
    // hoveredIds.forEach((id) => hoveredLineIds.add(id));
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
    // hoveredIds.forEach((id) => selectedLineIds.add(id));
    hoveredIds.forEach((id) => {
      if (!lineState[id] || lineState[id].active) {
        selectedLineIds.add(id);
      }
    });
  }
  redrawHoverOverlay();
}
function setupCanvasClickHandling() {
  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("click", (e) => {
    if (e.shiftKey) {
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
    redrawHoverOverlay();
  });
}

// WebGL initialization
export async function initCanvasWebGL(dataset: any[], parcoords: any) {
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = canvasEl.clientWidth * dpr;
  canvasEl.height = canvasEl.clientHeight * dpr;

  gl = canvasEl.getContext("webgl");
  if (!gl) throw new Error("WebGL not supported");

  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  program = createProgram(gl, vShader, fShader);

  gl.viewport(0, 0, canvasEl.width, canvasEl.height);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Persistent buffers
  vertexBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  if (!vertexBuffer || !colorBuffer)
    throw new Error("Failed to create buffers");

  // Cache locations
  posLoc = gl.getAttribLocation(program, "position");
  colorLoc = gl.getAttribLocation(program, "a_color");
  resolutionLoc = gl.getUniformLocation(program, "resolution")!;

  // Enable attributes
  gl.enableVertexAttribArray(posLoc);
  gl.enableVertexAttribArray(colorLoc);

  // Create and initialize overlay canvas
  overlayCanvasEl = createOverlayCanvas();
  initOverlayWebGL();

  // create and intiialize the background texture
  // inactiveLinesCanvas = document.createElement("canvas");
  // inactiveLinesCanvas.width = canvasEl.width;
  // inactiveLinesCanvas.height = canvasEl.height;

  // canvasEl.parentNode?.insertBefore(inactiveLinesCanvas, canvasEl);

  // // draw inactive lines into it
  // initLineTextureWebGL(inactiveLinesCanvas);
  // redrawWebGLBackgroundLines(dataset, parcoords);

  //create background lines image
  inactiveLinesCanvas = document.createElement("canvas");
  inactiveLinesCanvas.width = canvasEl.width;
  inactiveLinesCanvas.height = canvasEl.height;
  inactiveLinesCanvas.style.position = "absolute";
  inactiveLinesCanvas.style.top = canvasEl.style.top;
  inactiveLinesCanvas.style.left = canvasEl.style.left;
  inactiveLinesCanvas.style.pointerEvents = "none";
  inactiveLinesCanvas.style.width = canvasEl.style.width;
  inactiveLinesCanvas.style.height = canvasEl.style.height;

  // Insert behind the main canvas
  canvasEl.parentNode?.insertBefore(inactiveLinesCanvas, canvasEl);

  // initLineTextureWebGL(bgGlCanvas);
  // drawInactiveLinesTexture(dataset, parcoords);
  redrawWebGLBackgroundLines(dataset, parcoords);

  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();

  createLabelsContainer();
  currentParcoords = parcoords;

  return gl;
}

export function redrawWebGLBackgroundLines(dataset: any[], parcoords: any) {
  if (!inactiveLinesCanvas) {
    console.warn("Inactive background canvas not initialized");
    return;
  }

  const w = inactiveLinesCanvas.width;
  const h = inactiveLinesCanvas.height;

  // Create the offscreen WebGL canvas once
  if (!bgGlCanvas) {
    bgGlCanvas = document.createElement("canvas");
    bgGlCanvas.width = w;
    bgGlCanvas.height = h;
  }

  // Initialize WebGL and draw the inactive lines
  initLineTextureWebGL(bgGlCanvas);
  drawInactiveLinesTexture(dataset, parcoords);

  // Rasterize result into the 2D background canvas
  rasterizeInactiveLinesToCanvas(inactiveLinesCanvas);
}

// Convert dataset row to polyline points
function getPolylinePoints(
  d: any,
  parcoords: any,
  dpr: number
): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

// Draw hovered and selected lines on overlay
function redrawHoverOverlay() {
  if (!overlayGl || !overlayVertexBuffer || !overlayColorBuffer) return;

  overlayGl.useProgram(overlayProgram);
  overlayGl.uniform2f(
    overlayResolutionLoc,
    overlayCanvasEl.width,
    overlayCanvasEl.height
  );
  overlayGl.clearColor(0, 0, 0, 0);
  overlayGl.clear(overlayGl.COLOR_BUFFER_BIT);

  const dpr = window.devicePixelRatio || 1;

  const vertices: number[] = [];
  const colors: number[] = [];

  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    const isHovered = hoveredLineIds.has(id);
    const isSelected = selectedLineIds.has(id);

    if (!isHovered && !isSelected) continue;

    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    // Red for hovered, yellow for selected
    const color = isSelected ? [1, 0.502, 0, 0.98] : [1, 0, 0, 0.8];

    // Convert polyline to line segments for LINES
    for (let i = 0; i < pts.length - 1; i++) {
      vertices.push(pts[i][0], pts[i][1]);
      vertices.push(pts[i + 1][0], pts[i + 1][1]);

      colors.push(...color);
      colors.push(...color);
    }
  }

  if (vertices.length === 0) {
    return;
  }

  const vertexData = new Float32Array(vertices);
  const colorData = new Float32Array(colors);

  overlayGl.bindBuffer(overlayGl.ARRAY_BUFFER, overlayVertexBuffer);
  overlayGl.bufferData(
    overlayGl.ARRAY_BUFFER,
    vertexData,
    overlayGl.DYNAMIC_DRAW
  );
  overlayGl.vertexAttribPointer(overlayPosLoc, 2, overlayGl.FLOAT, false, 0, 0);

  overlayGl.bindBuffer(overlayGl.ARRAY_BUFFER, overlayColorBuffer);
  overlayGl.bufferData(
    overlayGl.ARRAY_BUFFER,
    colorData,
    overlayGl.DYNAMIC_DRAW
  );
  overlayGl.vertexAttribPointer(
    overlayColorLoc,
    4,
    overlayGl.FLOAT,
    false,
    0,
    0
  );

  overlayGl.lineWidth(4);
  overlayGl.drawArrays(overlayGl.LINES, 0, vertexData.length / 2);
}

// Draw all lines
export function redrawWebGLLines(newDataset: any[], parcoords: any) {
  if (!gl || !vertexBuffer || !colorBuffer) return;

  // Store dataset for overlay use
  dataset = newDataset;

  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, canvasEl.width, canvasEl.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT); // clears active lines canvas

  const dpr = window.devicePixelRatio || 1;

  const vertices: number[] = [];
  const colors: number[] = [];

  for (const d of newDataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    if (!active) continue; // skip inactive lines
    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    const color = active
      ? [128 / 255, 191 / 255, 214 / 255, 1]
      : [235 / 255, 235 / 255, 235 / 255, 1];

    // Convert polyline to line segments for LINES
    for (let i = 0; i < pts.length - 1; i++) {
      vertices.push(pts[i][0], pts[i][1]);
      vertices.push(pts[i + 1][0], pts[i + 1][1]);

      colors.push(...color, ...color);
    }
  }

  const vertexData = new Float32Array(vertices);
  const colorData = new Float32Array(colors);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

  gl.lineWidth(3);
  gl.drawArrays(gl.LINES, 0, vertexData.length / 2);

  // Redraw the hover overlay with current hovered lines
  redrawHoverOverlay();
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}

export function disposeWebGL() {
  clearDataPointLabels();
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  currentParcoords = null;
}
