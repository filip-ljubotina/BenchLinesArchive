import {
  IHoverDetectionBackend,
  HoverDetectionConfig,
  DetectionParams,
} from "./hoverTypes";

interface GPUResources {
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
}

export class GPUHoverBackend implements IHoverDetectionBackend {
  private resources: GPUResources | null = null;
  private lineCount: number = 0;
  private reading: boolean = false;

  isAvailable(): boolean {
    return typeof navigator !== "undefined" && "gpu" in navigator;
  }

  async init(lineCount: number, config: HoverDetectionConfig): Promise<void> {
    this.destroy(); 

    if (!this.isAvailable()) {
      throw new Error("WebGPU is not available");
    }

    this.lineCount = lineCount;

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU adapter not available");
    }

    const device = await adapter.requestDevice();
    const queue = device.queue;

    const shaderModule = device.createShaderModule({
      code: this.getShaderCode(),
    });

    const resultsBuffer = device.createBuffer({
      size: lineCount * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    const resultsStagingBuffer = device.createBuffer({
      size: lineCount * 4,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });

    const mouseBuffer = device.createBuffer({
      size: 8,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    const lineDataBuffer = device.createBuffer({
      size: lineCount * config.maxPointsPerLine * 8,
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

    // Initialize params buffer
    queue.writeBuffer(
      paramsBuffer,
      0,
      new Uint32Array([
        lineCount,
        config.hoverDistance,
        config.maxPointsPerLine,
        0,
      ])
    );

    queue.writeBuffer(drawModeBuffer, 0, new Uint32Array([0]));

    // Create bind group layout and bind group
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

    this.resources = {
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
    };
  }

  updateLineData(lineData: Float32Array<ArrayBuffer>): void {
    if (!this.resources) {
      throw new Error("GPU backend not initialized");
    }
    this.resources.queue.writeBuffer(
      this.resources.lineDataBuffer,
      0,
      lineData
    );
  }

  async detect(params: DetectionParams): Promise<Uint32Array> {
    if (!this.resources) {
      throw new Error("GPU backend not initialized");
    }

    if (this.reading) {
      return new Uint32Array(this.lineCount);
    }

    this.reading = true;

    try {
      const { queue, device } = this.resources;

      const modeValue =
        params.mode === "hover" ? 0 : params.mode === "line" ? 1 : 2;
      queue.writeBuffer(
        this.resources.drawModeBuffer,
        0,
        new Uint32Array([modeValue])
      );

      queue.writeBuffer(
        this.resources.mouseBuffer,
        0,
        new Float32Array([params.mouseX, params.mouseY])
      );

      if (params.mode !== "hover" && params.drawStart && params.drawEnd) {
        queue.writeBuffer(
          this.resources.drawParamsBuffer,
          0,
          new Float32Array([
            params.drawStart.x,
            params.drawStart.y,
            params.drawEnd.x,
            params.drawEnd.y,
          ])
        );
      }

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.resources.computePipeline);
      pass.setBindGroup(0, this.resources.bindGroup);
      pass.dispatchWorkgroups(Math.ceil(this.lineCount / 256));
      pass.end();

      encoder.copyBufferToBuffer(
        this.resources.resultsBuffer,
        0,
        this.resources.resultsStagingBuffer,
        0,
        this.lineCount * 4
      );

      queue.submit([encoder.finish()]);

      await this.resources.resultsStagingBuffer.mapAsync(GPUMapMode.READ);
      const resultData = new Uint32Array(
        this.resources.resultsStagingBuffer.getMappedRange()
      );

      const results = new Uint32Array(resultData);
      this.resources.resultsStagingBuffer.unmap();

      return results;
    } finally {
      this.reading = false;
    }
  }

  destroy(): void {
    if (!this.resources) return;

    this.resources.resultsBuffer.destroy();
    this.resources.resultsStagingBuffer.destroy();
    this.resources.mouseBuffer.destroy();
    this.resources.lineDataBuffer.destroy();
    this.resources.paramsBuffer.destroy();
    this.resources.drawParamsBuffer.destroy();
    this.resources.drawModeBuffer.destroy();

    this.resources = null;
  }

  private getShaderCode(): string {
    return `
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
    `;
  }
}
