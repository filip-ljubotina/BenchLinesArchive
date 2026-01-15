import { drag } from "d3-drag";
import { easeCubic } from "d3-ease";
import { select, selectAll } from "d3-selection";
import "d3-transition";
import * as brush from "./brush";
import {
  initCanvas2D,
  redrawCanvas2DBackgroundLines,
  redrawCanvasLines,
} from "./canvas2d";
import {
  initCanvasWebGL,
  redrawWebGLLines,
  redrawWebGLBackgroundLines,
} from "./webGL";
import { initCanvasWebGLThreeJS, redrawWebGLLinesThreeJS } from "./webGL_three";
import { initCanvasWebGLPixiJS, redrawWebGLLinesPixiJS } from "./webGL_pixi";
import {
  initCanvasWebGPU,
  redrawWebGPUBackgroundLines,
  redrawWebGPULines,
} from "./webGPU";
import {
  initCanvasWebGPUThreeJS,
  redrawWebGPULinesThreeJS,
} from "./webGPU_Three";
// import { initCanvasWebGPUOrillusion, redrawWebGPULinesOrillusion } from "./webGPU_Orillusion";
import { initCanvasWebGPUPixi, redrawWebGPUPixiLines } from "./webGPU_Pixi";
import * as context from "./contextMenu";
import {
  active,
  currWebTech,
  height,
  hoverlabel,
  key,
  padding,
  parcoords,
  refreshData,
  setActive,
  setCanvasEl,
  setData,
  setFeatures,
  setHeight,
  setHoverLabel,
  setInitDimension,
  setKey,
  setNewDataset,
  setNewFeatures,
  setPadding,
  setPaddingXaxis,
  setRefreshData,
  setSvg,
  setWidth,
  setXScales,
  setYScales,
  setYaxis,
  svg,
  width,
  yAxis,
  benchmarkData,
  setBenchmarkData,
} from "./globals";
import * as helper from "./helper";
import * as api from "./helperApiFunc";
import * as icon from "./icons/icons";
import * as toolbar from "./toolbar";
import * as utils from "./utils";
import { updateLineDataBuffer } from "./hover/hover";

declare const window: any;

//******** API ********//

//---------- Invert Functions ----------

export function invertWoTransition(dimension: string): void {
  const cleanDimensionName = utils.cleanString(dimension);
  const invertId = "#dimension_invert_" + cleanDimensionName;
  const dimensionId = "#dimension_axis_" + cleanDimensionName;
  const textElement = select(invertId);
  const currentArrowStatus = textElement.text();
  const arrow =
    currentArrowStatus === "down" ? "#arrow_image_up" : "#arrow_image_down";
  const arrowStyle =
    currentArrowStatus === "down"
      ? utils.setSize(icon.getArrowDownCursor(), 12)
      : utils.setSize(icon.getArrowUpCursor(), 12);
  textElement.text(currentArrowStatus === "down" ? "up" : "down");
  textElement.attr("href", arrow);
  textElement.style(
    "cursor",
    `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`
  );

  select("#invert_hitbox_" + cleanDimensionName).style(
    "cursor",
    `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`
  );

  select(dimensionId).call(
    yAxis[dimension].scale(
      parcoords.yScales[dimension].domain(
        parcoords.yScales[dimension].domain().reverse()
      )
    )
  );

  helper.trans(active).each(function (d: any) {
    select(this).attr("d", (d: any) => {
      return helper.linePath(d, parcoords.newFeatures);
    });
  });

  const filter = api.getFilter(dimension);
  brush.addSettingsForBrushing(dimension, helper.isInverted(dimension));
  if (helper.isInverted(dimension)) {
    brush.addInvertStatus(true, dimension, "isInverted");
  } else {
    brush.addInvertStatus(false, dimension, "isInverted");
  }
}

export function setInversionStatus(dimension: string, status: string): void {
  const cleanDimensionName = utils.cleanString(dimension);
  const invertId = "#dimension_invert_" + cleanDimensionName;
  const dimensionId = "#dimension_axis_" + cleanDimensionName;
  const textElement = select(invertId);
  const arrow =
    status === "ascending" ? "#arrow_image_up" : "#arrow_image_down";
  const arrowStyle =
    status === "ascending"
      ? utils.setSize(icon.getArrowDownCursor(), 12)
      : utils.setSize(icon.getArrowUpCursor(), 12);
  textElement.text(status === "ascending" ? "up" : "down");
  textElement.attr("href", arrow);
  textElement.style(
    "cursor",
    `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`
  );

  select("#invert_hitbox_" + cleanDimensionName).style(
    "cursor",
    `url('data:image/svg+xml,${encodeURIComponent(arrowStyle)}') 8 8 , auto`
  );

  select(dimensionId)
    .transition()
    .duration(1000)
    .call(
      yAxis[dimension].scale(
        parcoords.yScales[dimension].domain(
          parcoords.yScales[dimension].domain().reverse()
        )
      )
    )
    .ease(easeCubic);

  helper.trans(active).each(function (d: any) {
    select(this)
      .transition()
      .duration(1000)
      .attr("d", (d: any) => {
        return helper.linePath(d, parcoords.newFeatures);
      })
      .ease(easeCubic);
  });

  const filter = api.getFilter(dimension);
  brush.addSettingsForBrushing(dimension, helper.isInverted(dimension));
  if (helper.isInverted(dimension)) {
    brush.addInvertStatus(true, dimension, "isInverted");
  } else {
    brush.addInvertStatus(false, dimension, "isInverted");
  }
}

//---------- Move Functions ----------

export function moveByOne(dimension: string, direction: string): void {
  const indexOfDimension = parcoords.newFeatures.indexOf(dimension);

  const indexOfNeighbor =
    direction == "right" ? indexOfDimension - 1 : indexOfDimension + 1;

  const neighbour = parcoords.newFeatures[indexOfNeighbor];

  const pos = parcoords.xScales(dimension);
  const posNeighbour = parcoords.xScales(neighbour);

  const distance = parcoords.xScales.step();

  parcoords.dragging[dimension] =
    direction == "right" ? pos + distance : pos - distance;

  parcoords.dragging[neighbour] =
    direction == "right" ? posNeighbour - distance : posNeighbour + distance;

  if (direction == "right") {
    [
      parcoords.newFeatures[indexOfDimension],
      parcoords.newFeatures[indexOfDimension - 1],
    ] = [
      parcoords.newFeatures[indexOfDimension - 1],
      parcoords.newFeatures[indexOfDimension],
    ];
  } else {
    [
      parcoords.newFeatures[indexOfDimension + 1],
      parcoords.newFeatures[indexOfDimension],
    ] = [
      parcoords.newFeatures[indexOfDimension],
      parcoords.newFeatures[indexOfDimension + 1],
    ];
  }

  parcoords.xScales.domain(parcoords.newFeatures);

  let active = select("g.active").selectAll("path");
  let featureAxis = selectAll(".dimensions");

  active
    .transition()
    .duration(1000)
    .attr("d", function (d: any) {
      return helper.linePath(d, parcoords.newFeatures);
    })
    .ease(easeCubic);

  featureAxis
    .transition()
    .duration(1000)
    .attr("transform", function (d: { name: any }) {
      return (
        "translate(" +
        helper.position(d.name, parcoords.dragging, parcoords.xScales) +
        ")"
      );
    })
    .ease(easeCubic);

  delete parcoords.dragging[dimension];
  delete parcoords.dragging[neighbour];
}

export function move(
  dimensionA: string,
  toRightOf: boolean,
  dimensionB: string
): void {
  const indexOfDimensionA = api.getDimensionPosition(dimensionA);
  const indexOfDimensionB = api.getDimensionPosition(dimensionB);

  if (toRightOf) {
    if (indexOfDimensionA > indexOfDimensionB) {
      for (let i = indexOfDimensionA; i > indexOfDimensionB; i--) {
        if (i != indexOfDimensionB - 1) {
          swap(parcoords.newFeatures[i], parcoords.newFeatures[i - 1]);
        }
      }
    } else {
      for (let i = indexOfDimensionA; i < indexOfDimensionB; i++) {
        if (i != indexOfDimensionB - 1) {
          swap(parcoords.newFeatures[i], parcoords.newFeatures[i + 1]);
        }
      }
    }
  } else {
    if (indexOfDimensionA > indexOfDimensionB) {
      for (let i = indexOfDimensionA; i > indexOfDimensionB; i--) {
        if (i != indexOfDimensionB + 1) {
          swap(parcoords.newFeatures[i], parcoords.newFeatures[i - 1]);
        }
      }
    } else {
      for (let i = indexOfDimensionA; i < indexOfDimensionB; i++) {
        swap(parcoords.newFeatures[i], parcoords.newFeatures[i + 1]);
      }
    }
  }
}

export function swap(dimensionA: string, dimensionB: string): void {
  const positionA = parcoords.xScales(dimensionA);
  const positionB = parcoords.xScales(dimensionB);

  parcoords.dragging[dimensionA] = positionB;
  parcoords.dragging[dimensionB] = positionA;

  const indexOfDimensionA = parcoords.newFeatures.indexOf(dimensionA);
  const indexOfDimensionB = parcoords.newFeatures.indexOf(dimensionB);

  [
    parcoords.newFeatures[indexOfDimensionA],
    parcoords.newFeatures[indexOfDimensionB],
  ] = [
    parcoords.newFeatures[indexOfDimensionB],
    parcoords.newFeatures[indexOfDimensionA],
  ];

  parcoords.xScales.domain(parcoords.newFeatures);

  let active = select("g.active").selectAll("path");
  let featureAxis = selectAll(".dimensions");

  active
    .transition()
    .duration(1000)
    .attr("d", (d: any) => {
      return helper.linePath(d, parcoords.newFeatures);
    });

  featureAxis
    .transition()
    .duration(1000)
    .attr("transform", (d: { name: any }) => {
      return (
        "translate(" +
        helper.position(d.name, parcoords.dragging, parcoords.xScales) +
        ")"
      );
    })
    .ease(easeCubic);

  delete parcoords.dragging[dimensionA];
  delete parcoords.dragging[dimensionB];
}

//---------- Selection Functions ----------

export function getSelected(): string[] {
  let selected = [];

  const records = api.getAllRecords();
  for (let i = 0; i < records.length; i++) {
    let isselected = api.isSelected(records[i]);
    if (isselected) {
      selected.push(records[i]);
    }
  }
  return selected;
}

export function setSelection(records: string[]): void {
  // console.log("Triggered setSelection")
  for (let i = 0; i < records.length; i++) {
    let stroke = select("#" + utils.cleanString(records[i])).style("stroke");
    if (stroke !== "lightgrey") {
      select("#" + utils.cleanString(records[i]))
        .classed("selected", true)
        .transition()
        .style("stroke", "rgba(255, 165, 0, 1)");
      //const data = parcoords.data.find(d => d.Name === records[i]);
      //helper.createToolTipForValues(data, String(i));
    }
  }
}

export function toggleSelection(record: string): void {
  // console.log("Triggered toggleSelection for record:", record);
  const selected = api.isSelected(record);
  if (selected) {
    setUnselected(record);
  } else {
    setSelected(record);
  }
}

export function setSelected(record: string): void {
  // console.log("Triggered setSelected for record:", record);
  let selectableLines = [];
  selectableLines.push(record);
  setSelection(selectableLines);
}

export function setUnselected(record: string): void {
  // console.log("Triggered setUnselected for record:", record);
  selectAll("#" + utils.cleanString(record))
    .classed("selected", false)
    .transition()
    .style("stroke", "rgba(0, 129, 175, 0.5)");
}

export function isRecordInactive(record: string): boolean {
  // console.log("Triggered isRecordInactive for record:", record);
  const stroke = select("#" + utils.cleanString(record));
  let node = stroke.node();
  let style = node.style.stroke;
  return style === "rgba(211, 211, 211, 0.4)" ? true : false;
}

//---------- Selection Functions With IDs ----------

export function setSelectionWithId(recordIds: string[]): void {
  // console.log("Triggered setSelectionWithId for recordIds:", recordIds);
  let records: string[] = [];
  for (let i = 0; i < recordIds.length; i++) {
    let record = getRecordWithId(recordIds[i]);
    records.push(record);
  }
  setSelection(records);
}

export function isSelectedWithRecordId(recordId: string): boolean {
  // console.log("Triggered isSelectedWithRecordId for recordId:", recordId);
  let record = getRecordWithId(recordId);
  return api.isSelected(record);
}

export function getRecordWithId(recordId: string): string {
  // console.log("Triggered getRecordWithId for recordId:", recordId);
  const item = parcoords.currentPosOfDims.find(
    (object: { recordId: string }) => object.recordId == recordId
  );
  return item.key;
}

export function toggleSelectionWithId(recordId: string): void {
  // console.log("Triggered toggleSelectionWithId for recordId:", recordId);
  const record = getRecordWithId(recordId);
  toggleSelection(record);
}

export function setSelectedWithId(recordId: string): void {
  // console.log("Triggered setSelectedWithId for recordId:", recordId);
  const record = getRecordWithId(recordId);
  setSelected(record);
}

export function setUnselectedWithId(recordId: string): void {
  // console.log("Triggered setUnselectedWithId for recordId:", recordId);
  const record = getRecordWithId(recordId);
  setUnselected(record);
}

// ===== Canvas rendering support (canvas for lines, SVG for axes/UI) =====

// ===== End canvas support =====

//---------- IO Functions ----------

function computeMargins(
  labels = [],
  {
    font = "12px Verdana, sans-serif",
    top = 0,
    bottom = 0,
    extraLeft = 0,
    extraRight = 0,
  } = {}
) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = font;

  let maxWidth = ctx.measureText(String(labels[labels.length - 1])).width;

  const left = Math.ceil(maxWidth) + extraLeft;
  const right = Math.ceil(maxWidth / 2) + extraRight;

  return { top, right, bottom, left };
}

function createHiDPICanvas(plot: any, w: number, h: number) {
  // console.log("Triggered createHiDPICanvas with width:", w, "and height:", h);
  const el = plot
    .append("canvas")
    .attr("id", "pc_canvas")
    .style("position", "absolute")
    .style("left", "0px")
    .style("top", "0px")
    .style("pointer-events", "none")
    .node() as HTMLCanvasElement;

  const dpr = window.devicePixelRatio || 1;
  el.width = Math.floor(w * dpr);
  el.height = Math.floor(h * dpr);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  setCanvasEl(el);
  return { dpr };
}

export function recreateCanvas() {
  // console.log("Triggered recreateCanvas");
  const plot = select("#plotArea");
  plot.select("#pc_canvas").remove();
  const { dpr } = createHiDPICanvas(plot, width, 360);
  // if (currWebTech === "Canvas2D") initCanvas2D(dpr);
}

export function redrawPolylines(dataset: any[], parcoords: any) {
  switch (currWebTech) {
    case "Canvas2D":
      redrawCanvasLines(dataset, parcoords);
      break;
    case "SVG-DOM":
      redrawSvgLines(svg, dataset, parcoords);
      break;
    case "WebGL":
      redrawWebGLLines(dataset, parcoords);
      break;
    case "Three WebGL":
      redrawWebGLLinesThreeJS(dataset, parcoords);
      break;
    case "Pixi WebGL":
      redrawWebGLLinesPixiJS(dataset, parcoords);
      break;
    case "WebGPU":
      redrawWebGPULines(dataset, parcoords);
      break;
    case "Three WebGPU":
      redrawWebGPULinesThreeJS(dataset, parcoords);
      break;
    // case "WebGPU-Orillusion":
    //   redrawWebGPULinesOrillusion(dataset, parcoords);
    //   break;
    case "Pixi WebGPU":
      redrawWebGPUPixiLines(dataset, parcoords);
      break;
  }
}

export function redrawBackgroundPolylines(dataset: any[], parcoords: any) {
  switch (currWebTech) {
    case "Canvas2D":
      redrawCanvas2DBackgroundLines(dataset, parcoords);
      break;
    case "WebGL":
      redrawWebGLBackgroundLines(dataset, parcoords);
      break;
    // case "WebGLThree":
    //   redrawWebGLLinesThreeJS(dataset, parcoords);
    //   break;
    // // case "WebGLPixi":
    // //   redrawWebGLLinesPixiJS(dataset, parcoords);
    // //   break;
    case "WebGPU":
      redrawWebGPUBackgroundLines(dataset, parcoords);
      break;
    // case "WebGPU-Three":
    //   redrawWebGPULinesThreeJS(dataset, parcoords);
    //   break;
    // // case "WebGPU-Orillusion":
    // //   redrawWebGPULinesOrillusion(dataset, parcoords);
    // //   break;
    // case "WebGPU-Pixi":
    //   redrawWebGPUPixiLines(dataset, parcoords);
    //   break;
  }
}

export async function setupTechnology(
  tech: string,
  dataset: any[],
  parcoords: any
) {
  const dpr = window.devicePixelRatio || 1;

  switch (tech) {
    case "Canvas2D":
      recreateCanvas();
      initCanvas2D(dpr, dataset, parcoords);
      break;
    case "SVG-DOM":
      svg
        .on("contextmenu", (event: any) => {
          event.stopPropagation();
          event.preventDefault();
        })
        .on("mouseenter", () => helper.cleanTooltip())
        .on("click", () => clearSelection())
        .on("mousedown.selection", (event: any) => event.preventDefault());
      break;
    case "WebGL":
      recreateCanvas();
      initCanvasWebGL(dataset, parcoords);
      break;
    case "WebGLThree":
      recreateCanvas();
      await initCanvasWebGLThreeJS(dataset, parcoords);
      break;
    case "WebGLPixi":
      recreateCanvas();
      await initCanvasWebGLPixiJS();
      break;
    case "WebGPU":
      recreateCanvas();
      await initCanvasWebGPU(dataset, parcoords);
      break;
    case "WebGPU-Three":
      recreateCanvas();
      await initCanvasWebGPUThreeJS();
      break;
    // case "WebGPU-Orillusion":
    //   recreateCanvas();
    //   await initCanvasWebGPUOrillusion();
    //   break;
    case "WebGPU-Pixi":
      recreateCanvas();
      await initCanvasWebGPUPixi();
      break;
  }
}

export async function runPolylineBenchmark(
  iters: number
): Promise<number | null> {
  if (!iters || iters <= 0) {
    console.warn("runPolylineBenchmark: iterations not set or <= 0");
    return null;
  }

  // Setup ONCE before benchmarking
  await setupTechnology(currWebTech, parcoords.newDataset, parcoords);
  let totalTime = 0;

  for (let i = 0; i < iters; i++) {
    const t0 = performance.now();
    redrawPolylines(parcoords.newDataset, parcoords);
    const t1 = performance.now();

    totalTime += t1 - t0;
  }

  const avg = totalTime / iters;

  setBenchmarkData({
    numOfIterations: iters,
    avgSpeedTime: avg,
  });

  return avg;
}

export function drawChart(content: any[]): void {
  // console.log("Triggered  ");
  setRefreshData(structuredClone(content));
  deleteChart();

  const newFeatures = (content as any).columns.reverse();
  setUpParcoordData(content, newFeatures as any);

  const w = width;
  const h = 360;

  // container
  let wrapper = select<HTMLElement, unknown>("#parallelcoords");
  if (wrapper.empty()) {
    wrapper = select(document.body).append("div").attr("id", "parallelcoords");
  }

  wrapper
    .style("display", "block")
    .style("width", "100%")
    .style("margin", "0")
    .style("padding", "0")
    .style("text-align", "left");

  // chart wrapper + toolbar
  const chartWrapper = wrapper
    .append("div")
    .attr("id", "chartWrapper")
    .style("display", "block")
    .style("width", "100%");

  chartWrapper
    .append("div")
    .attr("id", "toolbarRow")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("align-items", "center")
    .style("justify-content", "flex-start")
    .style("margin", "1.2rem 0 0 1rem");

  toolbar.createToolbar(parcoords.newDataset);

  // plot area
  const plot = chartWrapper
    .append("div")
    .attr("id", "plotArea")
    .style("position", "relative")
    .style("width", `${w}px`)
    .style("height", `${h}px`);

  const res = createHiDPICanvas(plot, w, h);
  const dpr = res.dpr;

  // svg
  setSvg(
    plot
      .append("svg")
      .attr("id", "pc_svg")
      .attr("viewBox", `0 0 ${w} ${h}`)
      .attr("font-family", "Verdana, sans-serif")
      .attr("width", w)
      .attr("height", h)
      .style("position", "absolute")
      .style("left", "0px")
      .style("top", "0px")
      .style("display", "block")
  );

  setDefsForIcons();
  setFeatureAxis(svg, yAxis, parcoords, w, padding);

  switch (currWebTech) {
    case "Canvas2D":
      initCanvas2D(dpr, parcoords.newDataset, parcoords);
      redrawBackgroundPolylines(parcoords.data, parcoords);
      redrawCanvasLines(parcoords.newDataset, parcoords);
      updateLineDataBuffer(parcoords.newDataset, parcoords);
      break;
    case "SVG-DOM":
      // The setActivePathLines function call is causing interactivity in SVG mode
      setActive(setActivePathLines(svg, content, parcoords));
      svg
        .on("contextmenu", (event: any) => {
          event.stopPropagation();
          event.preventDefault();
        })
        .on("mouseenter", () => helper.cleanTooltip())
        .on("click", () => clearSelection())
        .on("mousedown.selection", (event: any) => event.preventDefault());
      break;
    case "WebGL":
      initCanvasWebGL(parcoords.newDataset, parcoords);
      redrawBackgroundPolylines(parcoords.data, parcoords);
      redrawWebGLLines(parcoords.newDataset, parcoords);
      updateLineDataBuffer(parcoords.newDataset, parcoords);
      break;
    case "Three WebGL":
      initCanvasWebGLThreeJS(parcoords.newDataset, parcoords)
        .then(() => {
          redrawWebGLLinesThreeJS(parcoords.newDataset, parcoords);
        })
        .catch((err) => console.error("WebGLThree init failed:", err));
      break;
    case "Pixi WebGL":
      initCanvasWebGLPixiJS()
        .then(() => {
          redrawWebGLLinesPixiJS(parcoords.newDataset, parcoords);
        })
        .catch((err) => console.error("WebGLPixi init failed:", err));
      break;
    case "WebGPU":
      initCanvasWebGPU(parcoords.newDataset, parcoords)
        .then(() => {
          redrawBackgroundPolylines(parcoords.data, parcoords);
          redrawWebGPULines(parcoords.newDataset, parcoords);
          updateLineDataBuffer(parcoords.newDataset, parcoords);
        })
        .catch((err) => console.error("WebGPU init failed:", err));
      break;
    case "Three WebGPU":
      initCanvasWebGPUThreeJS()
        .then(() => {
          redrawWebGPULinesThreeJS(parcoords.newDataset, parcoords);
        })
        .catch((err) => console.error("WebGPU-Three init failed:", err));
      break;
    case "Pixi WebGPU":
      initCanvasWebGPUPixi()
        .then(() => {
          redrawWebGPUPixiLines(parcoords.newDataset, parcoords);
        })
        .catch((err) => console.error("WebGPU-Pixi init failed:", err));
      break;
  }

  (window as any).onclick = () => {
    select("#contextmenu").style("display", "none");
    select("#contextmenuRecords").style("display", "none");
  };
}

export function reset() {
  // console.log("Triggered reset");
  drawChart(refreshData);
  let toolbar = select("#toolbar");
  toolbar
    .style("max-width", "12.5rem")
    .style("opacity", "1")
    .style("pointer-events", "auto");

  let toggleButton = select("#toggleButton");
  toggleButton.attr("title", "Collapse toolbar");

  toggleButton.html(icon.getCollapseToolbarIcon());
}

export function refresh(): void {
  const dimensions = api.getAllVisibleDimensionNames();
  for (let i = 0; i < dimensions.length; i++) {
    api.show(dimensions[i]);
  }
}

export function deleteChart(): void {
  // console.log("Triggered deleteChart");
  const wrapper = select("#parallelcoords");
  wrapper.selectAll("*").remove();
  select("#pc_svg").remove();
  select("#contextmenu").remove();
  select("#contextmenuRecords").remove();
  select("#modalFilter").remove();
  select("#modalRange").remove();
  select("#refreshButton").remove();
  select("#showData").remove();
  select("#toolbarRow").remove();
  parcoords.currentPosOfDims.length = 0;
  select("#pc_canvas").remove();
  setCanvasEl(null);
}

//---------- Helper Functions ----------

// ---------- Needed for Built-In Interactivity Functions ---------- //

function setUpParcoordData(data: any, newFeatures: []): void {
  // console.log("Triggered setUpParcoordData");
  setPadding(60);
  setPaddingXaxis(60);

  if (newFeatures.length <= 6) {
    setWidth(newFeatures.length * 180);
  } else {
    setWidth(newFeatures.length * 100);
  }

  setHeight(400);
  setInitDimension(newFeatures);

  const label = newFeatures[newFeatures.length - 1];

  data.sort((a: { [x: string]: any }, b: { [x: string]: any }) => {
    const item1 = a[label];
    const item2 = b[label];

    if (item1 < item2) {
      return -1;
    } else if (item1 > item2) {
      return 1;
    } else {
      return 0;
    }
  });

  let dataset = helper.prepareData(data, newFeatures);

  setFeatures(dataset[0]);
  setNewDataset(dataset[1]);

  setXScales(helper.setupXScales(dataset[0]));
  setYScales(helper.setupYScales(dataset[0], dataset[1]));
  setNewFeatures(newFeatures);
  setData(data);

  for (let i = 0; i < newFeatures.length; i++) {
    let max: number;
    let min: number;
    if (
      isNaN(
        Math.max(
          ...parcoords.newDataset.map(
            (o: { [x: string]: any }) => o[newFeatures[i]]
          )
        )
      )
    ) {
      const sorted = [
        ...parcoords.newDataset.map(
          (o: { [x: string]: any }) => o[newFeatures[i]]
        ),
      ].sort((a, b) => a.localeCompare(b));
      min = sorted[sorted.length - 1];
      max = sorted[0];
    } else {
      max = Math.max(
        ...parcoords.newDataset.map(
          (o: { [x: string]: any }) => o[newFeatures[i]]
        )
      );
      min = Math.min(
        ...parcoords.newDataset.map(
          (o: { [x: string]: any }) => o[newFeatures[i]]
        )
      );
    }
    const ranges = api.getDimensionRange(newFeatures[i]);
    parcoords.currentPosOfDims.push({
      key: newFeatures[i],
      top: 80,
      bottom: 320,
      isInverted: false,
      index: i,
      min: min,
      max: max,
      sigDig: 0,
      currentRangeTop: ranges[1],
      currentRangeBottom: ranges[0],
      currentFilterBottom: ranges[0],
      currentFilterTop: ranges[1],
    });
  }
  const hiddenDims = api.getAllHiddenDimensionNames();

  setYaxis(
    helper.setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims)
  );

  let counter = 0;
  parcoords.features.map((x: { name: string | number }) => {
    let numberOfDigs = 0;
    let values = parcoords.newDataset.map(
      (o: { [x: string]: any }) => o[x.name]
    );
    for (let i = 0; i < values.length; i++) {
      if (!isNaN(values[i])) {
        const tempNumberOfDigs = utils.digits(Number(values[i]));
        if (tempNumberOfDigs > numberOfDigs) {
          numberOfDigs = tempNumberOfDigs;
        }
      } else {
        continue;
      }
    }
    utils.addNumberOfDigs(
      numberOfDigs,
      parcoords.currentPosOfDims,
      x.name,
      "sigDig"
    );
    utils.addNumberOfDigs(
      counter,
      parcoords.currentPosOfDims,
      x.name,
      "recordId"
    );
    counter = counter + 1;
  });

  setHoverLabel(api.getAllVisibleDimensionNames()[0]);
}

const tooltipPath = select("body")
  .append("div")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("pointer-events", "none")
  .style("background", "rgba(0,0,0,0.8)")
  .style("color", "#fff")
  .style("padding", "0.5rem")
  .style("border-radius", "0.25rem")
  .style("font-size", "0.75rem")
  .style("z-index", "1000");

const tooltipTest = select("body")
  .append("div")
  .attr("id", "tooltipTest")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("pointer-events", "none")
  .style("background", "lightgrey")
  .style("padding", "0.2rem")
  .style("border", "1px solid gray")
  .style("border-radius", "0.2rem")
  .style("white-space", "pre-line")
  .style("font-size", "0.75rem")
  .style("z-index", "1000");

let delay = null;
let cleanupTimeout = null;

const clearExistingDelay = () => {
  if (delay) {
    clearTimeout(delay);
    delay = null;
  }
};

const handlePointerEnter = (event: any, d: any) => {
  // console.log("Triggered handlePointerEnter with event:", event, "and data:", d);
  clearExistingDelay();
  doNotHighlight();

  const data = helper.getAllPointerEventsData(event);

  highlight(data);
  helper.createTooltipForPathLine(data, tooltipTest, event);

  const datasetMap = new Map();
  parcoords.newDataset.forEach((record: { [x: string]: any }) => {
    datasetMap.set(record[hoverlabel], record);
  });

  data.forEach((item: any, i: number) => {
    const rec = datasetMap.get(item);
    if (rec) {
      helper.createToolTipForValues(rec, rec.id ?? String(i));
    }
  });
};

const handlePointerLeaveOrOut = () => {
  doNotHighlight();
  clearExistingDelay();
  tooltipPath.style("visibility", "hidden");
  select("#tooltipTest").style("visibility", "hidden");
  helper.cleanTooltip();
};

select("#pc_svg").on("mouseleave", () => {
  if (cleanupTimeout) clearTimeout(cleanupTimeout);
  cleanupTimeout = setTimeout(() => {
    doNotHighlight();
    clearExistingDelay();
    tooltipPath.style("visibility", "hidden");
    select("#tooltipTest").style("visibility", "hidden");
    helper.cleanTooltip();
  }, 100);
});

document.addEventListener("mousemove", (e) => {
  const chartBounds = document.querySelector("#pc_svg").getBoundingClientRect();
  if (
    e.clientX < chartBounds.left ||
    e.clientX > chartBounds.right ||
    e.clientY < chartBounds.top ||
    e.clientY > chartBounds.bottom
  ) {
    handlePointerLeaveOrOut();
  }
});

function setActivePathLines(
  svg: any,
  content: any,
  parcoords: {
    xScales: any;
    yScales: {};
    dragging: {};
    dragPosStart: {};
    currentPosOfDims: any[];
    newFeatures: any;
    features: any[];
    newDataset: any[];
  }
): any {
  // console.log("Triggered setActivePathLines")
  let contextMenu = select("#parallelcoords")
    .append("g")
    .attr("id", "contextmenuRecords")
    .style("position", "absolute")
    .style("display", "none");

  contextMenu
    .append("div")
    .attr("id", "selectRecord")
    .attr("class", "contextmenu")
    .text("Select Record");
  contextMenu
    .append("div")
    .attr("id", "unSelectRecord")
    .attr("class", "contextmenu")
    .text("Unselect Record");
  contextMenu
    .append("div")
    .attr("id", "toggleRecord")
    .attr("class", "contextmenu")
    .text("Toggle Record");
  contextMenu
    .append("div")
    .attr("id", "addSelection")
    .attr("class", "contextmenu")
    .text("Add to Selection");
  contextMenu
    .append("div")
    .attr("id", "removeSelection")
    .attr("class", "contextmenu")
    .text("Remove from Selection");

  let active = svg
    .append("g")
    .attr("class", "active")
    .selectAll("path")
    .data(content)
    .enter()
    .append("path")
    .attr("class", (d: { [x: string]: string }) => {
      const keys = Object.keys(d);
      setKey(keys[0]);
      const selected_value = utils.cleanString(d[key]);
      return "line " + selected_value;
    })
    .attr("id", (d: { [x: string]: string }) => {
      return utils.cleanString(d[key]);
    })
    .each(function (d: any) {
      select(this).attr("d", helper.linePath(d, parcoords.newFeatures));
    })
    .style("pointer-events", "stroke")
    .style("stroke", "rgba(0, 129, 175, 0.5)")
    .style("stroke-width", "0.12rem")
    .style("fill", "none")
    .on("pointerenter", handlePointerEnter)
    .on("pointerleave", handlePointerLeaveOrOut)
    .on("pointerout", handlePointerLeaveOrOut)
    .on("mouseenter", handlePointerEnter)
    .on("mouseout", handlePointerLeaveOrOut)
    .on("mouseleave", handlePointerLeaveOrOut)
    .on(
      "click",
      function (
        event: {
          metaKey: any;
          shiftKey: any;
          ctrlKey: any;
          stopPropagation: () => void;
        },
        d: any
      ) {
        const data = helper.getAllPointerEventsData(event);
        const selectedRecords = getSelected();

        if (event.metaKey || event.shiftKey) {
          data.forEach((record: string) => {
            if (selectedRecords.includes(record)) {
              setUnselected(record);
            } else {
              selectRecord([record]);
            }
          });
        } else if (event.ctrlKey) {
          data.forEach((record: string) => {
            toggleSelection(record);
          });
        } else {
          clearSelection();
          selectRecord(data);
        }
        event.stopPropagation();
      }
    )
    .on("contextmenu", function (event: any, d: any) {
      setContextMenuForActiceRecords(contextMenu, event, d);
    });

  return active;
}

export function redrawSvgLines(svg: any, content: any[], parcoords: any) {
  // console.log("Redrawing SVG lines");
  svg.select("#contextmenuRecords").remove();
  svg.select("g.active").remove();
  // The following line is causing interactivity in SVG mode
  setActivePathLines(svg, content, parcoords);
}

const delay1 = 50;
export const throttleShowValues = utils.throttle(
  helper.createToolTipForValues,
  delay1
);

function setContextMenuForActiceRecords(
  contextMenu: any,
  event: any,
  d: any
): void {
  // console.log("Triggered setContextMenuForActiceRecords with event:", event, "and data:", d);
  const container = document.querySelector("#parallelcoords");
  const rect = container.getBoundingClientRect();

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  contextMenu
    .style("left", x + "px")
    .style("top", y + "px")
    .style("display", "block")
    .style("font-size", "0.75rem")
    .style("border", 0.08 + "rem solid gray")
    .style("border-radius", 0.1 + "rem")
    .style("margin", 0.5 + "rem")
    .style("padding", 0.35 + "rem")
    .style("background-color", "white")
    .style("margin-left", 0.5 + "rem")
    .style("cursor", "pointer")
    .on("click", (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
    });

  select("#selectRecord").on(
    "click",
    (event: { stopPropagation: () => void }) => {
      setSelected(d[hoverlabel]);
      event.stopPropagation();
      select("#contextmenuRecords").style("display", "none");
    }
  );

  select("#unSelectRecord").on(
    "click",
    (event: { stopPropagation: () => void }) => {
      setUnselected(d[hoverlabel]);
      event.stopPropagation();
      select("#contextmenuRecords").style("display", "none");
    }
  );

  select("#toggleRecord")
    .style("border-top", "0.08rem lightgrey solid")
    .on("click", (event: { stopPropagation: () => void }) => {
      toggleSelection(d[hoverlabel]);
      event.stopPropagation();
      select("#contextmenuRecords").style("display", "none");
    });

  select("#addSelection")
    .style("border-top", "0.08rem lightgrey solid")
    .on("click", (event: { stopPropagation: () => void }) => {
      let selectedRecords = [];
      selectedRecords = getSelected();
      selectedRecords.push(d[hoverlabel]);
      setSelection(selectedRecords);
      event.stopPropagation();
      select("#contextmenuRecords").style("display", "none");
    });

  select("#removeSelection").on(
    "click",
    (event: { stopPropagation: () => void }) => {
      setUnselected(d[hoverlabel]);
      event.stopPropagation();
      select("#contextmenuRecords").style("display", "none");
    }
  );
  selectAll(".contextmenu").style("padding", 0.35 + "rem");
  event.preventDefault();
}

function setFeatureAxis(
  svg: any,
  yAxis: any,
  parcoords: {
    xScales: any;
    yScales: {};
    dragging: {};
    dragPosStart: {};
    currentPosOfDims: any[];
    newFeatures: any;
    features: any[];
    newDataset: any[];
  },
  width: any,
  padding: any
): void {
  let featureAxis = svg
    .selectAll("g.feature")
    .data(parcoords.features)
    .enter()
    .append("g")
    .attr("class", "dimensions")
    .attr(
      "transform",
      (d: { name: any }) => "translate(" + parcoords.xScales(d.name) + ")"
    );

  let tooltipValuesLabel = select("body")
    .append("g")
    .style("position", "absolute")
    .style("visibility", "hidden");

  featureAxis.append("g").each(function (d: { name: string }) {
    const processedDimensionName = utils.cleanString(d.name);
    select(this)
      .attr("id", "dimension_axis_" + processedDimensionName)
      .call(yAxis[d.name]);
    /*.on('mouseenter', function (event, d) {
                    tooltipValuesLabel.text('');
                    tooltipValuesLabel.style('top', event.clientY / 16 + 'rem').style('left', event.clientX / 16 + 'rem');
                    tooltipValuesLabel.style('font-size', '0.75rem').style('border', 0.08 + 'rem solid gray')
                        .style('border-radius', 0.1 + 'rem').style('margin', 0.5 + 'rem')
                        .style('padding', 0.12 + 'rem')
                        .style('background-color', 'lightgrey').style('margin-left', 0.5 + 'rem');
                    return tooltipValuesLabel.style('visibility', 'hidden');
                })
                .on('mouseout', function () {
                    return tooltipValuesLabel.style('visibility', 'hidden');
                })*/
  });

  let tickElements = document.querySelectorAll("g.tick");
  tickElements.forEach((gElement) => {
    let transformValue = gElement.getAttribute("transform");
    let yValue = transformValue.match(/translate\(0,([^\)]+)\)/);
    if (yValue) {
      let originalValue = parseFloat(yValue[1]);
      let shortenedValue = originalValue.toFixed(4);
      gElement.setAttribute("transform", `translate(0,${shortenedValue})`);
    }
  });

  let tooltipValues = select("body")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden");

  let tooltipValuesTop = select("#parallelcoords")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden");

  let tooltipValuesDown = select("#parallelcoords")
    .append("div")
    .style("position", "absolute")
    .style("visibility", "hidden");

  const brushOverlay = svg
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "transparent")
    .style("pointer-events", "none");

  setBrushDown(featureAxis, parcoords, tooltipValues, brushOverlay);

  setBrushUp(featureAxis, parcoords, tooltipValues, brushOverlay);

  setRectToDrag(
    featureAxis,
    svg,
    parcoords,
    tooltipValuesTop,
    tooltipValuesDown
  );

  setMarker(featureAxis);

  context.setContextMenu(featureAxis);

  setInvertIcon(featureAxis, padding);
}

export function showMarker(dimension: string) {
  // console.log("Triggered showMarker for dimension:", dimension);
  const cleanDimensionName = utils.cleanString(dimension);
  select("#marker_" + cleanDimensionName).attr("opacity", 1);
}

export function hideMarker(dimension: string) {
  // console.log("Triggered hideMarker for dimension:", dimension);
  const cleanDimensionName = utils.cleanString(dimension);
  select("#marker_" + cleanDimensionName).attr("opacity", 0);
}

function setDefsForIcons(): void {
  // console.log("Triggered setDefsForIcons");
  const svgContainer = svg;
  let defs = svgContainer.select("defs");
  defs = svgContainer.append("defs");

  defs
    .append("image")
    .attr("id", "arrow_image_up")
    .attr("width", 12)
    .attr("height", 12)
    .attr("href", "data:image/svg+xml;," + icon.getArrowUp());

  defs
    .append("image")
    .attr("id", "arrow_image_down")
    .attr("width", 12)
    .attr("height", 12)
    .attr("href", "data:image/svg+xml;," + icon.getArrowDown());

  defs
    .append("image")
    .attr("id", "brush_image_top")
    .attr("width", 14)
    .attr("height", 10)
    .attr("href", "data:image/svg+xml;," + icon.getArrowTop());

  defs
    .append("image")
    .attr("id", "brush_image_bottom")
    .attr("width", 14)
    .attr("height", 10)
    .attr("href", "data:image/svg+xml;," + icon.getArrowBottom());

  defs
    .append("image")
    .attr("id", "brush_image_top_active")
    .attr("width", 14)
    .attr("height", 10)
    .attr("href", "data:image/svg+xml;," + icon.getArrowTopActive());

  defs
    .append("image")
    .attr("id", "brush_image_bottom_active")
    .attr("width", 14)
    .attr("height", 10)
    .attr("href", "data:image/svg+xml;," + icon.getArrowBottomActive());
}

// Hovering

let currentlyHighlightedItems = [];

function highlight(data: any[]) {
  const cleanedItems = data.map((item: string) =>
    utils.cleanString(item).replace(/[.,]/g, "")
  );

  currentlyHighlightedItems = [...cleanedItems];

  cleanedItems.forEach((item: string) => {
    select("#" + item)
      .transition()
      .duration(5)
      .style("stroke", "rgba(200, 28, 38, 0.7)");
  });
}

function doNotHighlight() {
  if (!currentlyHighlightedItems.length) return;

  currentlyHighlightedItems.forEach((item) => {
    const line = select("#" + item);
    if (line.classed("selected")) {
      line.transition().style("stroke", "rgba(255, 165, 0, 1)");
    } else {
      line.transition().style("stroke", "rgba(0, 129, 175, 0.5)");
    }
  });

  currentlyHighlightedItems = [];
}

// Selecting

function selectRecord(linePaths: any): void {
  for (let i = 0; i < linePaths.length; i++) {
    setSelected(linePaths[i]);
  }
}

function clearSelection(): void {
  const selectedRecords = getSelected();
  selectedRecords.forEach((element) => {
    select("#" + utils.cleanString(element))
      .classed("selected", false)
      .transition()
      .style("stroke", "rgba(0, 129, 175, 0.5)");
  });
}

function setInvertIcon(featureAxis: any, padding: number): void {
  let value = (80 / 1.5).toFixed(4);

  const svg = featureAxis
    .append("svg")
    .attr("x", -6 - 22)
    .attr("y", Number(value) - 22)
    .attr("width", 44)
    .attr("height", 22)
    .style("overflow", "visible");

  svg
    .append("rect")
    .attr("id", "invert_hitbox")
    .attr("class", "hitbox")
    .attr("x", 6)
    .attr("y", 20)
    .attr("width", 44)
    .attr("height", 15)
    .attr("rx", 6)
    .attr("ry", 6)
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .each(function (d: { name: string }) {
      const processed = utils.cleanString(d.name);
      select(this)
        .attr("id", "invert_hitbox_" + processed)
        .style(
          "cursor",
          `url('data:image/svg+xml,${utils.setSize(
            encodeURIComponent(icon.getArrowDownCursor()),
            12
          )}') 8 8, auto`
        );
    });

  svg
    .append("use")
    .attr("href", "#arrow_image_up")
    .attr("width", 12)
    .attr("height", 12)
    .attr("x", 22.5)
    .attr("y", Number(value) - 33)
    .each(function (d: { name: string }) {
      const processed = utils.cleanString(d.name);
      select(this)
        .attr("id", "dimension_invert_" + processed)
        .text("up")
        .style(
          "cursor",
          `url('data:image/svg+xml,${utils.setSize(
            encodeURIComponent(icon.getArrowDownCursor()),
            12
          )}') 8 8, auto`
        );
    });

  svg.on("click", (event: any, d: { name: string }) => {
    api.invert(d.name);
    event.stopPropagation();
  });
}

function setMarker(featureAxis: any): void {
  featureAxis.each(function (d: { name: string }) {
    const processedDimensionName = utils.cleanString(d.name);
    select(this)
      .append("g")
      .attr("class", "marker")
      .append("rect")
      .attr("id", "marker_" + processedDimensionName)
      .attr("width", 44)
      .attr("height", 305)
      .attr("x", -22)
      .attr("y", 30)
      .attr("fill", "none")
      .attr("stroke", "rgb(228, 90, 15)")
      .attr("stroke-width", "0.1rem")
      .attr("opacity", "0");
  });
}

// Brushing

function setRectToDrag(
  featureAxis: any,
  svg: any,
  parcoords: {
    xScales: any;
    yScales: {};
    dragging: {};
    dragPosStart: {};
    currentPosOfDims: any[];
    newFeatures: any;
    features: any[];
    newDataset: any[];
  },
  tooltipValuesTop: any,
  tooltipValuesDown: any
): void {
  let delta: any;
  featureAxis.each(function (d: { name: string }) {
    const processedDimensionName = utils.cleanString(d.name);
    select(this)
      .append("g")
      .attr("class", "rect")
      .append("rect")
      .attr("id", "rect_" + processedDimensionName)
      .attr("width", 12)
      .attr("height", 240)
      .attr("x", -6)
      .attr("y", 80)
      .attr("fill", "rgb(242, 242, 76)")
      .attr("opacity", "0.5")
      .style("cursor", "default")
      .call(
        drag()
          .on("drag", (event: any, d: any) => {
            if (parcoords.newFeatures.length > 25) {
              brush.throttleDragAndBrush(
                processedDimensionName,
                d,
                event,
                delta,
                tooltipValuesTop,
                tooltipValuesDown,
                window
              );
            } else {
              brush.dragAndBrush(
                processedDimensionName,
                d,
                event,
                delta,
                tooltipValuesTop,
                tooltipValuesDown,
                window
              );
            }
          })
          .on("start", (event: { y: number }, d: any) => {
            let current = select("#rect_" + processedDimensionName);
            delta = current.attr("y") - event.y;
          })
          .on("end", () => {
            tooltipValuesTop.style("visibility", "hidden");
            tooltipValuesDown.style("visibility", "hidden");
          })
      );
  });
}

function setBrushUp(
  featureAxis: any,
  parcoords: {
    xScales: any;
    yScales: {};
    dragging: {};
    dragPosStart: {};
    currentPosOfDims: any[];
    newFeatures: any;
    features: any[];
    newDataset: any[];
  },
  tooltipValues: any,
  brushOverlay: any
): void {
  featureAxis.each(function (d: { name: string }) {
    const processedDimensionName = utils.cleanString(d.name);
    const g = select(this)
      .append("g")
      .attr("class", "brush_" + processedDimensionName);

    const iconY = 320,
      iconX = -7,
      iconW = 14,
      iconH = 10;

    g.append("use")
      .attr("id", "triangle_up_" + processedDimensionName)
      .attr("x", iconX)
      .attr("y", iconY)
      .attr("width", iconW)
      .attr("height", iconH)
      .attr("href", "#brush_image_top")
      .attr("pointer-events", "none")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowTopCursor()),
          13
        )}') 8 8, auto`
      );

    const hit = g
      .append("rect")
      .attr("class", "handle-hitbox")
      .attr("id", "triangle_up_hit" + processedDimensionName)
      .attr("x", -15)
      .attr("y", iconY)
      .attr("width", 30)
      .attr("height", 30)
      .style("fill", "transparent")
      .style("pointer-events", "all")
      .style("touch-action", "none")
      .style("-webkit-user-select", "none")
      .style("user-select", "none")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowTopCursor()),
          13
        )}') 8 8, auto`
      );

    function cleanup() {
      brushOverlay.style("pointer-events", "none").lower();
      tooltipValues.style("visibility", "hidden");
    }

    const makeDrag = () =>
      drag()
        .container(function () {
          return (this as any).ownerSVGElement || this;
        })
        .on("start", () => {
          brushOverlay.raise().style("pointer-events", "all");
          g.select("#triangle_up_" + processedDimensionName).raise();
          g.selectAll(".handle-hitbox").raise();
        })
        .on("drag", (event: any, dd: any) => {
          if (parcoords.newFeatures.length > 25) {
            brush.throttleBrushUp(
              processedDimensionName,
              event,
              dd,
              tooltipValues,
              window
            );
          } else {
            brush.brushUp(
              processedDimensionName,
              event,
              dd,
              tooltipValues,
              window
            );
          }

          const yNow = g
            .select("#triangle_up_" + processedDimensionName)
            .attr("y");
          if (yNow != null) {
            hit.attr("y", +yNow);
          }

          g.selectAll(".handle-hitbox").raise();
        })
        .on("end", () => {
          cleanup();
          requestAnimationFrame(() => {
            const newHit = g.select<SVGRectElement>(".handle-hitbox");
            if (!newHit.empty()) newHit.call(makeDrag());
          });
        });
    hit.call(makeDrag());
  });
}

function setBrushDown(
  featureAxis: any,
  parcoords: {
    xScales: any;
    yScales: {};
    dragging: {};
    dragPosStart: {};
    currentPosOfDims: any[];
    newFeatures: any;
    features: any[];
    newDataset: any[];
  },
  tooltipValues: any,
  brushOverlay: any
): void {
  featureAxis.each(function (d: { name: string }) {
    const processedDimensionName = utils.cleanString(d.name);
    const g = select(this)
      .append("g")
      .attr("class", "brush_" + processedDimensionName);

    const iconY = 70,
      iconX = -7,
      iconW = 14,
      iconH = 10;

    g.append("use")
      .attr("id", "triangle_down_" + processedDimensionName)
      .attr("x", iconX)
      .attr("y", iconY)
      .attr("width", iconW)
      .attr("height", iconH)
      .attr("href", "#brush_image_bottom")
      .attr("pointer-events", "none")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowBottomCursor()),
          13
        )}') 8 8, auto`
      );

    const hit = g
      .append("rect")
      .attr("class", "handle-hitbox")
      .attr("id", "triangle_down_hit" + processedDimensionName)
      .attr("x", -15)
      .attr("y", iconY)
      .attr("width", 30)
      .attr("height", 30)
      .style("fill", "transparent")
      .style("pointer-events", "all")
      .style("touch-action", "none")
      .style("-webkit-user-select", "none")
      .style("user-select", "none")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowBottomCursor()),
          13
        )}') 8 8, auto`
      );

    function cleanup() {
      brushOverlay.style("pointer-events", "none").lower();
      tooltipValues.style("visibility", "hidden");
    }

    const makeDrag = () =>
      drag()
        .container(function () {
          return (this as any).ownerSVGElement || this;
        })
        .on("start", () => {
          brushOverlay.raise().style("pointer-events", "all");
          g.select("#triangle_down_" + processedDimensionName).raise();
          g.selectAll(".handle-hitbox").raise();
        })
        .on("drag", (event: any, dd: any) => {
          if (parcoords.newFeatures.length > 25) {
            brush.throttleBrushDown(
              processedDimensionName,
              event,
              dd,
              tooltipValues,
              window
            );
          } else {
            brush.brushDown(
              processedDimensionName,
              event,
              dd,
              tooltipValues,
              window
            );
          }

          const yNow = g
            .select("#triangle_down_" + processedDimensionName)
            .attr("y");
          if (yNow != null) {
            hit.attr("y", +yNow);
          }

          g.selectAll(".handle-hitbox").raise();
        })
        .on("end", () => {
          cleanup();
          requestAnimationFrame(() => {
            const newHit = g.select<SVGRectElement>(".handle-hitbox");
            if (!newHit.empty()) newHit.call(makeDrag());
          });
        });
    hit.call(makeDrag());
  });
}
