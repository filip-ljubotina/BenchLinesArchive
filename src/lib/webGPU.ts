import { canvasEl, drawState, lineState, parcoords } from "./globals";
import { getLineNameCanvas } from "./brush";
import { initHoverDetection, SelectionMode } from "./hover/hover";
import {
  clearDataPointLabels,
  createLabelsContainer,
  showDataPointLabels,
} from "./labelUtils";
// the backgrounds are generated using webgl
import {
  initLineTextureWebGL,
  drawInactiveLinesTexture,
  rasterizeInactiveLinesToCanvas,
} from "./lineTexture";

const ACTIVE_LINE_WIDTH = 3;
const INACTIVE_LINE_WIDTH = 2;
const HOVER_LINE_WIDTH = 4;
const SELECTED_LINE_WIDTH = 4;

let device: GPUDevice;
let pipeline: GPURenderPipeline;
let pass: GPURenderPassEncoder;
let encoder: GPUCommandEncoder;
let activeBindGroup: GPUBindGroup;
let inactiveBindGroup: GPUBindGroup;
let hoverBindGroup: GPUBindGroup;
let selectedBindGroup: GPUBindGroup;
let context: GPUCanvasContext;

// Overlay canvas for hovered polylines
let overlayCanvasEl: HTMLCanvasElement;
let overlayContext: GPUCanvasContext;
let hoveredLineIds: Set<string> = new Set();
let selectedLineIds: Set<string> = new Set();
let dataset: any[] = [];
let currentParcoords: any = null;

// background image
let inactiveLinesCanvas: HTMLCanvasElement;
let bgGlCanvas: HTMLCanvasElement | null = null; // persistent canvas (offscreen) to render the inactive lines to before saving as a texture and putting it on the inactiveLinesCanvas

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

function createOverlayCanvas(): HTMLCanvasElement {
  const overlay = document.createElement("canvas");
  overlay.width = canvasEl.width;
  overlay.height = canvasEl.height;
  overlay.style.width = canvasEl.style.width;
  overlay.style.height = canvasEl.style.height;
  overlay.style.position = "absolute";
  overlay.style.top = canvasEl.style.top;
  overlay.style.left = canvasEl.style.left;

  // Insert the overlay right after the main canvas in the DOM
  canvasEl.parentNode?.insertBefore(overlay, canvasEl.nextSibling);

  return overlay;
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

function redrawHoverOverlay() {
  if (!device || !overlayContext) {
    return;
  }

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: overlayContext.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: "store",
      },
    ],
  });

  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = overlayCanvasEl.width;
  const canvasHeight = overlayCanvasEl.height;

  const hoveredLines: { pts: [number, number][]; isSelected: boolean }[] = [];
  let totalVertexCount = 0;

  // Collect only the hovered and selected polylines
  for (const d of dataset) {
    const id = getLineNameCanvas(d);
    if (hoveredLineIds.has(id) || selectedLineIds.has(id)) {
      const pts = getPolylinePoints(d, parcoords, dpr);
      if (pts.length >= 2) {
        const isSelected = selectedLineIds.has(id);
        hoveredLines.push({ pts, isSelected });
        totalVertexCount += (pts.length - 1) * 6;
      }
    }
  }

  if (totalVertexCount === 0) {
    pass.end();
    device.queue.submit([encoder.finish()]);
    return;
  }

  // Build vertex buffer for hovered lines
  const totalBufferSize = totalVertexCount * 2 * 4;
  const allVerts = new Float32Array(totalVertexCount * 2);
  let currentOffset = 0;

  function addVertex(x: number, y: number) {
    const xClip = (x / canvasWidth) * 2 - 1;
    const yClip = 1 - (y / canvasHeight) * 2;
    allVerts[currentOffset++] = xClip;
    allVerts[currentOffset++] = yClip;
  }

  for (const line of hoveredLines) {
    const width = HOVER_LINE_WIDTH; // Both hover and selected use 4
    for (let i = 0; i < line.pts.length - 1; i++) {
      const p1 = line.pts[i];
      const p2 = line.pts[i + 1];
      const x1 = p1[0], y1 = p1[1];
      const x2 = p2[0], y2 = p2[1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
      const perpX = -dy / length * (width / 2);
      const perpY = dx / length * (width / 2);

      // Triangle 1
      addVertex(x1 + perpX, y1 + perpY);
      addVertex(x1 - perpX, y1 - perpY);
      addVertex(x2 + perpX, y2 + perpY);

      // Triangle 2
      addVertex(x1 - perpX, y1 - perpY);
      addVertex(x2 - perpX, y2 - perpY);
      addVertex(x2 + perpX, y2 + perpY);
    }
  }

  const vertexBuffer = device.createBuffer({
    label: "hovered-polyline-vertices",
    size: totalBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(vertexBuffer, 0, allVerts);

  pass.setPipeline(pipeline);
  pass.setVertexBuffer(0, vertexBuffer);

  let vertexOffset = 0;
  for (const line of hoveredLines) {
    const lineVertexCount = (line.pts.length - 1) * 6;
    const bindGroup = line.isSelected ? selectedBindGroup : hoverBindGroup;
    pass.setBindGroup(0, bindGroup);
    pass.draw(lineVertexCount, 1, vertexOffset, 0);
    vertexOffset += lineVertexCount;
  }

  pass.end();
  device.queue.submit([encoder.finish()]);
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

export async function initWebGPU(dataset: any[], parcoords: any) {
  // Check if the GPU device is initialized
  if (!device)
    throw new Error(
      "GPU device is not initialized. Call initCanvasWebGPU first."
    );

  // Get WebGPU context and configure it
  context = canvasEl.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

  // Configure the context with device and format
  context.configure({
    device: device, // Use the GPU device initialized earlier
    format: canvasFormat, // Use the preferred canvas format

    // By default a WebGPU canvas is opaque. Its alpha channel is ignored.
    // To make it not ignored we have to set its alphaMode to 'premultiplied' when we call configure.
    // The default is 'opaque'

    // It’s important to understand what alphaMode: 'premultiplied' means.
    // It means, the colors you put in the canvas must have their color values
    // already multiplied by the alpha value.
    alphaMode: "premultiplied",
  });

  // Create overlay canvas and configure its context
  overlayCanvasEl = createOverlayCanvas();
  overlayContext = overlayCanvasEl.getContext("webgpu");
  overlayContext.configure({
    device: device,
    format: canvasFormat,
    alphaMode: "premultiplied",
  });

  // create and intiialize the background texture
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
  redrawWebGPUBackgroundLines(dataset, parcoords);

  // Create a new shader module on the GPU device
  const cellShaderModule = device.createShaderModule({
    // The label is used for debugging purposes.
    label: "Vertex Shader",

    // The code has the WGSL shader code.
    // Struct VSOut defines a structure for the vertex shader’s output.
    // The vertex shader must output a position for each vertex —
    // the built-in value @builtin(position) is special; it tells WebGPU
    // that this field represents the position in clip space
    // (the coordinate system before rasterization).

    // @vertex fn vs_main(@location(0) pos: vec2<f32>) -> VSOut
    // { @vertex marks this as the vertex shader entry point.
    // The function name vs_main is arbitrary —
    // We reference it later when creating your render pipeline.
    // The parameter @location(0) pos means:
    // Take input from vertex buffer attribute 0.
    // Each vertex provides a 2D position (a vec2<f32>).

    // var out: VSOut;
    // Declares a variable out that will hold the shader’s output —
    // the struct defined earlier.

    // out.position = vec4<f32>(pos, 0.0, 1.0);
    // Converts the 2D input pos into a 4D position vector required by the GPU pipeline.
    // The GPU expects a 4D position in clip space:
    // (x, y) → come from your input
    // z = 0.0 → no depth for now (flat geometry)
    // w = 1.0 → homogeneous coordinate (used in perspective divide later)

    // @fragment fn fs_main() -> @location(0) vec4<f32> {
    // @fragment marks this as the fragment shader entry point.
    // It runs once per pixel that the geometry covers.
    // The return value @location(0) means the output color is written
    // to the first color attachment in your render target (usually the screen)

    code: `
      @group(0) @binding(0) var<uniform> color: vec4<f32>;

      struct VSOut {
        @builtin(position) position : vec4<f32>,
      };

      @vertex
      fn vs_main(@location(0) pos: vec2<f32>) -> VSOut {
        var out: VSOut;
        out.position = vec4<f32>(pos, 0.0, 1.0);
        return out;
      }

      @fragment
      fn fs_main() -> @location(0) vec4<f32> {
        return color;
      }
    `,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {},
      },
    ],
  });

  const vertexBufferLayout: GPUVertexBufferLayout = {
    // arrayStride is the number of bytes the GPU needs to skip
    // forward in the buffer when it's looking for the next vertex.
    // Each vertex of your square is made up of two 32-bit floating point numbers.
    // As mentioned earlier, a 32-bit float is 4 bytes, so two floats is 8 bytes.

    arrayStride: 8,
    attributes: [
      {
        // https://gpuweb.github.io/gpuweb/#enumdef-gpuvertexformat
        // Format comes from a list of GPUVertexFormat types that describe
        // each type of vertex data that the GPU can understand.
        // The vertices here have two 32-bit floats each, so we use the format float32x2

        format: "float32x2" as GPUVertexFormat,

        // the offset describes how many bytes into the vertex this particular attribute starts.
        offset: 0,

        // The shaderLocation. This is an arbitrary number between 0 and 15
        // and must be unique for every attribute that you define.
        // It links this attribute to a particular input in the vertex shader.
        shaderLocation: 0,
      } as GPUVertexAttribute,
    ],
  };

  pipeline = device.createRenderPipeline({
    // Every pipeline needs a layout that describes what types of inputs.
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),

    // Now, we provide details about the vertex stage.

    vertex: {
      // The module is the GPUShaderModule that contains your vertex shader,
      module: cellShaderModule,

      // The entryPoint gives the name of the function in the shader code that is
      // called for every vertex invocation. (You can have multiple @vertex and @fragment
      // functions in a single shader module!)
      entryPoint: "vs_main",

      // The buffers is an array of GPUVertexBufferLayout
      // objects that describe how your data is packed in the vertex buffers that you use
      // this pipeline with.
      buffers: [vertexBufferLayout],
    },
    fragment: {
      module: cellShaderModule,
      entryPoint: "fs_main",
      targets: [
        {
          format: canvasFormat,
          blend: {
            color: {
              // srcFactor is the factor for the source color (the color being drawn)
              srcFactor: "src-alpha",

              // dstFactor is the factor for the destination color (the color already in the framebuffer)
              dstFactor: "one-minus-src-alpha",

              // operation is the blending operation to apply
              operation: "add",
            },
            alpha: {
              // srcFactor is the factor for the source alpha (the alpha being drawn)
              srcFactor: "one",

              // dstFactor is the factor for the destination alpha (the alpha already in the framebuffer)
              dstFactor: "one-minus-src-alpha",

              // operation is the blending operation to apply
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      // We are drawing triangles
      topology: "triangle-list",

      // For pipelines with strip topologies ("line-strip" or "triangle-strip"), this determines the
      // index buffer format and primitive restart value ("uint16"/0xFFFF or "uint32"/0xFFFFFFFF).
      // It is not allowed on pipelines with non-strip topologies.
      stripIndexFormat: undefined,
    },
  });

  // Create uniform buffers for active and inactive colors
  const activeColorBuffer = device.createBuffer({
    size: 16, // vec4<f32> = 16 bytes
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    activeColorBuffer,
    0,
    new Float32Array([128.0 / 255.0, 191.0 / 255.0, 214.0 / 255.0, 1.0])
  );

  const inactiveColorBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    inactiveColorBuffer,
    0,
    new Float32Array([235.0 / 255.0, 235.0 / 255.0, 235.0 / 255.0, 1.0])
  );

  // Create hover color buffer (red)
  const hoverColorBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    hoverColorBuffer,
    0,
    new Float32Array([1.0, 51.0 / 255.0, 51.0 / 255.0, 1.0]) // Red with alpha 1.0
  );

  // Create selected color buffer (orange)
  const selectedColorBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    selectedColorBuffer,
    0,
    new Float32Array([1.0, 128.0 / 255.0, 0.0, 1.0]) // Orange with alpha 1.0
  );

  // Create bind groups for each color
  activeBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: activeColorBuffer } }],
  });

  inactiveBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: inactiveColorBuffer } }],
  });

  hoverBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: hoverColorBuffer } }],
  });

  selectedBindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: selectedColorBuffer } }],
  });

  createLabelsContainer();

  // Create command encoder to encode GPU commands
  encoder = device.createCommandEncoder();

  // Begin a render pass
  pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        // clear to transparent
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: "store",
      },
    ],
  });

  await initHoverDetection(parcoords, onHoveredLinesChange);
  setupCanvasClickHandling();
}

// export function redrawWebGPUBackgroundLines(dataset: any[], parcoords: any) {
//   drawInactiveLinesTexture(dataset, parcoords);
// }

export function redrawWebGPUBackgroundLines(dataset: any[], parcoords: any) {
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

// Below function initializes WebGPU context and device
export async function initCanvasWebGPU(dataset: any[], parcoords: any) {
  // console.log("Initializing WebGPU...");

  // The Navigator interface represents the state and the identity of the user agent.
  // It allows scripts to query it and to register themselves to carry on some activities.
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported.");
  }

  // Request and Check if a GPU adapter is available
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error("GPU adapter unavailable.");
  }
  device = await adapter.requestDevice();

  // console.log("WebGPU initialized successfully.");

  initWebGPU(dataset, parcoords);
}

export function redrawWebGPULines(newDataset: any[], parcoords: any) {
  // Store the dataset for hover overlay use
  dataset = newDataset;
  currentParcoords = parcoords;

  if (!device) {
    throw new Error(
      "GPU device is not initialized. Call initCanvasWebGPU first."
    );
  }

  encoder = device.createCommandEncoder();
  pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: "store",
      },
    ],
  });

  const dpr = window.devicePixelRatio || 1;
  const canvasWidth = canvasEl.width;
  const canvasHeight = canvasEl.height;

  const allLines: { pts: [number, number][]; active: boolean }[] = [];
  let totalVertexCount = 0;

  for (const d of newDataset) {
    const id = getLineNameCanvas(d);
    const active = lineState[id]?.active ?? true;
    if (!active) continue;
    const pts = getPolylinePoints(d, parcoords, dpr);

    if (pts.length >= 2) {
      allLines.push({ pts, active });
      // Each segment has 6 vertices (2 triangles)
      totalVertexCount += (pts.length - 1) * 6;
    }
  }

  if (totalVertexCount === 0) {
    // If no lines to draw, just finish the pass and submit an empty command buffer
    pass.end();
    device.queue.submit([encoder.finish()]);
    return;
  }

  // Each vertex is 2 floats, 4 bytes each: 8 bytes per vertex.
  const totalBufferSize = totalVertexCount * 2 * 4;
  const allVerts = new Float32Array(totalVertexCount * 2);
  let currentOffset = 0;

  function addVertex(x: number, y: number) {
    const xClip = (x / canvasWidth) * 2 - 1;
    const yClip = 1 - (y / canvasHeight) * 2;
    allVerts[currentOffset++] = xClip;
    allVerts[currentOffset++] = yClip;
  }

  for (const line of allLines) {
    const width = line.active ? ACTIVE_LINE_WIDTH : INACTIVE_LINE_WIDTH;
    for (let i = 0; i < line.pts.length - 1; i++) {
      const p1 = line.pts[i];
      const p2 = line.pts[i + 1];
      const x1 = p1[0], y1 = p1[1];
      const x2 = p2[0], y2 = p2[1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
      const perpX = -dy / length * (width / 2);
      const perpY = dx / length * (width / 2);

      // Triangle 1
      addVertex(x1 + perpX, y1 + perpY);
      addVertex(x1 - perpX, y1 - perpY);
      addVertex(x2 + perpX, y2 + perpY);

      // Triangle 2
      addVertex(x1 - perpX, y1 - perpY);
      addVertex(x2 - perpX, y2 - perpY);
      addVertex(x2 + perpX, y2 + perpY);
    }
  }

  // Create the single buffer
  const vertexBuffer = device.createBuffer({
    label: "all-polyline-vertices",
    size: totalBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // Write all data to the GPU in a single call
  device.queue.writeBuffer(vertexBuffer, 0, allVerts);

  pass.setPipeline(pipeline);
  // Set the one and only vertex buffer for all subsequent draws
  pass.setVertexBuffer(0, vertexBuffer);

  let vertexOffset = 0;
  for (const line of allLines) {
    const lineVertexCount = (line.pts.length - 1) * 6;

    // Set the appropriate color (Bind Group) for this line
    pass.setBindGroup(0, line.active ? activeBindGroup : inactiveBindGroup);

    // Draw a subset of the super-buffer using the vertexOffset
    // lineVertexCount is the number of vertices for this single line
    // vertexOffset is the starting position (in vertices) within the super-buffer
    pass.draw(lineVertexCount, 1, vertexOffset, 0);

    // Increment the offset for the next line's starting position
    vertexOffset += lineVertexCount;
  }

  pass.end();
  device.queue.submit([encoder.finish()]);

  // Redraw the hover overlay with current hovered lines
  redrawHoverOverlay();
}

export function getSelectedIds(): Set<string> {
  return selectedLineIds;
}

export function disposeWebGPU() {
  clearDataPointLabels();
  hoveredLineIds.clear();
  selectedLineIds.clear();
  dataset = [];
  currentParcoords = null;
}
