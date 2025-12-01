import { getLineName } from "./brush";
import { canvasEl, lineState } from "./globals";

let gl: WebGL2RenderingContext | null = null;
let program: WebGLProgram;
let vao: WebGLVertexArrayObject | null = null;
let vertexBuffer: WebGLBuffer | null = null;
let indexBuffer: WebGLBuffer | null = null;

let vertexData: Float32Array | null = null;
let indexData: Uint32Array | null = null;
let vertexCapacity = 0;
let indexCapacity = 0;

let resolutionLoc: WebGLUniformLocation | null = null;
let thicknessLoc: WebGLUniformLocation | null = null;
let antialiasLoc: WebGLUniformLocation | null = null;

let dpr = 1;
let width = 0;
let height = 0;

const LINE_THICKNESS = 2.0;
const ANTIALIAS_WIDTH = 1.5;

const FLOATS_PER_VERTEX = 12;
const STRIDE = FLOATS_PER_VERTEX * 4;

const ACTIVE_R = 128 / 255;
const ACTIVE_G = 192 / 255;
const ACTIVE_B = 215 / 255;
const ACTIVE_A = 0.8;
const INACTIVE_R = 234 / 255;
const INACTIVE_G = 234 / 255;
const INACTIVE_B = 234 / 255;
const INACTIVE_A = 0.5;

const VERTEX_SHADER = `#version 300 es
precision highp float;

layout(location = 0) in vec2 position;
layout(location = 1) in vec2 prevPosition;
layout(location = 2) in vec2 nextPosition;
layout(location = 3) in vec4 color;
layout(location = 4) in float side;
layout(location = 5) in float miterSign;

uniform vec2 resolution;
uniform float thickness;
uniform float antialias;

out vec4 vColor;
out float vEdgeDist;

void main() {
    vec2 aspectVec = vec2(1.0, resolution.x / resolution.y);
    
    vec2 pos = position / resolution;
    vec2 prev = prevPosition / resolution;
    vec2 next = nextPosition / resolution;
    
    vec2 dirToPrev = normalize((pos - prev) * aspectVec);
    vec2 dirToNext = normalize((next - pos) * aspectVec);
    
    bool isStart = miterSign > 0.5;
    bool isEnd = miterSign < -0.5;
    
    vec2 normal;
    float miterLen = 1.0;
    
    if (isStart) {
        vec2 dir = dirToNext;
        normal = vec2(-dir.y, dir.x);
    } else if (isEnd) {
        vec2 dir = dirToPrev;
        normal = vec2(-dir.y, dir.x);
    } else {
        vec2 tangent = normalize(dirToPrev + dirToNext);
        normal = vec2(-tangent.y, tangent.x);
        float cosAngle = dot(normal, vec2(-dirToNext.y, dirToNext.x));
        miterLen = 1.0 / max(cosAngle, 0.5);
    }
    
    float totalThickness = thickness + antialias;
    vec2 offset = normal * (totalThickness / resolution) * side * miterLen;
    offset /= aspectVec;
    
    vec2 finalPos = pos + offset;
    gl_Position = vec4(finalPos * 2.0 - 1.0, 0.0, 1.0);
    gl_Position.y *= -1.0;
    
    vColor = color;
    vEdgeDist = side * totalThickness;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

in vec4 vColor;
in float vEdgeDist;

uniform float thickness;
uniform float antialias;

out vec4 fragColor;

void main() {
    float dist = abs(vEdgeDist);
    float halfThickness = thickness * 0.5;
    float alpha = 1.0 - smoothstep(halfThickness - antialias * 0.5, halfThickness + antialias * 0.5, dist);
    fragColor = vec4(vColor.rgb, vColor.a * alpha);
}`;

function compileShader(type: number, source: string): WebGLShader {
  const shader = gl!.createShader(type)!;
  gl!.shaderSource(shader, source);
  gl!.compileShader(shader);
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    throw new Error(gl!.getShaderInfoLog(shader) || "Shader error");
  }
  return shader;
}

function ensureCapacity(numVertices: number, numIndices: number): void {
  const requiredVertexFloats = numVertices * FLOATS_PER_VERTEX;
  if (requiredVertexFloats > vertexCapacity) {
    vertexCapacity =
      Math.max(requiredVertexFloats, vertexCapacity * 2) || 32768;
    vertexData = new Float32Array(vertexCapacity);
  }
  if (numIndices > indexCapacity) {
    indexCapacity = Math.max(numIndices, indexCapacity * 2) || 16384;
    indexData = new Uint32Array(indexCapacity);
  }
}

export function initCanvasWebGL2(): WebGL2RenderingContext {
  dpr = window.devicePixelRatio || 1;
  width = canvasEl.clientWidth * dpr;
  height = canvasEl.clientHeight * dpr;
  canvasEl.width = width;
  canvasEl.height = height;

  gl = canvasEl.getContext("webgl2", {
    antialias: false,
    alpha: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
    desynchronized: true,
  }) as WebGL2RenderingContext;

  if (!gl) throw new Error("WebGL2 not supported");

  const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER);
  const fs = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
  program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Link error");
  }

  gl.useProgram(program);

  resolutionLoc = gl.getUniformLocation(program, "resolution");
  thicknessLoc = gl.getUniformLocation(program, "thickness");
  antialiasLoc = gl.getUniformLocation(program, "antialias");

  gl.uniform2f(resolutionLoc, width, height);
  gl.uniform1f(thicknessLoc, LINE_THICKNESS * dpr);
  gl.uniform1f(antialiasLoc, ANTIALIAS_WIDTH * dpr);

  vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 8);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 2, gl.FLOAT, false, STRIDE, 16);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 4, gl.FLOAT, false, STRIDE, 24);
  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 1, gl.FLOAT, false, STRIDE, 40);
  gl.enableVertexAttribArray(5);
  gl.vertexAttribPointer(5, 1, gl.FLOAT, false, STRIDE, 44);

  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);

  return gl;
}

export function redrawWebGL2Lines(dataset: any[], parcoords: any): void {
  if (!gl || !dataset.length) return;

  // Handle resize
  const newDpr = window.devicePixelRatio || 1;
  const newWidth = canvasEl.clientWidth * newDpr;
  const newHeight = canvasEl.clientHeight * newDpr;

  if (newWidth !== width || newHeight !== height || newDpr !== dpr) {
    dpr = newDpr;
    width = newWidth;
    height = newHeight;
    canvasEl.width = width;
    canvasEl.height = height;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(resolutionLoc, width, height);
    gl.uniform1f(thicknessLoc, LINE_THICKNESS * dpr);
    gl.uniform1f(antialiasLoc, ANTIALIAS_WIDTH * dpr);
  }

  const features: string[] = parcoords.newFeatures;
  const numFeatures = features.length;
  if (numFeatures < 2) return;

  const dragging = parcoords.dragging;
  const xScales = parcoords.xScales;
  const yScales = parcoords.yScales;

  // Sort: inactive first, active last
  const inactive: any[] = [];
  const active: any[] = [];

  for (const d of dataset) {
    if (lineState[getLineName(d)]?.active ?? true) {
      active.push(d);
    } else {
      inactive.push(d);
    }
  }
  const sortedData = [...inactive, ...active];

  const numLines = sortedData.length;
  const numSegments = numFeatures - 1;
  const vertsPerLine = numFeatures * 2;
  const totalVerts = numLines * vertsPerLine;
  const totalIndices = numLines * numSegments * 6;

  ensureCapacity(totalVerts, totalIndices);

  const verts = vertexData!;
  const idxs = indexData!;

  // Cache x-coordinates
  const xCoords = new Float32Array(numFeatures);
  for (let i = 0; i < numFeatures; i++) {
    const f = features[i];
    xCoords[i] = (dragging[f] ?? xScales(f)) * dpr;
  }

  let vi = 0;
  let ii = 0;
  let baseVertex = 0;

  for (let li = 0; li < numLines; li++) {
    const d = sortedData[li];
    const isActive = lineState[getLineName(d)]?.active ?? true;

    const r = isActive ? ACTIVE_R : INACTIVE_R;
    const g = isActive ? ACTIVE_G : INACTIVE_G;
    const b = isActive ? ACTIVE_B : INACTIVE_B;
    const a = isActive ? ACTIVE_A : INACTIVE_A;

    // Cache y-coordinates
    const yCoords = new Float32Array(numFeatures);
    for (let i = 0; i < numFeatures; i++) {
      yCoords[i] = yScales[features[i]](d[features[i]]) * dpr;
    }

    // Create vertices
    for (let pi = 0; pi < numFeatures; pi++) {
      const x = xCoords[pi];
      const y = yCoords[pi];

      const prevX = pi > 0 ? xCoords[pi - 1] : x;
      const prevY = pi > 0 ? yCoords[pi - 1] : y;

      const nextX = pi < numFeatures - 1 ? xCoords[pi + 1] : x;
      const nextY = pi < numFeatures - 1 ? yCoords[pi + 1] : y;

      const miterSign = pi === 0 ? 1.0 : pi === numFeatures - 1 ? -1.0 : 0.0;

      // Top vertex
      verts[vi++] = x;
      verts[vi++] = y;
      verts[vi++] = prevX;
      verts[vi++] = prevY;
      verts[vi++] = nextX;
      verts[vi++] = nextY;
      verts[vi++] = r;
      verts[vi++] = g;
      verts[vi++] = b;
      verts[vi++] = a;
      verts[vi++] = 1.0;
      verts[vi++] = miterSign;

      // Bottom vertex
      verts[vi++] = x;
      verts[vi++] = y;
      verts[vi++] = prevX;
      verts[vi++] = prevY;
      verts[vi++] = nextX;
      verts[vi++] = nextY;
      verts[vi++] = r;
      verts[vi++] = g;
      verts[vi++] = b;
      verts[vi++] = a;
      verts[vi++] = -1.0;
      verts[vi++] = miterSign;
    }

    // Create indices
    for (let si = 0; si < numSegments; si++) {
      const v0 = baseVertex + si * 2;
      const v1 = baseVertex + si * 2 + 1;
      const v2 = baseVertex + si * 2 + 2;
      const v3 = baseVertex + si * 2 + 3;

      idxs[ii++] = v0;
      idxs[ii++] = v1;
      idxs[ii++] = v2;
      idxs[ii++] = v2;
      idxs[ii++] = v1;
      idxs[ii++] = v3;
    }

    baseVertex += vertsPerLine;
  }

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, verts.subarray(0, vi), gl.DYNAMIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxs.subarray(0, ii), gl.DYNAMIC_DRAW);

  gl.drawElements(gl.TRIANGLES, ii, gl.UNSIGNED_INT, 0);
}
