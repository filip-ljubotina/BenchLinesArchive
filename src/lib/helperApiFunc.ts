import {
  active,
  parcoords,
  setHoverLabel,
  initDimension,
  setYaxis,
  yAxis,
  GraphicsWebTech,
  currWebTech,
  setCurrentWebTech,
  DatasetName,
  currDataset,
  setDataset,
  BenchmarkData,
  benchmarkData,
  setBenchmarkData,
  activeTool,
  setActiveTool,
  hoverTech,
  HoverTech,
  setHoverTech,
} from "./globals";
import * as utils from "./utils";
import * as helper from "./helper";
import * as brush from "./brush";
import * as icon from "./icons/icons";
import { select, selectAll } from "d3-selection";
import { line } from "d3-shape";
import { interpolatePath } from "d3-interpolate-path";
import { easeCubic } from "d3-ease";
import {
  redrawPolylines,
  redrawBackgroundPolylines,
} from "./parallelcoordinates";
import { updateLineDataBuffer } from "./hover/hover";
import { isWebGPUSupported } from "pixi.js";

//---------- Show and Hide Functions ----------
export function hide(dimension: string): void {
  const newDimensions = parcoords.newFeatures.filter(
    (d: string) => d !== dimension
  );
  const featureSet = parcoords.features.filter(
    (d: { name: string }) => d.name !== dimension
  );

  parcoords.features = featureSet;
  parcoords.newFeatures = newDimensions;

  const oldxScales = parcoords.xScales.copy();
  parcoords.xScales.domain(newDimensions);

  selectAll(".dimensions")
    .filter((d: { name: string }) => newDimensions.includes(d.name || d))
    .transition()
    .duration(1500)
    .attr(
      "transform",
      (d: { name: string }) =>
        "translate(" +
        helper.position(d.name || d, parcoords.dragging, parcoords.xScales) +
        ")"
    );

  selectAll(".dimensions")
    .filter((d: { name: string }) => d.name === dimension)
    .transition()
    .duration(1500)
    .style("opacity", 0)
    .on("end", function () {
      select(this).attr("visibility", "hidden");
    });

  select("g.active")
    .selectAll("path")
    .transition()
    .duration(1500)
    .attrTween("d", (d: { [x: string]: any }) =>
      generateLineTween(
        oldxScales,
        parcoords.xScales,
        newDimensions,
        parcoords.yScales
      )(d)
    );
}

function generateLineTween(
  oldXscales: (arg0: string | number) => any,
  newXscales: (arg0: string | number) => any,
  newDimensions: any[],
  yScales: { [x: string]: (arg0: any) => any }
) {
  const path = line().defined((d: null) => d != null);

  return function (d: { [x: string]: any }) {
    const oldPoints = newDimensions.map((dim: string | number) => [
      oldXscales(dim),
      yScales[dim](d[dim]),
    ]);
    const newPoints = newDimensions.map((dim: string | number) => [
      newXscales(dim),
      yScales[dim](d[dim]),
    ]);

    return interpolatePath(path(oldPoints), path(newPoints));
  };
}

export function show(dimension: string): void {
  if (parcoords.newFeatures.includes(dimension)) return;

  const existingIndex = initDimension.indexOf(dimension);
  if (existingIndex !== -1) {
    parcoords.newFeatures.splice(existingIndex, 0, dimension);
    const removedItem = { name: dimension };
    parcoords.features.splice(existingIndex, 0, removedItem);
  }

  parcoords.xScales.domain(parcoords.newFeatures);

  selectAll(".dimensions")
    .filter(
      (d: { name: string }) =>
        (typeof d === "object" ? d.name : d) === dimension
    )
    .style("opacity", 0)
    .transition()
    .attr("visibility", "visible")
    .duration(1500)
    .style("opacity", 1);

  selectAll(".dimensions")
    .filter((d: { name: string }) =>
      parcoords.newFeatures.includes(typeof d === "object" ? d.name : d)
    )
    .transition()
    .duration(1500)
    .attr(
      "transform",
      (d: { name: string }) =>
        "translate(" +
        helper.position(d.name || d, parcoords.dragging, parcoords.xScales) +
        ")"
    )
    .style("opacity", 1);

  select("g.active")
    .selectAll("path")
    .attr("d", function (d: { [x: string]: any }) {
      const points = parcoords.newFeatures.map((p: string | number) => {
        const x = parcoords.xScales(p);
        const y = parcoords.yScales[p](d[p]);
        return [x, y];
      });
      return line()(points);
    });
}

export function getActiveTool() {
  return activeTool;
}

export function setActiveToolHelper(tool: string) {
  setActiveTool(tool);
}

export function getAllDatasetOptions(): DatasetName[] {
  return [
    "student_dataset",
    "10D_100",
    "10D_1000",
    "10D_10000",
    "10D_100000",
    "20D_100",
    "20D_1000",
    "20D_10000",
    "20D_100000",
  ];
}

export function getCurrentDataset(): DatasetName {
  return currDataset;
}

export async function isWebGPUSupportedHelper() {
  return isWebGPUSupported();
}

export function getHoverTechHelper() {
  return hoverTech;
}

export function setHoverTechHelper(tech: HoverTech) {
  setHoverTech(tech);
}

export function setNewBenchmarkData(newBenchmarkData: BenchmarkData) {
  setBenchmarkData(newBenchmarkData);
}

export function getBenchmarkData(): BenchmarkData {
  return benchmarkData;
}

export function setCurrentDataset(newDataset: DatasetName) {
  setDataset(newDataset);
}

export function getAllWebTechOptions(): GraphicsWebTech[] {
  return [
    "SVG-DOM",
    "Canvas2D",
    "WebGL",
    "WebGPU",
    "Pixi WebGL",
    "Pixi WebGPU",
    "Three WebGL",
    "Three WebGPU",
  ];
}

export function getCurrentWebTechnologie(): GraphicsWebTech {
  return currWebTech;
}

export function setCurrentWebTechnologie(webTech: GraphicsWebTech) {
  setCurrentWebTech(webTech);
}

export function getAllRecords(): string[] {
  const selection = active;
  const object = selection._groups;
  const data = [];
  for (let i = 0; i < object[0].length; i++) {
    const items = object.map((item: any[]) => item[i]);
    const keys = Object.keys(items);
    const text = items[keys[0]].id;
    data.push(text);
  }
  return data;
}

export function getAllVisibleDimensionNames(): string[] {
  let listOfDimensions = parcoords.newFeatures.slice();
  return listOfDimensions.reverse();
}

export function getAllDimensionNames(): string[] {
  return parcoords.data["columns"];
}

export function getAllHiddenDimensionNames(): string[] {
  const dimensions = getAllDimensionNames();
  const hiddenDimensions = [];
  for (let i = 0; i < dimensions.length; i++) {
    if (getHiddenStatus(dimensions[i]) == "hidden") {
      hiddenDimensions.push(dimensions[i]);
    }
  }
  return hiddenDimensions;
}

export function getHiddenStatus(dimension: string): string {
  const index = parcoords.newFeatures.indexOf(dimension);
  if (index != -1) {
    return "shown";
  } else {
    return "hidden";
  }
}

export function getInversionStatus(dimension: string): string {
  const invertId = "#dimension_invert_" + utils.cleanString(dimension);
  const element = select(invertId);
  const arrowStatus = element.text();
  return arrowStatus == "up" ? "ascending" : "descending";
}

export function getNumberOfDimensions(): number {
  return parcoords.newFeatures.length;
}

export function getDimensionPosition(dimension: string): number {
  return parcoords.newFeatures.indexOf(dimension);
}

export function isDimensionCategorical(dimension: string): boolean {
  let values = parcoords.newDataset.map(
    (o: { [x: string]: any }) => o[dimension]
  );
  if (isNaN(values[0])) {
    return true;
  }
  return false;
}

//---------- Filter Functions ----------

export function getFilter(dimension: string): [number, number] {
  const yScale = parcoords.yScales[dimension];
  const dimensionSettings = parcoords.currentPosOfDims.find(
    (d: { key: string }) => d.key === dimension
  );
  if (!dimensionSettings || !yScale || typeof yScale.invert !== "function")
    return [0, 0];

  const valueTop = Math.round(yScale.invert(dimensionSettings.top));
  const valueBottom = Math.round(yScale.invert(dimensionSettings.bottom));

  const min = Math.min(valueTop, valueBottom);
  const max = Math.max(valueTop, valueBottom);

  return [min, max];
}

export function setFilter(dimension: string, min: number, max: number): void {
  const filterTop = Math.max(min, max);
  const filterBottom = Math.min(min, max);
  addRange(
    filterBottom,
    parcoords.currentPosOfDims,
    dimension,
    "currentFilterBottom"
  );
  addRange(
    filterTop,
    parcoords.currentPosOfDims,
    dimension,
    "currentFilterTop"
  );
  brush.filter(dimension, min, max);
}

//---------- Range Functions ----------

export function getDimensionRange(dimension: string): (string | number)[] {
  return parcoords.yScales[dimension].domain();
}

export function setDimensionRange(
  dimension: string,
  min: number,
  max: number
): void {
  const inverted = helper.isInverted(dimension);
  const hiddenDims = getAllHiddenDimensionNames();

  if (inverted) {
    parcoords.yScales[dimension].domain([max, min]);
    setYaxis(
      helper.setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims)
    );
  } else {
    parcoords.yScales[dimension].domain([min, max]);
    setYaxis(
      helper.setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims)
    );
  }

  addRange(min, parcoords.currentPosOfDims, dimension, "currentRangeBottom");
  addRange(max, parcoords.currentPosOfDims, dimension, "currentRangeTop");

  select("#dimension_axis_" + utils.cleanString(dimension))
    .call(yAxis[dimension])
    .transition()
    .duration(1000)
    .ease(easeCubic);

  let active = select("g.active")
    .selectAll("path")
    .transition()
    .duration(1000)
    .attr("d", (d: any) => {
      return helper.linePath(d, parcoords.newFeatures);
    })
    .ease(easeCubic);

  active.each(function (d: any) {
    select(this)
      .transition()
      .duration(1000)
      .attr("d", helper.linePath(d, parcoords.newFeatures))
      .ease(easeCubic);
  });
  setFilterAfterSettingRanges(dimension, inverted);
}

function setFilterAfterSettingRanges(
  dimension: string,
  inverted: boolean
): void {
  const rect = select("#rect_" + dimension);
  const triDown = select("#triangle_down_" + dimension);
  const triUp = select("#triangle_up_" + dimension);

  const dimensionSettings = parcoords.currentPosOfDims.find(
    (d: { key: string }) => d.key === dimension
  );

  const yScale = parcoords.yScales[dimension];

  const newMin = Math.max(
    dimensionSettings.currentRangeBottom,
    dimensionSettings.currentFilterBottom
  );
  const newMax = Math.min(
    dimensionSettings.currentRangeTop,
    dimensionSettings.currentFilterTop
  );

  let top = yScale(newMax);
  let bottom = yScale(newMin);

  if (inverted) {
    [top, bottom] = [bottom, top];
  }

  const rectY = Math.min(top, bottom);
  const rectH = Math.abs(bottom - top);

  const storeBottom = Math.min(newMin, newMax);
  const storeTop = Math.max(newMin, newMax);

  addRange(
    storeBottom,
    parcoords.currentPosOfDims,
    dimension,
    "currentFilterBottom"
  );
  addRange(storeTop, parcoords.currentPosOfDims, dimension, "currentFilterTop");

  rect
    .transition()
    .duration(300)
    .attr("y", rectY)
    .attr("height", rectH)
    .style("opacity", 0.3);

  triDown
    .transition()
    .duration(300)
    .attr("y", rectY - 10);

  triUp
    .transition()
    .duration(300)
    .attr("y", rectY + rectH);
}

export function setDimensionRangeRounded(
  dimension: string,
  min: number,
  max: number
): void {
  const inverted = helper.isInverted(dimension);
  const hiddenDims = getAllHiddenDimensionNames();
  if (inverted) {
    parcoords.yScales[dimension].domain([max, min]).nice();
    setYaxis(
      helper.setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims)
    );
  } else {
    parcoords.yScales[dimension].domain([min, max]).nice();
    setYaxis(
      helper.setupYAxis(parcoords.yScales, parcoords.newDataset, hiddenDims)
    );
  }

  const roundedRanges = parcoords.yScales[dimension].domain();
  addRange(
    roundedRanges[0],
    parcoords.currentPosOfDims,
    dimension,
    "currentRangeBottom"
  );
  addRange(
    roundedRanges[1],
    parcoords.currentPosOfDims,
    dimension,
    "currentRangeTop"
  );

  select("#dimension_axis_" + utils.cleanString(dimension))
    .call(yAxis[dimension])
    .transition()
    .duration(1000)
    .ease(easeCubic);

  let active = select("g.active")
    .selectAll("path")
    .transition()
    .duration(1000)
    .attr("d", (d: any) => {
      return helper.linePath(d, parcoords.newFeatures);
    })
    .ease(easeCubic);

  active.each(function (d: any) {
    select(this)
      .transition()
      .duration(1000)
      .attr("d", helper.linePath(d, parcoords.newFeatures))
      .ease(easeCubic);
  });
  setFilterAfterSettingRanges(dimension, inverted);
}

function addRange(
  value: number,
  currentPosOfDims: any,
  dimension: string,
  key: string
): void {
  let newObject = {};
  newObject[key] = Number(value);
  const target = currentPosOfDims.find(
    (obj: { key: string }) => obj.key == dimension
  );
  Object.assign(target, newObject);
}

export function getMinValue(dimension: string): number {
  const item = parcoords.currentPosOfDims.find(
    (object: { key: string }) => object.key == dimension
  );
  return item.min;
}

export function getMaxValue(dimension: string): number {
  const item = parcoords.currentPosOfDims.find(
    (object: { key: string }) => object.key == dimension
  );
  return item.max;
}

export function getCurrentMinRange(dimension: string): number {
  const item = parcoords.currentPosOfDims.find(
    (object: { key: string }) => object.key == dimension
  );
  return item.currentRangeBottom;
}

export function getCurrentMaxRange(dimension: string): number {
  const item = parcoords.currentPosOfDims.find(
    (object: { key: string }) => object.key == dimension
  );
  return item.currentRangeTop;
}

export function isSelected(record: string): boolean {
  return select("#" + utils.cleanString(record)).classed("selected");
}

export function setDimensionForHovering(dimension: string): void {
  setHoverLabel(dimension);
}

export function invert(dimension: string): void {
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

  const filter = getFilter(dimension);
  brush.addSettingsForBrushing(dimension, helper.isInverted(dimension));
  if (helper.isInverted(dimension)) {
    brush.addInvertStatus(true, dimension, "isInverted");
  } else {
    brush.addInvertStatus(false, dimension, "isInverted");
  }
  redrawBackgroundPolylines(parcoords.data, parcoords);
  redrawPolylines(parcoords.newDataset, parcoords);
  updateLineDataBuffer(parcoords.newDataset, parcoords);
}
