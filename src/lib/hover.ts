import { getLineNameCanvas } from "./brush";
import { activeTool } from "./globals";
import { clearSvgDraw, startSvgDraw, updateSvgDraw } from "./selection";

/* =======================
   Types & State
======================= */

interface HoverState {
  device: GPUDevice;
  queue: GPUQueue;
  computePipeline: GPUComputePipeline;
  resultsBuffer: GPUBuffer;
  resultsStagingBuffer: GPUBuffer;
  mouseBuffer: GPUBuffer;
  lineDataBuffer: GPUBuffer;
  paramsBuffer: GPUBuffer;
  drawParamsBuffer: GPUBuffer;
  drawModeBuffer: GPUBuffer;
  bindGroup: GPUBindGroup;
  lineCount: number;
  hoveredIds: Set<string>;
  mouseMoveHandler: ((e: MouseEvent) => void) | null;
  mouseDownHandler: ((e: MouseEvent) => void) | null;
  mouseUpHandler: (() => void) | null;
  lastSelectionMode: SelectionMode; // Add this
}

export type SelectionMode = "hover" | "line" | "box";

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface HoverResult {
  hoveredIds: Set<string>;
  hoveredList: string[];
  selectionMode: SelectionMode; // Add this
}

let hoverState: HoverState | null = null;
let readingResults = false;

let drawState: DrawState = {
  isDrawing: false,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
};

const HOVER_DISTANCE = 2;
const MAX_POINTS_PER_LINE = 256;

function cleanupHoverDetection() {
  if (!hoverState) return;

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  // Remove old event listeners
  if (hoverState.mouseMoveHandler) {
    plotArea.removeEventListener("mousemove", hoverState.mouseMoveHandler);
  }
  if (hoverState.mouseDownHandler) {
    plotArea.removeEventListener("mousedown", hoverState.mouseDownHandler);
  }
  if (hoverState.mouseUpHandler) {
    plotArea.removeEventListener("mouseup", hoverState.mouseUpHandler);
  }

  // Clear draw state
  drawState.isDrawing = false;
  clearSvgDraw();

  // Destroy GPU resources
  hoverState.resultsBuffer.destroy();
  hoverState.resultsStagingBuffer.destroy();
  hoverState.mouseBuffer.destroy();
  hoverState.lineDataBuffer.destroy();
  hoverState.paramsBuffer.destroy();
  hoverState.drawParamsBuffer.destroy();
  hoverState.drawModeBuffer.destroy();

  hoverState = null;
}

export async function initHoverDetection(
  parcoords: any,
  onHoveredLinesChange: any
): Promise<void> {
  cleanupHoverDetection();

  const dataset = parcoords.newDataset;

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("WebGPU not supported");

  const device = await adapter.requestDevice();
  const queue = device.queue;

  /* ---------- Shader ---------- */
  const shaderModule = device.createShaderModule({
    code: `
      @group(0) @binding(0) var<storage, read_write> results : array<u32>;
      @group(0) @binding(1) var<uniform> mousePos : vec2<f32>;
      @group(0) @binding(2) var<storage, read> lineData : array<vec2<f32>>;
      @group(0) @binding(3) var<uniform> params : vec4<u32>;
      @group(0) @binding(4) var<uniform> drawParams : vec4<f32>;
      @group(0) @binding(5) var<uniform> drawMode : u32;

      fn lineSegmentsIntersect(
        p1: vec2<f32>, p2: vec2<f32>,
        p3: vec2<f32>, p4: vec2<f32>
      ) -> bool {
        let denom = (p4.y - p3.y) * (p2.x - p1.x) -
                    (p4.x - p3.x) * (p2.y - p1.y);
        if (abs(denom) < 0.0001) { return false; }

        let ua = ((p4.x - p3.x) * (p1.y - p3.y) -
                  (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        let ub = ((p2.x - p1.x) * (p1.y - p3.y) -
                  (p2.y - p1.y) * (p1.x - p3.x)) / denom;

        return ua >= 0.0 && ua <= 1.0 && ub >= 0.0 && ub <= 1.0;
      }

      fn lineSegmentIntersectsBox(
        p1: vec2<f32>, p2: vec2<f32>,
        minX: f32, maxX: f32, minY: f32, maxY: f32
      ) -> bool {
        // Check if either endpoint is inside the box
        if ((p1.x >= minX && p1.x <= maxX && p1.y >= minY && p1.y <= maxY) ||
            (p2.x >= minX && p2.x <= maxX && p2.y >= minY && p2.y <= maxY)) {
          return true;
        }

        // Define the four edges of the box
        let topLeft = vec2<f32>(minX, minY);
        let topRight = vec2<f32>(maxX, minY);
        let bottomLeft = vec2<f32>(minX, maxY);
        let bottomRight = vec2<f32>(maxX, maxY);

        // Check intersection with each of the four box edges
        if (lineSegmentsIntersect(p1, p2, topLeft, topRight) ||
            lineSegmentsIntersect(p1, p2, topRight, bottomRight) ||
            lineSegmentsIntersect(p1, p2, bottomRight, bottomLeft) ||
            lineSegmentsIntersect(p1, p2, bottomLeft, topLeft)) {
          return true;
        }

        return false;
      }

      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
        let lineIdx = gid.x;
        let lineCount = params.x;
        let hoverDist = f32(params.y);
        let maxPts = params.z;
        let mode = drawMode;

        if (lineIdx >= lineCount) { return; }

        var hit = 0u;

        if (mode == 0u) {
          // Hover mode: point-to-line distance
          for (var i = 0u; i < maxPts - 1u; i++) {
            let idx = lineIdx * maxPts + i;
            let p1 = lineData[idx];
            let p2 = lineData[idx + 1u];

            let pa = mousePos - p1;
            let ba = p2 - p1;
            let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            let d = length(pa - ba * h);

            if (d < hoverDist) { hit = 1u; break; }
          }
        } else if (mode == 1u) {
          // Line selection mode: line-to-line intersection
          let p1 = drawParams.xy;
          let p2 = drawParams.zw;

          for (var i = 0u; i < maxPts - 1u; i++) {
            let idx = lineIdx * maxPts + i;
            if (lineSegmentsIntersect(p1, p2, lineData[idx], lineData[idx+1u])) {
              hit = 1u; break;
            }
          }
        } else if (mode == 2u) {
          // Box selection mode: box-to-line intersection
          let minX = min(drawParams.x, drawParams.z);
          let maxX = max(drawParams.x, drawParams.z);
          let minY = min(drawParams.y, drawParams.w);
          let maxY = max(drawParams.y, drawParams.w);

          for (var i = 0u; i < maxPts - 1u; i++) {
            let idx = lineIdx * maxPts + i;
            let p1 = lineData[idx];
            let p2 = lineData[idx + 1u];
            
            // Skip invalid segments (where points are identical or at origin)
            if (distance(p1, p2) < 0.001) { continue; }
            
            if (lineSegmentIntersectsBox(p1, p2, minX, maxX, minY, maxY)) {
              hit = 1u; break;
            }
          }
        }

        results[lineIdx] = hit;
      }
    `,
  });

  /* ---------- Buffers ---------- */

  const resultsBuffer = device.createBuffer({
    size: dataset.length * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });

  const resultsStagingBuffer = device.createBuffer({
    size: dataset.length * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  const mouseBuffer = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const lineDataBuffer = device.createBuffer({
    size: dataset.length * MAX_POINTS_PER_LINE * 8,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const paramsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const drawParamsBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const drawModeBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  queue.writeBuffer(
    paramsBuffer,
    0,
    new Uint32Array([dataset.length, HOVER_DISTANCE, MAX_POINTS_PER_LINE, 0])
  );

  queue.writeBuffer(drawModeBuffer, 0, new Uint32Array([0]));

  /* ---------- Bindings ---------- */

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      {
        binding: 5,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resultsBuffer } },
      { binding: 1, resource: { buffer: mouseBuffer } },
      { binding: 2, resource: { buffer: lineDataBuffer } },
      { binding: 3, resource: { buffer: paramsBuffer } },
      { binding: 4, resource: { buffer: drawParamsBuffer } },
      { binding: 5, resource: { buffer: drawModeBuffer } },
    ],
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: { module: shaderModule, entryPoint: "main" },
  });

  const mouseMoveHandler = (e: MouseEvent) => {
    if (!hoverState) return;

    const r = plotArea.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (drawState.isDrawing) {
      drawState.endX = x;
      drawState.endY = y;

      updateSvgDraw(
        drawState.startX,
        drawState.startY,
        drawState.endX,
        drawState.endY
      );
    } else {
      hoverState.queue.writeBuffer(drawModeBuffer, 0, new Uint32Array([0]));
      detectHoveredPolylines(x, y, parcoords, onHoveredLinesChange, "hover");
    }
  };

  const mouseDownHandler = (e: MouseEvent) => {
    if (e.shiftKey) return;
    
    const r = plotArea.getBoundingClientRect();

    drawState.isDrawing = true;
    drawState.startX = e.clientX - r.left;
    drawState.startY = e.clientY - r.top;
    drawState.endX = drawState.startX;
    drawState.endY = drawState.startY;

    startSvgDraw(drawState.startX, drawState.startY);
  };

  const mouseUpHandler = () => {
    if (!hoverState || !drawState.isDrawing) return;

    drawState.isDrawing = false;
    clearSvgDraw();

    const mode = activeTool === "line" ? 1 : 2;
    const selectionMode: SelectionMode = activeTool === "line" ? "line" : "box";

    hoverState.queue.writeBuffer(
      drawParamsBuffer,
      0,
      new Float32Array([
        drawState.startX,
        drawState.startY,
        drawState.endX,
        drawState.endY,
      ])
    );

    hoverState.queue.writeBuffer(drawModeBuffer, 0, new Uint32Array([mode]));

    detectHoveredPolylines(
      drawState.endX,
      drawState.endY,
      parcoords,
      onHoveredLinesChange,
      selectionMode
    );
  };

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;

  plotArea.addEventListener("mousemove", mouseMoveHandler);
  plotArea.addEventListener("mousedown", mouseDownHandler);
  plotArea.addEventListener("mouseup", mouseUpHandler);

  hoverState = {
    device,
    queue,
    computePipeline,
    resultsBuffer,
    resultsStagingBuffer,
    mouseBuffer,
    lineDataBuffer,
    paramsBuffer,
    drawParamsBuffer,
    drawModeBuffer,
    bindGroup,
    lineCount: dataset.length,
    hoveredIds: new Set(),
    mouseMoveHandler,
    mouseDownHandler,
    mouseUpHandler,
    lastSelectionMode: "hover",
  };

  updateLineDataBuffer(dataset, parcoords);
}

/* =======================
   Geometry Upload
======================= */

export function updateLineDataBuffer(dataset: any[], parcoords: any): void {
  if (!hoverState) return;

  const data = new Float32Array(hoverState.lineCount * MAX_POINTS_PER_LINE * 2);

  dataset.forEach((d, i) => {
    const pts = getPolylinePoints(d, parcoords);
    pts.forEach((p, j) => {
      const o = (i * MAX_POINTS_PER_LINE + j) * 2;
      data[o] = p[0];
      data[o + 1] = p[1];
    });
  });

  hoverState.queue.writeBuffer(hoverState.lineDataBuffer, 0, data);
}

/* =======================
   Hover Detection
======================= */

export async function detectHoveredPolylines(
  x: number,
  y: number,
  parcoords: any,
  onHoveredLinesChange: any,
  mode?: SelectionMode // Add optional mode parameter
): Promise<HoverResult> {
  if (!hoverState || readingResults) {
    return { hoveredIds: new Set(), hoveredList: [], selectionMode: "hover" };
  }

  // Determine the selection mode
  const selectionMode: SelectionMode = mode || "hover";

  readingResults = true;

  try {
    hoverState.queue.writeBuffer(
      hoverState.mouseBuffer,
      0,
      new Float32Array([x, y])
    );

    const encoder = hoverState.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(hoverState.computePipeline);
    pass.setBindGroup(0, hoverState.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(hoverState.lineCount / 256));
    pass.end();

    encoder.copyBufferToBuffer(
      hoverState.resultsBuffer,
      0,
      hoverState.resultsStagingBuffer,
      0,
      hoverState.lineCount * 4
    );

    hoverState.queue.submit([encoder.finish()]);

    await hoverState.resultsStagingBuffer.mapAsync(GPUMapMode.READ);
    const results = new Uint32Array(
      hoverState.resultsStagingBuffer.getMappedRange()
    );

    hoverState.hoveredIds.clear();
    const hoveredList: string[] = [];

    parcoords.newDataset.forEach((d: any, i: number) => {
      if (results[i]) {
        const id = getLineNameCanvas(d);
        hoverState!.hoveredIds.add(id);
        hoveredList.push(id);
      }
    });

    // Store the last selection mode
    hoverState.lastSelectionMode = selectionMode;

    // console.log(`Selection via ${selectionMode}:`, hoveredList);

    // Pass selection mode to callback
    onHoveredLinesChange(hoveredList, selectionMode);

    hoverState.resultsStagingBuffer.unmap();

    return {
      hoveredIds: new Set(hoverState.hoveredIds),
      hoveredList,
      selectionMode,
    };
  } finally {
    readingResults = false;
  }
}

/* =======================
   Helpers
======================= */

export function getPolylinePoints(d: any, parcoords: any): [number, number][] {
  return parcoords.newFeatures.map((name: string) => [
    parcoords.dragging[name] ?? parcoords.xScales(name),
    parcoords.yScales[name](d[name]),
  ]);
}

export function getHoveredIds(): Set<string> {
  return hoverState?.hoveredIds ?? new Set();
}

export function getDrawState(): DrawState {
  return drawState;
}
