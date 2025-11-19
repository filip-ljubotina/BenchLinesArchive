// optimizedWebGLCanvasFast.ts
import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram;

// Persistent buffers
let vertexBuffer: WebGLBuffer | null = null;
let colorBuffer: WebGLBuffer | null = null;
let maxVertices = 1024 * 1024; // 1M floats ~ enough for large datasets
let vertexCount = 0;

// Cached attribute locations
let posLoc: number;
let colorLoc: number;
let resolutionLoc: WebGLUniformLocation;

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

// --- Helpers to create shaders/program ---
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

function createProgram(gl: WebGLRenderingContext, vShader: WebGLShader, fShader: WebGLShader) {
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

// --- Initialize WebGL ---
export function initCanvasWebGL() {
  const dpr = window.devicePixelRatio || 1;
  canvasEl.width = canvasEl.clientWidth * dpr;
  canvasEl.height = canvasEl.clientHeight * dpr;

  gl = canvasEl.getContext("webgl");
  if (!gl) throw new Error("WebGL not supported");

  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  program = createProgram(gl, vShader, fShader);

  gl.viewport(0, 0, canvasEl.width, canvasEl.height);
  // gl.clearColor(1, 1, 1, 1); // white background
  // gl.clear(gl.COLOR_BUFFER_BIT);

  gl.disable(gl.BLEND);

  // Persistent buffers
  vertexBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  if (!vertexBuffer || !colorBuffer) throw new Error("Failed to create buffers");

  // Cache locations
  posLoc = gl.getAttribLocation(program, "position");
  colorLoc = gl.getAttribLocation(program, "a_color");
  resolutionLoc = gl.getUniformLocation(program, "resolution")!;

  // Enable attributes
  gl.enableVertexAttribArray(posLoc);
  gl.enableVertexAttribArray(colorLoc);

  return gl;
}

// --- Convert row data to XY points ---
function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

// --- Prepare single static buffer per frame ---
function prepareBuffers(dataset: any[], parcoords: any, dpr: number) {
  const vertices: number[] = [];
  const colors: number[] = [];

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    const color = active
      ? [128/255, 192/255, 215/255, 1] // dark blue
      : [234/255, 234/255, 234/255, 1]; // gray

    for (const p of pts) {
      vertices.push(p[0], p[1]);
      colors.push(...color);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    colors: new Float32Array(colors),
    count: vertices.length / 2
  };
}

// --- Draw function ---
export function redrawWebGLLines(dataset: any[], parcoords: any) {
  if (!gl || !vertexBuffer || !colorBuffer) return;

  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, canvasEl.width, canvasEl.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const dpr = window.devicePixelRatio || 1;
  const { vertices, colors, count } = prepareBuffers(dataset, parcoords, dpr);
  vertexCount = count;

  // Upload vertex positions
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  // Upload vertex colors
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);

  // Single draw call for all lines
  gl.drawArrays(gl.LINE_STRIP, 0, vertexCount);
}
