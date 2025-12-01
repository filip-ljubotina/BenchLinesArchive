import { canvasEl, lineState } from "./globals";
import { getLineName } from "./brush";

let device: GPUDevice;
let pipeline: GPURenderPipeline;
let context: GPUCanvasContext;
let canvasFormat: GPUTextureFormat;

// Pre-allocated buffers
let vertexBuffer: GPUBuffer | null = null;
let indexBuffer: GPUBuffer | null = null;
let uniformBuffer: GPUBuffer | null = null;
let bindGroup: GPUBindGroup | null = null;

// Staging arrays (CPU side)
let vertexData: Float32Array<ArrayBuffer> | null = null;
let indexData: Uint32Array<ArrayBuffer> | null = null;
let vertexCapacity = 0;
let indexCapacity = 0;

// Cached values
let dpr = 1;
let width = 0;
let height = 0;

// Constants
const FLOATS_PER_VERTEX = 6; // x, y, r, g, b, a
const BYTES_PER_VERTEX = FLOATS_PER_VERTEX * 4;
const PRIMITIVE_RESTART = 0xffffffff;

// Colors
const ACTIVE_R = 0 / 255;
const ACTIVE_G = 129 / 255;
const ACTIVE_B = 175 / 255;
const ACTIVE_A = 0.5;
const INACTIVE_R = 211 / 255;
const INACTIVE_G = 211 / 255;
const INACTIVE_B = 211 / 255;
const INACTIVE_A = 0.4;

const SHADER_CODE = `
struct Uniforms {
  resolution: vec2<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
};

@vertex
fn vs_main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  
  // Convert from pixel coordinates to clip space
  let x = (input.position.x / uniforms.resolution.x) * 2.0 - 1.0;
  let y = 1.0 - (input.position.y / uniforms.resolution.y) * 2.0;
  
  output.position = vec4<f32>(x, y, 0.0, 1.0);
  output.color = input.color;
  return output;
}

@fragment
fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
  // Premultiplied alpha
  return vec4<f32>(input.color.rgb * input.color.a, input.color.a);
}
`;

function ensureCapacity(
  requiredVertices: number,
  requiredIndices: number
): void {
  const requiredVertexBytes = requiredVertices * BYTES_PER_VERTEX;
  const requiredIndexBytes = requiredIndices * 4;

  // Vertex buffer
  if (!vertexBuffer || vertexCapacity < requiredVertexBytes) {
    if (vertexBuffer) vertexBuffer.destroy();
    vertexCapacity = Math.max(requiredVertexBytes, vertexCapacity * 2) || 65536;
    vertexBuffer = device.createBuffer({
      label: "vertex-buffer",
      size: vertexCapacity,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    vertexData = new Float32Array(vertexCapacity / 4);
  }

  // Index buffer
  if (!indexBuffer || indexCapacity < requiredIndexBytes) {
    if (indexBuffer) indexBuffer.destroy();
    indexCapacity = Math.max(requiredIndexBytes, indexCapacity * 2) || 32768;
    indexBuffer = device.createBuffer({
      label: "index-buffer",
      size: indexCapacity,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });
    indexData = new Uint32Array(indexCapacity / 4);
  }
}

export async function initCanvasWebGPU2(): Promise<void> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("GPU adapter unavailable.");
  }

  device = await adapter.requestDevice();

  dpr = window.devicePixelRatio || 1;
  width = canvasEl.clientWidth * dpr;
  height = canvasEl.clientHeight * dpr;
  canvasEl.width = width;
  canvasEl.height = height;

  context = canvasEl.getContext("webgpu") as GPUCanvasContext;
  canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  context.configure({
    device,
    format: canvasFormat,
    alphaMode: "premultiplied",
  });

  // Create shader module
  const shaderModule = device.createShaderModule({
    label: "line-shader",
    code: SHADER_CODE,
  });

  // Create bind group layout
  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });

  // Create pipeline layout
  const pipelineLayout = device.createPipelineLayout({
    bindGroupLayouts: [bindGroupLayout],
  });

  // Create render pipeline
  pipeline = device.createRenderPipeline({
    label: "line-pipeline",
    layout: pipelineLayout,
    vertex: {
      module: shaderModule,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: BYTES_PER_VERTEX,
          attributes: [
            { shaderLocation: 0, offset: 0, format: "float32x2" }, // position
            { shaderLocation: 1, offset: 8, format: "float32x4" }, // color
          ],
        },
      ],
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: canvasFormat,
          blend: {
            color: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "line-strip",
      stripIndexFormat: "uint32",
    },
  });

  // Create uniform buffer for resolution
  uniformBuffer = device.createBuffer({
    label: "uniform-buffer",
    size: 16, // vec2 + padding
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Create bind group
  bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
    ],
  });

  // Write initial resolution
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([width, height]));
}

export function redrawWebGPULines2(dataset: any[], parcoords: any): void {
  if (!device || !pipeline || !context) {
    throw new Error("WebGPU not initialized. Call initCanvasWebGPU first.");
  }

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

    context.configure({
      device,
      format: canvasFormat,
      alphaMode: "premultiplied",
    });

    device.queue.writeBuffer(
      uniformBuffer!,
      0,
      new Float32Array([width, height])
    );
  }

  if (!dataset.length) return;

  const features: string[] = parcoords.newFeatures;
  const numFeatures = features.length;
  if (numFeatures < 2) return;

  const dragging = parcoords.dragging;
  const xScales = parcoords.xScales;
  const yScales = parcoords.yScales;

  // Sort: inactive first, active last (for correct layering)
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

  // Calculate required buffer sizes
  const totalVertices = numLines * numFeatures;
  const totalIndices = totalVertices + numLines - 1; // vertices + restart indices

  ensureCapacity(totalVertices, totalIndices);

  const verts = vertexData!;
  const idxs = indexData!;

  // Cache x-coordinates (same for all lines)
  const xCoords = new Float32Array(numFeatures);
  for (let i = 0; i < numFeatures; i++) {
    const f = features[i];
    xCoords[i] = (dragging[f] ?? xScales(f)) * dpr;
  }

  let vi = 0; // vertex float index
  let ii = 0; // index array index
  let vertexIndex = 0;

  const inactiveCount = inactive.length;

  for (let li = 0; li < numLines; li++) {
    const d = sortedData[li];
    const isActive = li >= inactiveCount;

    const r = isActive ? ACTIVE_R : INACTIVE_R;
    const g = isActive ? ACTIVE_G : INACTIVE_G;
    const b = isActive ? ACTIVE_B : INACTIVE_B;
    const a = isActive ? ACTIVE_A : INACTIVE_A;

    // Add vertices for this line
    for (let fi = 0; fi < numFeatures; fi++) {
      const f = features[fi];
      const x = xCoords[fi];
      const y = yScales[f](d[f]) * dpr;

      // Interleaved: x, y, r, g, b, a
      verts[vi++] = x;
      verts[vi++] = y;
      verts[vi++] = r;
      verts[vi++] = g;
      verts[vi++] = b;
      verts[vi++] = a;

      idxs[ii++] = vertexIndex++;
    }

    // Add primitive restart between lines
    if (li < numLines - 1) {
      idxs[ii++] = PRIMITIVE_RESTART;
    }
  }

  // Upload data to GPU
  device.queue.writeBuffer(vertexBuffer!, 0, verts.subarray(0, vi));
  device.queue.writeBuffer(indexBuffer!, 0, idxs.subarray(0, ii));

  // Create command encoder and render pass
  const encoder = device.createCommandEncoder();

  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: "store",
      },
    ],
  });

  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup!);
  pass.setVertexBuffer(0, vertexBuffer!);
  pass.setIndexBuffer(indexBuffer!, "uint32");
  pass.drawIndexed(ii);

  pass.end();
  device.queue.submit([encoder.finish()]);
}
