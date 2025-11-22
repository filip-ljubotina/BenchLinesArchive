import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram;

// Persistent buffers
let vertexBuffer: WebGLBuffer | null = null;
let colorBuffer: WebGLBuffer | null = null;

// Shader attribute/uniform locations
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

// WebGL initialization
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
  gl.disable(gl.BLEND); // minor efficiency gain

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

// Convert dataset row to polyline points
function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

// Draw all lines
export function redrawWebGLLines(dataset: any[], parcoords: any) {
  if (!gl || !vertexBuffer || !colorBuffer) return;

  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, canvasEl.width, canvasEl.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const dpr = window.devicePixelRatio || 1;

  const vertices: number[] = [];
  const colors: number[] = [];

  for (const d of dataset) {
    const id = getLineName(d);
    const active = lineState[id]?.active ?? true;
    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    const color = active
      ? [128 / 255, 192 / 255, 215 / 255, 1]
      : [234 / 255, 234 / 255, 234 / 255, 1];

    // Convert polyline to line segments for LINES
    for (let i = 0; i < pts.length - 1; i++) {
      vertices.push(pts[i][0], pts[i][1]);
      vertices.push(pts[i + 1][0], pts[i + 1][1]);

      colors.push(...color);
      colors.push(...color);
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

  gl.drawArrays(gl.LINES, 0, vertexData.length / 2);
}