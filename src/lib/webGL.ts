// webglCanvas.ts
import { canvasEl } from "./globals";

let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram;

// Determines the position of the pixel
// vec2 position is the vertex position (xy)
// vec2 resolution is the canvas width/height
// zeroToOne normalizes the points, then converts to webgl -1 to 1
// then flips the Y axis because Canvas2D is top left 0,0 and webgl is bottom left 0,0
const vertexShaderSrc = `
attribute vec2 position;
uniform vec2 resolution;

void main() {
  vec2 zeroToOne = position / resolution;
  vec2 clipSpace = zeroToOne * 2.0 - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1); // flip Y
}
`;

// Determines the color of that pixel
// precision mediump float is the precision level for the float
const fragmentShaderSrc = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

// Compiles shaders on gpu and throws errors if failure
function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    throw new Error("Shader compile failed");
  }
  return shader;
}

// combines vertex and fragment shaders and links them to the program and checks for errors
// the program is just the program that runs on the gpu to render
function createProgram(gl: WebGLRenderingContext, vShader: WebGLShader, fShader: WebGLShader) {
  const program = gl.createProgram()!;
  gl.attachShader(program, vShader);
  gl.attachShader(program, fShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error("Program link failed");
  }
  return program;
}

// Initialize WebGL
// dpr gets the device pixel ratio for high density screens (like my laptop)
// canvas size is the canvas width and height * the pixel density (otherwise things will appear too small on high density screens)
// create the vertex and fragment shader and put them in the program (which will run on the gpu)
// 
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
  gl.clear(gl.COLOR_BUFFER_BIT);

  return gl;
}

// converts rows to x,y coordinates in canvas space
function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

// Draw one polyline
function drawPolyline(pts: [number, number][]) {
  if (!gl || !program || !pts.length) return;

  //flatten points and put in Float32Array which WebGL needs
  const vertices = new Float32Array(pts.flat());
  const buffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  //run program on GPU
  gl.useProgram(program);

  //get positions and map them to the canvas
  const posLoc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const resolutionLoc = gl.getUniformLocation(program, "resolution");
  gl.uniform2f(resolutionLoc, canvasEl.width, canvasEl.height);

  //set color
  const colorLoc = gl.getUniformLocation(program, "u_color");
  // gl.uniform4f(colorLoc, 0, 129 / 255, 175 / 255, 0.5); // copied color from Filip but with the thinner lines it looks worse
  gl.uniform4f(colorLoc, 0, 0.3, 0.6, 1.0);   //darker because of thinner lines

  //draw lines between all the points
  gl.drawArrays(gl.LINE_STRIP, 0, pts.length);

  // clear buffer
  gl.deleteBuffer(buffer);
}

// Redraw all the lines
export function redrawWebGLLines(dataset: any[], parcoords: any) {
  if (!gl) return;

  gl.clear(gl.COLOR_BUFFER_BIT);

  const dpr = window.devicePixelRatio || 1;

  for (const d of dataset) {
    const pts = getPolylinePoints(d, parcoords, dpr);
    drawPolyline(pts);
  }
}
