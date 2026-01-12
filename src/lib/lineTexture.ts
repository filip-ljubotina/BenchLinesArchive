import { canvasEl, lineState, parcoords } from "./globals";
import { getLineNameCanvas } from "./brush";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram;
let vertexBuffer: WebGLBuffer | null = null;
let colorBuffer: WebGLBuffer | null = null;
let resolutionLoc: WebGLUniformLocation;

// Shader source
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

// Initialize WebGL for the texture rendering
// export function initLineTextureWebGL(canvas: HTMLCanvasElement) {
//   gl = canvas.getContext("webgl");
//   if (!gl) throw new Error("WebGL not supported");

//   const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
//   const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
//   program = createProgram(gl, vShader, fShader);

//   gl.viewport(0, 0, canvas.width, canvas.height);
//   gl.clearColor(0, 0, 0, 0);
//   gl.clear(gl.COLOR_BUFFER_BIT);

//   vertexBuffer = gl.createBuffer();
//   colorBuffer = gl.createBuffer();
//   if (!vertexBuffer || !colorBuffer) throw new Error("Failed to create buffers");

//   resolutionLoc = gl.getUniformLocation(program, "resolution")!;
// }

export function initLineTextureWebGL(canvas: HTMLCanvasElement) {
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL not supported");

  const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  program = createProgram(gl, vShader, fShader);

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  vertexBuffer = gl.createBuffer();
  colorBuffer = gl.createBuffer();
  if (!vertexBuffer || !colorBuffer) {
    throw new Error("Failed to create buffers");
  }

  resolutionLoc = gl.getUniformLocation(program, "resolution")!;
}

export function rasterizeInactiveLinesToCanvas(targetCanvas: HTMLCanvasElement) {
  if (!gl) return;

  const sourceCanvas = gl.canvas as HTMLCanvasElement;
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;

  const pixels = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

  const ctx = targetCanvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.createImageData(w, h);

  // Flip Y (WebGL bottom-left → Canvas top-left)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const src = ((h - y - 1) * w + x) * 4;
      const dst = (y * w + x) * 4;

      imageData.data[dst]     = pixels[src];
      imageData.data[dst + 1] = pixels[src + 1];
      imageData.data[dst + 2] = pixels[src + 2];
      imageData.data[dst + 3] = pixels[src + 3];
    }
  }

  ctx.putImageData(imageData, 0, 0);
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

// Render inactive lines to the texture
export function drawInactiveLinesTexture(dataset: any[], parcoords: any) {
  if (!gl || !vertexBuffer || !colorBuffer) return;

  gl.useProgram(program);
  gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const dpr = window.devicePixelRatio || 1;
  const vertices: number[] = [];
  const colors: number[] = [];

  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    if (lineState[id]?.active) continue; // skip active lines

    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    const color = [235 / 255, 235 / 255, 235 / 255, 1]; // gray for inactive

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
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
  gl.vertexAttribPointer(gl.getAttribLocation(program, "position"), 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(gl.getAttribLocation(program, "position"));

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colorData, gl.STATIC_DRAW);
  gl.vertexAttribPointer(gl.getAttribLocation(program, "a_color"), 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(gl.getAttribLocation(program, "a_color"));

  gl.lineWidth(2);
  gl.drawArrays(gl.LINES, 0, vertexData.length / 2);
}
