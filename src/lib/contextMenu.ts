import "d3-transition";
import { select, selectAll } from "d3-selection";
import { drag } from "d3-drag";
import * as utils from "./utils";
import * as helper from "./helper";
import * as api from "./helperApiFunc";
import * as icon from "./icons/icons";
import { parcoords, active, width, padding, paddingXaxis } from "./globals";
import {
  redrawPolylines,
  redrawBackgroundPolylines,
} from "./parallelcoordinates";
import { updateLineDataBuffer } from "./hover/hover";

let scrollXPos: number;
let timer: string | number | NodeJS.Timeout;

export function setContextMenu(featureAxis: any): void {
  createContextMenu();
  createModalToSetRange();
  createModalToFilter();
  setToolTipsOnFeatureAxis(featureAxis);

  featureAxis.on(
    "contextmenu",
    function (event: { preventDefault: () => void }, d: { name: any }) {
      const dimension = d.name;
      styleContextMenu(event);
      hideDimensionMenu(dimension);
      invertDimensionMenu(dimension);
      setRangeMenu(dimension);
      resetRangeMenu(dimension);
      resetRoundRangeMenu(dimension);
      filterMenu(dimension);
      resetFilterMenu(dimension);
      showAllMenu();
      copyDimensionName(dimension);
      event.preventDefault();
    }
  );
}

function setToolTipsOnFeatureAxis(featureAxis: any): void {
  let tooltipFeatures = select("body")
    .append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("visibility", "hidden");

  featureAxis
    .append("text")
    .attr("class", "dimension")
    .attr("text-anchor", "middle")
    .attr("y", (80 / 1.7).toFixed(4))
    .text((d: { name: string }) =>
      d.name.length > 10 ? d.name.substr(0, 10) + "..." : d.name
    )
    .style("font-size", "0.7rem")
    .call(
      drag()
        .on("start", onDragStartEventHandler())
        .on("drag", onDragEventHandler(featureAxis))
        .on("end", onDragEndEventHandler(featureAxis))
    )
    .on("mouseover", function () {
      return tooltipFeatures.style("visibility", "visible");
    })
    .on(
      "mousemove",
      (event: { clientX: number; clientY: number }, d: { name: any }) => {
        setCursorForDimensions(d, featureAxis);
        const [x, y] = utils.getMouseCoords(event);
        tooltipFeatures.text(d.name);
        tooltipFeatures
          .style("left", x / 16 + "rem")
          .style("top", y / 16 + "rem")
          .style("font-size", "0.75rem")
          .style("border", 0.08 + "rem solid gray")
          .style("border-radius", 0.1 + "rem")
          .style("margin", 0.5 + "rem")
          .style("padding", 0.12 + "rem")
          .style("background-color", "lightgrey")
          .style("margin-left", 0.5 + "rem");
        return tooltipFeatures;
      }
    )
    .on("mouseout", function () {
      return tooltipFeatures.style("visibility", "hidden");
    });
}

function copyDimensionName(dimension: string): void {
  select("#copyDimensionName")
    .style("visibility", "visible")
    .on("click", async (event: { stopPropagation: () => void }) => {
      await navigator.clipboard.writeText(dimension);
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function showAllMenu(): void {
  select("#showAllMenu")
    .style("visibility", "visible")
    .style("border-top", "0.08rem lightgrey solid")
    .on("click", (event: { stopPropagation: () => void }) => {
      const hiddenDimensions = api.getAllHiddenDimensionNames();
      for (let i = 0; i < hiddenDimensions.length; i++) {
        api.show(hiddenDimensions[i]);
      }
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function resetFilterMenu(dimension: string): void {
  if (api.isDimensionCategorical(dimension)) {
    select("#resetfilterMenu").style("color", "lightgrey");
    return;
  }

  select("#resetfilterMenu")
    .style("visibility", "visible")
    .style("color", "black")
    .on("click", (event: { stopPropagation: () => void }) => {
      const range = api.getDimensionRange(dimension);
      const inverted = helper.isInverted(dimension);
      if (inverted) {
        api.setFilter(dimension, Number(range[0]), Number(range[1]));
      } else {
        api.setFilter(dimension, Number(range[1]), Number(range[0]));
      }
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function filterMenu(dimension: string): void {
  let filterMenu = select("#filterMenu");

  filterMenu.style("border-top", "0.08rem lightgrey solid");

  if (api.isDimensionCategorical(dimension)) {
    filterMenu.style("color", "lightgrey");
    return;
  }

  let currentFilters = api.getFilter(dimension);
  let minFilterValue = select("#minFilterValue");
  let maxFilterValue = select("#maxFilterValue");
  minFilterValue.property("value", currentFilters[0]);
  maxFilterValue.property("value", currentFilters[1]);

  minFilterValue.on(
    "keypress",
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("buttonFilter").click();
      }
    }
  );

  maxFilterValue.on(
    "keypress",
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("buttonFilter").click();
      }
    }
  );

  filterMenu.style("visibility", "visible").style("color", "black");

  filterMenu.on("click", (event: { stopPropagation: () => void }) => {
    select("#modalOverlayFilter").style("display", "block");
    select("#modalFilter").style("display", "block");
    select("#contextmenu").style("display", "none");
    const header =
      dimension.length > 25 ? dimension.substr(0, 25) + "..." : dimension;
    select("#headerDimensionFilter").text(header);
    select("#closeButtonFilter").on("click", () => {
      select("#errorFilter").style("display", "none");
      select("#modalFilter").style("display", "none");
      select("#modalOverlayFilter").style("display", "none");
    });

    select("#buttonFilter").on("click", () => {
      handleFilterButton(dimension);
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
  });
}

function handleFilterButton(dimension: string): void {
  let isOk = false;
  let minFilterValue = select("#minFilterValue");
  let maxFilterValue = select("#maxFilterValue");
  let errorMessage = select("#errorFilter").style("display", "block");
  let min = Number(minFilterValue.node().value);
  let max = Number(maxFilterValue.node().value);

  const inverted = helper.isInverted(dimension);
  const ranges = api.getDimensionRange(dimension);
  const minRange = Number(inverted ? ranges[1] : ranges[0]);
  const maxRange = Number(inverted ? ranges[0] : ranges[1]);

  if (max < min) {
    max = maxRange;
    errorMessage.text(`Max value is smaller than min value, filter is set to 
      min.`);
  } else if (min < minRange) {
    min = minRange;
    errorMessage.text(`Min value is smaller than ${api.getMinValue(dimension)},
     filter is set to min.`);
  } else if (min > maxRange) {
    min = maxRange;
    errorMessage.text(`Min value is bigger than max range value, filter is set
      to max.`);
  } else if (max > maxRange) {
    max = maxRange;
    errorMessage.text(`Max value is bigger than ${api.getMaxValue(dimension)},
     filter is set to max.`);
  } else if (max < minRange) {
    max = minRange;
    select("#errorFilter").text(`Max value is smaller than min range value, 
      filter is set to min.`);
  } else {
    isOk = true;
  }
  api.setFilter(dimension, max, min);

  if (isOk) {
    select("#errorFilter").style("display", "none");
    select("#modalFilter").style("display", "none");
    select("#modalOverlayFilter").style("display", "none");
  }
}

function resetRoundRangeMenu(dimension: string): void {
  if (api.isDimensionCategorical(dimension)) {
    select("#resetRoundRangeMenu").style("color", "lightgrey");
    return;
  }

  select("#resetRoundRangeMenu")
    .style("visibility", "visible")
    .style("color", "black")
    .on("click", (event: { stopPropagation: () => void }) => {
      api.setDimensionRangeRounded(
        dimension,
        api.getMinValue(dimension),
        api.getMaxValue(dimension)
      );
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function resetRangeMenu(dimension: string): void {
  if (api.isDimensionCategorical(dimension)) {
    select("#resetRangeMenu")
      .style("display", "false")
      .style("color", "lightgrey");
    return;
  }

  select("#resetRangeMenu")
    .style("visibility", "visible")
    .style("color", "black")
    .on("click", (event: { stopPropagation: () => void }) => {
      api.setDimensionRange(
        dimension,
        api.getMinValue(dimension),
        api.getMaxValue(dimension)
      );
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function setRangeMenu(dimension: string): void {
  let rangeMenu = select("#rangeMenu");
  rangeMenu.style("border-top", "0.08rem lightgrey solid");

  if (api.isDimensionCategorical(dimension)) {
    rangeMenu.style("color", "lightgrey");
    return;
  }

  rangeMenu
    .style("visibility", "visible")
    .style("color", "black")
    .on("click", (event: { stopPropagation: () => void }) => {
      handleRangeButton(dimension);
      select("#closeButtonRange").on("click", () => {
        select("#modalSetRange").style("display", "none");
        select("#modalOverlaySetRange").style("display", "none");
      });
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function handleRangeButton(dimension: string): void {
  let minRange = api.getCurrentMinRange(dimension);
  let maxRange = api.getCurrentMaxRange(dimension);
  let resultMin = minRange - Math.floor(minRange) !== 0;
  let resultMax = maxRange - Math.floor(maxRange) !== 0;
  let minValue = String(minRange);
  let maxValue = String(maxRange);
  if (resultMin && !resultMax) {
    const count = minValue.split(".")[1].length;
    maxValue = maxRange.toFixed(count);
  } else if (!resultMin && resultMax) {
    const count = maxValue.split(".")[1].length;
    minValue = minRange.toFixed(count);
  }
  select("#minRangeValue").property("value", minValue);
  select("#maxRangeValue").property("value", maxValue);
  select("#contextmenu").style("display", "none");
  select("#modalOverlaySetRange").style("display", "block");
  select("#modalSetRange").style("display", "block");
  const newText =
    dimension.length > 25 ? dimension.substr(0, 25) + "..." : dimension;
  select("#headerDimensionRange").text(newText);
  select("#infoRange3").text(
    "Range values must be below the minimum and above the maximum data value."
  );
  select("#infoRange").text(
    "The current range of " +
      dimension +
      " is between " +
      minValue +
      " and " +
      maxValue +
      "."
  );
  select("#infoRange2").text(
    "The original range of " +
      dimension +
      " is between " +
      api.getMinValue(dimension) +
      " and " +
      api.getMaxValue(dimension) +
      "."
  );
  select("#buttonRange").on("click", () => {
    let min = select("#minRangeValue").node().value;
    let max = select("#maxRangeValue").node().value;
    const inverted = helper.isInverted(dimension);
    let isOk = true;

    if (inverted) {
      if (
        max < api.getMinValue(dimension) ||
        min > api.getMaxValue(dimension)
      ) {
        select("#errorRange")
          .text(`The range has to be bigger than ${minValue} and ${maxValue}.`)
          .style("display", "block")
          .style("padding-left", 0.5 + "rem")
          .style("padding-top", 0.5 + "rem")
          .style("color", "red")
          .style("font-size", "x-small");
        isOk = false;
      }
    } else {
      if (
        min > api.getMinValue(dimension) ||
        max < api.getMaxValue(dimension)
      ) {
        select("#errorRange")
          .text(`The range has to be bigger than ${minValue} and ${maxValue}.`)
          .style("display", "block")
          .style("padding-left", 0.5 + "rem")
          .style("padding-top", 0.5 + "rem")
          .style("color", "red")
          .style("font-size", "x-small");
        isOk = false;
      }
    }
    if (isOk) {
      select("#errorRange").style("display", "none");
      api.setDimensionRange(dimension, min, max);
      select("#modalSetRange").style("display", "none");
      select("#modalOverlaySetRange").style("display", "none");
    }
  });
  select("#maxRangeValue").on(
    "keypress",
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("buttonRange").click();
      }
    }
  );
  select("#minRangeValue").on(
    "keypress",
    (event: { key: string; preventDefault: () => void }) => {
      if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("buttonRange").click();
      }
    }
  );
}

function invertDimensionMenu(dimension: string): void {
  select("#invertMenu").on(
    "click",
    (event: { stopPropagation: () => void }) => {
      api.invert(dimension);
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    }
  );
}

function hideDimensionMenu(dimension: string): void {
  select("#hideMenu")
    .style("border-top", "0.08rem lightgrey solid")
    .on("click", (event: { stopPropagation: () => void }) => {
      api.hide(dimension);
      select("#contextmenu").style("display", "none");
      event.stopPropagation();
    });
}

function styleContextMenu(event: any): void {
  const container = document.querySelector("#parallelcoords");
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  select("#contextmenu")
    .style("left", x + "px")
    .style("top", y + "px")
    .style("display", "block")
    .style("font-size", "0.75rem")
    .style("border", 0.08 + "rem solid gray")
    .style("border-radius", 0.3 + "rem")
    .style("margin", 0.5 + "rem")
    .style("padding", 0.35 + "rem")
    .style("background-color", "white")
    .style("margin-left", 0.5 + "rem")
    .style("cursor", "pointer")
    .style("minWidth", 15 + "rem")
    .on("click", (event: { stopPropagation: () => void }) => {
      event.stopPropagation();
    });
  selectAll(".contextmenu").style("padding", 0.35 + "rem");
}

function setCursorForDimensions(d: any, featureAxis: any): void {
  if (api.getDimensionPosition(d.name) == 0) {
    featureAxis
      .select(".dimension")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowRight()),
          12
        )}') 8 8, auto`
      );
  } else if (
    api.getDimensionPosition(d.name) ==
    parcoords.newFeatures.length - 1
  ) {
    featureAxis
      .select(".dimension")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowLeft()),
          12
        )}') 8 8, auto`
      );
  } else {
    featureAxis
      .select(".dimension")
      .style(
        "cursor",
        `url('data:image/svg+xml,${utils.setSize(
          encodeURIComponent(icon.getArrowLeftAndRight()),
          12
        )}') 8 8, auto`
      );
  }
}

function onDragStartEventHandler(): any {
  {
    return function onDragStart(d: { subject: any }) {
      this.__origin__ = parcoords.xScales(d.subject.name);
      parcoords.dragging[d.subject.name] = this.__origin__;
      parcoords.dragPosStart[d.subject.name] = this.__origin__;
      const element = document.getElementById("parallelcoords");
      scrollXPos = element.scrollLeft;
    };
  }
}

function onDragEventHandler(featureAxis: any): any {
  {
    return function onDrag(d: { subject: any; x: any }) {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
      timer = setInterval(() => {
        scroll(d), 100;
      });

      parcoords.dragging[d.subject.name] = Math.min(
        width - paddingXaxis,
        Math.max(paddingXaxis, (this.__origin__ += d.x))
      );

      active.each(function (d: any) {
        select(this).attr("d", helper.linePath(d, parcoords.newFeatures));
      });

      parcoords.newFeatures.sort((a: any, b: any) => {
        return (
          helper.position(b, parcoords.dragging, parcoords.xScales) -
          helper.position(a, parcoords.dragging, parcoords.xScales) -
          1
        );
      });

      parcoords.xScales.domain(parcoords.newFeatures);

      featureAxis.attr("transform", (d: { name: any }) => {
        return (
          "translate(" +
          helper.position(d.name, parcoords.dragging, parcoords.xScales) +
          ")"
        );
      });
    };
  }
}

function onDragEndEventHandler(featureAxis: any): any {
  {
    return function onDragEnd(d: { subject: any }) {
      const distance = (width - 80) / parcoords.newFeatures.length;
      const init = parcoords.dragPosStart[d.subject.name];

      if (
        parcoords.dragPosStart[d.subject.name] >
        parcoords.dragging[d.subject.name]
      ) {
        featureAxis.attr("transform", (d: { name: any }) => {
          return (
            "translate(" +
            helper.position(d.name, init - distance, parcoords.xScales) +
            ")"
          );
        });
      } else {
        featureAxis.attr("transform", (d: { name: any }) => {
          return (
            "translate(" +
            helper.position(d.name, init - distance, parcoords.xScales) +
            ")"
          );
        });
      }
      delete this.__origin__;
      delete parcoords.dragging[d.subject.name];
      delete parcoords.dragPosStart[d.subject.name];

      helper.trans(active).each(function (d: any) {
        select(this).attr("d", helper.linePath(d, parcoords.newFeatures));
      });
      redrawBackgroundPolylines(parcoords.data, parcoords);
      redrawPolylines(parcoords.newDataset, parcoords);
      updateLineDataBuffer(parcoords.newDataset, parcoords);
    };
  }
}

function scroll(d: { subject: any }): void {
  const element = document.getElementById("parallelcoords");
  if (
    parcoords.dragPosStart[d.subject.name] < parcoords.dragging[d.subject.name]
  ) {
    element.scrollLeft += 5;
  } else if (scrollXPos + 20 > parcoords.dragging[d.subject.name]) {
    element.scrollLeft -= 5;
  }
}

function createContextMenu(): void {
  let contextMenu = select("#parallelcoords")
    .append("g")
    .attr("id", "contextmenu")
    .style("position", "absolute")
    .style("display", "none");

  contextMenu
    .append("div")
    .attr("id", "copyDimensionName")
    .attr("class", "contextmenu")
    .text("Copy Name");
  contextMenu
    .append("div")
    .attr("id", "hideMenu")
    .attr("class", "contextmenu")
    .text("Hide");
  contextMenu
    .append("div")
    .attr("id", "invertMenu")
    .attr("class", "contextmenu")
    .text("Invert");
  contextMenu
    .append("div")
    .attr("id", "rangeMenu")
    .attr("class", "contextmenu")
    .text("Set Range...");
  contextMenu
    .append("div")
    .attr("id", "resetRangeMenu")
    .attr("class", "contextmenu")
    .text("Set Range from Data");
  contextMenu
    .append("div")
    .attr("id", "resetRoundRangeMenu")
    .attr("class", "contextmenu")
    .text("Set Rounded Range from Data");
  contextMenu
    .append("div")
    .attr("id", "filterMenu")
    .attr("class", "contextmenu")
    .text("Set Filter...");
  contextMenu
    .append("div")
    .attr("id", "resetfilterMenu")
    .attr("class", "contextmenu")
    .text("Reset Filter");
  contextMenu
    .append("div")
    .attr("id", "showAllMenu")
    .attr("class", "contextmenu")
    .text("Show All");
}

function createModalToSetRange(): void {
  select("body")
    .append("div")
    .attr("id", "modalOverlaySetRange")
    .style("position", "fixed")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100vw")
    .style("height", "100vh")
    .style("background-color", "rgba(0, 0, 0, 0.5)")
    .style("display", "none")
    .style("z-index", "999");

  select("#modalOverlaySetRange").on("click", () => {
    select("#modalSetRange").style("display", "none");
    select("#modalOverlaySetRange").style("display", "none");
  });

  const modalSetRange = select("body")
    .append("div")
    .attr("id", "modalSetRange")
    .style("position", "fixed")
    .style("top", "50%")
    .style("left", "50%")
    .style("transform", "translate(-50%, -50%)")
    .style("z-index", "1000")
    .style("background-color", "white")
    .style("padding", "1rem")
    .style("border-radius", "0.5rem")
    .style("box-shadow", "0 0.25rem 0.625rem rgba(0,0,0,0.2)")
    .style("display", "none");

  createModalTitle(modalSetRange, "Set Range for ");
  createCloseButton(modalSetRange, "closeButtonRange");
  createHeader(modalSetRange, "headerDimensionRange");
  createInfoMessage(modalSetRange, "infoRange3");
  createInfoMessage(modalSetRange, "infoRange");
  createInfoMessage(modalSetRange, "infoRange2");
  createInputFieldWithLabel(modalSetRange, "Min", "minRangeValue");
  createInputFieldWithLabel(modalSetRange, "Max", "maxRangeValue");
  createButton(modalSetRange, "buttonRange");
  createErrorMessage(modalSetRange, "errorRange");
}

function createModalToFilter(): void {
  select("body")
    .append("div")
    .attr("id", "modalOverlayFilter")
    .style("position", "fixed")
    .style("top", "0")
    .style("left", "0")
    .style("width", "100vw")
    .style("height", "100vh")
    .style("background-color", "rgba(0, 0, 0, 0.5)")
    .style("display", "none")
    .style("z-index", "999");

  select("#modalOverlayFilter").on("click", () => {
    select("#modalFilter").style("display", "none");
    select("#modalOverlayFilter").style("display", "none");
  });

  const modalFilter = select("body")
    .append("div")
    .attr("id", "modalFilter")
    .style("position", "fixed")
    .style("top", "50%")
    .style("left", "50%")
    .style("transform", "translate(-50%, -50%)")
    .style("z-index", "1000")
    .style("background-color", "white")
    .style("padding", "1rem")
    .style("border-radius", "0.5rem")
    .style("box-shadow", "0 0.25rem 0.625rem rgba(0,0,0,0.2)")
    .style("display", "none");

  createModalTitle(modalFilter, "Set Filter for ");
  createCloseButton(modalFilter, "closeButtonFilter");
  createHeader(modalFilter, "headerDimensionFilter");
  createInputFieldWithLabel(modalFilter, "Min", "minFilterValue");
  createInputFieldWithLabel(modalFilter, "Max", "maxFilterValue");
  createButton(modalFilter, "buttonFilter");
  createErrorMessage(modalFilter, "errorFilter");
}

function createModalTitle(modal: any, modalTitel: string): void {
  const title = document.createElement("div");
  title.textContent = modalTitel;
  title.style.paddingLeft = "0.5rem";
  title.style.fontSize = "large";
  modal.append(() => title);
}

function createHeader(modal: any, id: string): void {
  const header = document.createElement("div");
  header.id = id;
  header.style.paddingLeft = "0.5rem";
  header.style.fontSize = "large";
  modal.append(() => header);
}

function createInfoMessage(modal: any, id: string): void {
  const infoMessage = document.createElement("div");
  infoMessage.id = id;
  infoMessage.style.color = "grey";
  infoMessage.style.fontSize = "smaller";
  infoMessage.style.paddingLeft = "0.5rem";
  infoMessage.style.paddingBottom = "0.5rem";
  infoMessage.style.paddingTop = "1rem";
  modal.append(() => infoMessage);
}

function createInputFieldWithLabel(
  modal: any,
  text: string,
  inputId: string
): void {
  const label = document.createElement("label");
  label.textContent = text;
  label.style.padding = "0.5rem";
  modal.append(() => label);

  const input = document.createElement("input");
  input.type = "number";
  input.id = inputId;
  input.style.width = "4.5rem";
  input.style.border = "0.1rem solid lightgrey";
  input.style.borderRadius = "5%";
  modal.append(() => input);
}

function createButton(modal: any, id: string): void {
  const button = document.createElement("button");
  button.id = id;
  button.textContent = "Save";
  button.style.marginLeft = "0.5rem";
  button.style.marginTop = "1rem";
  button.style.width = "6.2rem";
  modal.append(() => button);
}

function createCloseButton(modal: any, id: string): void {
  const closeButton = document.createElement("span");
  closeButton.id = id;
  closeButton.innerHTML = "&times;";
  closeButton.style.position = "absolute";
  closeButton.style.top = "0.625rem";
  closeButton.style.right = "0.938rem";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontWeight = "bold";
  closeButton.style.fontSize = "1.25rem";
  modal.append(() => closeButton);
}

function createErrorMessage(modal: any, id: string): void {
  const errorMessage = document.createElement("div");
  errorMessage.id = id;
  errorMessage.style.position = "relative";
  errorMessage.style.display = "none";
  errorMessage.style.paddingLeft = 0.5 + "rem";
  errorMessage.style.paddingTop = 0.5 + "rem";
  errorMessage.style.color = "red";
  errorMessage.style.fontSize = "x-small";
  modal.append(() => errorMessage);
}
