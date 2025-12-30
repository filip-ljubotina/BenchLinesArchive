import { getLineNameCanvas } from "./brush";

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
  bindGroup: GPUBindGroup;
  lineCount: number;
  hoveredIds: Set<string>;
}

interface HoverResult {
  hoveredIds: Set<string>;
  hoveredList: string[];
}

let hoverState: HoverState | null = null;
let readingResults = false;

const HOVER_DISTANCE = 2;
const MAX_POINTS_PER_LINE = 256;

/* =======================
   WebGPU Init
======================= */

export async function initHoverDetection(
  parcoords: any,
  onHoveredLinesChange: any
): Promise<void> {
  const dataset = parcoords.newDataset;
  const adapter = await navigator.gpu?.requestAdapter();
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

      @compute @workgroup_size(256)
      fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
        let lineIdx = gid.x;
        let lineCount = params.x;
        let hoverDist = f32(params.y);
        let maxPts = params.z;

        if (lineIdx >= lineCount) {
          return;
        }

        var hit = 0u;

        for (var i = 0u; i < maxPts - 1u; i++) {
          let idx = lineIdx * maxPts + i;
          let p1 = lineData[idx];
          let p2 = lineData[idx + 1u];

          let pa = mousePos - p1;
          let ba = p2 - p1;
          let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
          let d = length(pa - ba * h);

          if (d < hoverDist) {
            hit = 1u;
            break;
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

  queue.writeBuffer(
    paramsBuffer,
    0,
    new Uint32Array([dataset.length, HOVER_DISTANCE, MAX_POINTS_PER_LINE, 0])
  );

  /* ---------- Layouts ---------- */

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
    ],
  });

  const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resultsBuffer } },
      { binding: 1, resource: { buffer: mouseBuffer } },
      { binding: 2, resource: { buffer: lineDataBuffer } },
      { binding: 3, resource: { buffer: paramsBuffer } },
    ],
  });

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });

  hoverState = {
    device,
    queue,
    computePipeline,
    resultsBuffer,
    resultsStagingBuffer,
    mouseBuffer,
    lineDataBuffer,
    paramsBuffer,
    bindGroup,
    lineCount: dataset.length,
    hoveredIds: new Set(),
  };

  updateLineDataBuffer(dataset, parcoords);

  const plotArea = document.getElementById("plotArea") as HTMLDivElement;
  plotArea.addEventListener("mousemove", (e) => {
    const r = plotArea.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    detectHoveredPolylines(x, y, parcoords, onHoveredLinesChange);
  });
}

/* =======================
   Geometry Upload
======================= */

function updateLineDataBuffer(dataset: any[], parcoords: any): void {
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
   Hover Detection (Shared)
======================= */

export async function detectHoveredPolylines(
  x: number,
  y: number,
  parcoords: any,
  onHoveredLinesChange: any
): Promise<HoverResult> {
  if (!hoverState || readingResults) {
    return { hoveredIds: new Set(), hoveredList: [] };
  }
  const dataset = parcoords.newDataset;
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

    dataset.forEach((d, i) => {
      if (results[i]) {
        const id = getLineNameCanvas(d);
        hoverState!.hoveredIds.add(id);
        hoveredList.push(id);
      }
    });

    onHoveredLinesChange(hoveredList);
    hoverState.resultsStagingBuffer.unmap();

    return {
      hoveredIds: new Set(hoverState.hoveredIds),
      hoveredList,
    };
  } finally {
    readingResults = false;
  }
}

/* =======================
   Polyline Helpers
======================= */

export function getPolylinePoints(d: any, parcoords: any): [number, number][] {
  return parcoords.newFeatures.map((name: string) => [
    parcoords.dragging[name] ?? parcoords.xScales(name),
    parcoords.yScales[name](d[name]),
  ]);
}

/* =======================
   Public API
======================= */

export function getHoveredIds(): Set<string> {
  return hoverState?.hoveredIds ?? new Set();
}
