import { canvasEl } from "./globals";

let device: GPUDevice;

function getPolylinePoints(d: any, parcoords: any, dpr: number): [number, number][] {
  const pts: [number, number][] = [];
  parcoords.newFeatures.forEach((name: string) => {
    const x = (parcoords.dragging[name] ?? parcoords.xScales(name)) * dpr;
    const y = parcoords.yScales[name](d[name]) * dpr;
    pts.push([x, y]);
  });
  return pts;
}

// Below function initializes WebGPU context and device
export async function initCanvasWebGPU() {

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
}


export function redrawWebGPULines(dataset: any[], parcoords: any) {

  // The devicePixelRatio of Window interface returns the ratio of the resolution in physical pixels 
  // to the resolution in CSS pixels for the current display device.
  const dpr = window.devicePixelRatio || 1;

  // Check if the GPU device is initialized
  if (!device) throw new Error("GPU device is not initialized. Call initCanvasWebGPU first.");

  // Get WebGPU context and configure it
  const context = canvasEl.getContext("webgpu");
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
        // rgba(0, 129, 175, 0.5)
        return vec4<f32>(0.0, 129.0 / 255.0, 175.0 / 255.0, 0.5);
      }
    `
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

  const pipeline = device.createRenderPipeline({
    // Every pipeline needs a layout that describes what types of inputs.
    layout: "auto",

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
      targets: [{


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
      }],
    },
    primitive: {
      // We are drawing lines
      topology: "line-strip",

      // For pipelines with strip topologies ("line-strip" or "triangle-strip"), this determines the 
      // index buffer format and primitive restart value ("uint16"/0xFFFF or "uint32"/0xFFFFFFFF). 
      // It is not allowed on pipelines with non-strip topologies.
      stripIndexFormat: undefined,
    },
  });

  // Create command encoder to encode GPU commands
  const encoder = device.createCommandEncoder();

  // Begin a render pass
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: context.getCurrentTexture().createView(),
      loadOp: "clear",
      // clear to transparent
      clearValue: { r: 0, g: 0, b: 0, a: 0 },
      storeOp: "store",
    }],
  });


  // Get canvas dimensions
  const canvasWidth = canvasEl.width;
  const canvasHeight = canvasEl.height;
 
  for (const d of dataset) {
    const pts = getPolylinePoints(d, parcoords, dpr);
    if (pts.length < 2) continue;

    // Create a vertex buffer for the polyline
    const verts = new Float32Array(pts.length * 2);
    for (let i = 0; i < pts.length; ++i) {
      const x = pts[i][0];
      const y = pts[i][1];
      const xClip = (x / canvasWidth) * 2 - 1;
      const yClip = 1 - (y / canvasHeight) * 2;
      verts[i * 2 + 0] = xClip;
      verts[i * 2 + 1] = yClip;
    }

    const vertexBuffer = device.createBuffer({
      label: "polyline-vertices",
      size: verts.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(vertexBuffer, 0, verts);

    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(verts.length / 2, 1, 0, 0);
  }

  pass.end();
  device.queue.submit([encoder.finish()]);
}