import {
  loadCSV,
  drawChart,
  invert,
  saveAsSvg,
  moveByOne,
  getCurrentMinRange,
  getCurrentMaxRange,
  getDimensionPosition,
  setFilter,
  getFilter,
  getDimensionRange,
  getNumberOfDimensions,
  hide,
  show,
  getHiddenStatus,
  getMinValue,
  getMaxValue,
  getInversionStatus,
  setDimensionRange,
  getAllDimensionNames,
  getAllVisibleDimensionNames,
  getAllHiddenDimensionNames,
  getAllRecords,
  toggleSelection,
  isSelected,
  setDimensionRangeRounded,
  isDimensionCategorical,
  getAllWebTechOptions,
  getAllDatasetOptions,
  getCurrentDataset,
  setCurrentDataset,
  runPolylineBenchmark,
  getBenchmarkData,
  getCurrentWebTechnologie,
  setCurrentWebTechnologie,
  setActiveToolHelper,
  getHoverTechHelper,
  setHoverTechHelper,
  isWebGPUSupportedHelper,
} from "./lib/spcd3.js";

let data;
let newData;
let moveDimensionData;
let filterDimensionData;
let rangeDimensionData;

let studentData =
  "Name,Maths,English,PE,Art,History,IT,Biology,German\nAdrian,95,24,82,49,58,85,21,24\nAmelia,92,98,60,45,82,85,78,92\nBrooke,27,35,84,45,23,50,15,22\nChloe,78,9,83,66,80,63,29,12\nDylan,92,47,91,56,47,81,60,51\nEmily,67,3,98,77,25,100,50,34\nEvan,53,60,97,74,21,78,72,75\nFinn,42,73,65,52,43,61,82,85\nGia,50,81,85,80,43,46,73,91\nGrace,24,95,98,94,89,25,91,69\nHarper,69,9,97,77,56,94,38,2\nHayden,2,72,74,53,40,40,66,64\nIsabella,8,99,84,69,86,20,86,85\nJesse,63,39,93,84,30,71,86,19\nJordan,11,80,87,68,88,20,96,81\nKai,27,65,62,92,81,28,94,84\nKaitlyn,7,70,51,77,79,29,96,73\nLydia,75,49,98,55,68,67,91,87\nMark,51,70,87,40,97,94,60,95\nMonica,62,89,98,90,85,66,84,99\nNicole,70,8,84,64,26,70,12,8\nOswin,96,14,62,35,56,98,5,12\nPeter,98,10,71,41,55,66,38,29\nRenette,96,39,82,43,26,92,20,2\nRobert,78,32,98,55,56,81,46,29\nSasha,87,1,84,70,56,88,49,2\nSylvia,86,12,97,4,19,80,36,8\nThomas,76,47,99,34,48,92,30,38\nVictor,5,60,70,65,97,19,63,83\nZack,19,84,83,42,93,15,98,95";

window.addEventListener("click", (event) => {
  if (!event.target.id.includes("show")) {
    closeElements("options");
  }
  if (!event.target.id.includes("invert")) {
    closeElements("invertOptions");
  }
  if (!event.target.id.includes("move")) {
    closeElements("moveOptions");
  }
  if (!event.target.id.includes("filter")) {
    closeElements("filterOptions");
    if (document.getElementById("filterContainer") != null) {
      document.getElementById("filterContainer").remove();
    }
  }
  if (!event.target.id.includes("range")) {
    closeElements("rangeOptions");
    if (document.getElementById("rangeContainer")) {
      document.getElementById("rangeContainer").remove();
    }
  }
  if (!event.target.id.includes("sel")) {
    closeElements("options_r");
  }
});

document.addEventListener(
  "DOMContentLoaded",
  function () {
    data = studentData;
    newData = loadCSV(data);
    showButtons();
    drawChart(newData);
    generateDropdownForShow();
    generateDropdownForInvert();
    generateDropdownForMove();
    generateDropDownForHoverTech();
    generateDropDownForWebTech();
    generateDropDownForDataset();
    generateDropdownForFilter();
    generateBenchmarkInput();
    generateDropdownForRange();
    generateDropdownForSelectRecords();
    document.getElementById("border").style.visibility = "visible";
  },
  false
);

let inputButton = document.getElementById("input");
inputButton.addEventListener("click", openFileDialog, false);

let inputFile = document.getElementById("fileInput");
inputFile.addEventListener("change", handleFileSelect, false);
inputFile.addEventListener("cancel", () => {
  document.getElementById("input").textContent = "Upload File...";
});
inputFile.addEventListener("click", (event) => {
  event.target.value = null;
});

let downloadButton = document.getElementById("download");
downloadButton.addEventListener("click", () => {
  saveAsSvg();
});
downloadButton.style.visibility = "hidden";

let resetRangesButton = document.getElementById("resetRanges");
resetRangesButton.addEventListener("click", resetToOriginalRange, false);
resetRangesButton.style.visibility = "hidden";

let resetRoundedRangesButton = document.getElementById("resetRoundedRanges");
resetRoundedRangesButton.addEventListener("click", resetToRoundedRange, false);
resetRoundedRangesButton.style.visibility = "hidden";

let resetAllButton = document.getElementById("resetAll");
resetAllButton.addEventListener("click", resetAll, false);
resetAllButton.style.visibility = "hidden";

const dropdown = document.getElementById("tool-dropdown");
const trigger = document.getElementById("tool-trigger");
const triggerIcon = document.getElementById("tool-icon");
const items = dropdown.querySelectorAll(".dropdown-item");

trigger.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdown.classList.toggle("open");
});

items.forEach((item) => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();

    const tool = item.dataset.tool;

    items.forEach((i) => i.classList.remove("selected"));
    item.classList.add("selected");

    const icon = item.querySelector("svg").cloneNode(true);
    triggerIcon.replaceChildren(icon);

    setActiveToolHelper(tool);

    dropdown.classList.remove("open");
  });
});

document.addEventListener("click", () => {
  dropdown.classList.remove("open");
});

function openFileDialog() {
  document.getElementById("fileInput").click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      clearPlot();
      data = e.target.result;
      newData = loadCSV(data);
      drawChart(newData);

      showButtons();

      generateDropdownForShow();
      generateDropdownForInvert();
      generateDropdownForMove();
      generateDropDownForHoverTech();
      generateDropDownForWebTech();
      generateDropDownForDataset();
      generateDropdownForFilter();
      generateBenchmarkInput();
      generateDropdownForRange();
      generateDropdownForSelectRecords();

      document.getElementById("border").style.visibility = "visible";
    };
    reader.readAsText(file);
  }
}

function showButtons() {
  downloadButton.style.visibility = "visible";
  resetRangesButton.style.visibility = "visible";
  resetRoundedRangesButton.style.visibility = "visible";
  resetAllButton.style.visibility = "visible";
}

function updateDimensions(dimension) {
  if (getHiddenStatus(dimension) == "shown") {
    hide(dimension);
  } else {
    show(dimension);
  }
}

function closeElements(id) {
  let options = document.getElementById(id);
  options.style.display = "none";
}

function showOptions(id, buttonId) {
  let options = document.getElementById(id);

  options.style.display == "none"
    ? (options.style.display = "block")
    : (options.style.display = "none");

  if (buttonId == "moveButton") {
    disableLeftAndRightButton();
  }

  const dimensions = getAllDimensionNames();
  dimensions.forEach(function (dimension) {
    if (getHiddenStatus(dimension) == "hidden") {
      document.getElementById("show_" + dimension).checked = false;
    }
  });
}

function showOptionsForRecords(id, buttonId) {
  let checkboxes = document.getElementById(id);

  checkboxes.style.display == "none"
    ? (checkboxes.style.display = "block")
    : (checkboxes.style.display = "none");

  let button = document.getElementById(buttonId);

  checkboxes.style.display == "block"
    ? (button.style.backgroundColor = "white")
    : (button.style.backgroundColor = "white");
  checkboxes.style.display == "block"
    ? (button.style.color = "black")
    : (button.style.color = "black");

  let records = getAllRecords();
  records.forEach(function (record) {
    let selected = isSelected(record);
    let checkbox = document.getElementById("sel_" + record);
    if (selected) {
      checkbox.checked = true;
    } else {
      checkbox.checked = false;
    }
  });
}

function generateDropdownForShow() {
  const container = document.getElementById("hideDimensionContainer");
  container.style.position = "relative";

  let selectButton = document.createElement("button");
  selectButton.id = "showButton";
  selectButton.className = "ddButton";

  let textElement = document.createElement("span");
  textElement.innerHTML =
    'Show Dimensions <img src="./svg/dropdown-symbol.svg" id="show"/>';
  textElement.id = "showText";
  selectButton.appendChild(textElement);

  let dimensionContainer = document.createElement("div");
  dimensionContainer.id = "options";
  dimensionContainer.name = "options";
  dimensionContainer.className = "ddList";
  dimensionContainer.style.display = "none";

  let dimensions = getAllDimensionNames();
  let copyDimensions = dimensions.slice();
  let reverseDimensions = copyDimensions.reverse();

  if (reverseDimensions.length > 10) {
    dimensionContainer.style.height = "12.5rem";
  }

  dimensionContainer.addEventListener("change", (event) => {
    updateDimensions(event.target.value);
  });

  selectButton.addEventListener("click", () => {
    dimensionContainer.innerHTML = "";
    let test1 = getAllVisibleDimensionNames();
    let test2 = getAllHiddenDimensionNames();
    var result = test1.concat(test2);
    result.forEach(function (dimension) {
      let ddElement = document.createElement("div");
      ddElement.className = "dropdownLabel";
      ddElement.id = "show";
      let input = document.createElement("input");
      input.className = "inputFields";
      input.type = "checkbox";
      input.id = "show_" + dimension;
      input.value = dimension;
      input.name = "dimension";
      input.checked = true;
      let textLabel = document.createElement("label");
      textLabel.textContent = dimension;
      textLabel.id = "showLabel";
      ddElement.appendChild(input);
      ddElement.appendChild(textLabel);
      dimensionContainer.appendChild(ddElement);
    });
    showOptions("options", "showButton");
    calcDDBehaviour(dimensionContainer, selectButton);
  });

  container.appendChild(selectButton);
  container.appendChild(dimensionContainer);
}

function generateDropdownForInvert() {
  const container = document.getElementById("invDimensionContainer");
  container.style.position = "relative";

  let dimensionContainer = document.createElement("div");
  dimensionContainer.id = "invertOptions";
  dimensionContainer.name = "invertOptions";
  dimensionContainer.className = "ddList";
  dimensionContainer.style.display = "none";

  const dimensions = getAllVisibleDimensionNames();
  if (dimensions.length > 10) {
    dimensionContainer.style.height = "12.5rem";
  }

  let selectButton = document.createElement("button");
  selectButton.id = "invertButton";
  selectButton.className = "ddButton";

  let textElement = document.createElement("span");
  textElement.id = "invertText";
  textElement.innerHTML =
    'Invert Dimensions <img src="./svg/dropdown-symbol.svg" id="invert"/>';
  selectButton.appendChild(textElement);

  selectButton.addEventListener("click", () => {
    dimensionContainer.innerHTML = "";
    getAllVisibleDimensionNames().forEach(function (dimension) {
      let ddElement = document.createElement("div");
      ddElement.className = "dropdownLabel";
      ddElement.id = "invertElement";
      let inputButton = document.createElement("button");
      inputButton.className = "inputButton";
      inputButton.id = "invert_" + dimension;
      if (getInversionStatus(dimension) == "ascending") {
        inputButton.innerHTML =
          '<img src="./svg/arrow-up.svg" id="invertArrow"/>';
      } else {
        inputButton.innerHTML =
          '<img src="./svg/arrow-down.svg" id="invertArrow"/>';
      }

      inputButton.addEventListener("click", (event) => {
        const value = inputButton.id.replace("invert_", "");
        if (value != undefined) {
          invert(value);
          if (getInversionStatus(value) == "ascending") {
            inputButton.innerHTML =
              '<img src="./svg/arrow-up.svg" id="invertArrow"/>';
          } else {
            inputButton.innerHTML =
              '<img src="./svg/arrow-down.svg" id="invertArrow"/>';
          }
        }
      });

      let textLabel = document.createElement("label");
      textLabel.className = "textLabel";
      textLabel.textContent = dimension;
      textLabel.id = "invertLabel";
      ddElement.appendChild(inputButton);
      ddElement.appendChild(textLabel);
      dimensionContainer.appendChild(ddElement);
    });

    showOptions("invertOptions", "invertButton");
    calcDDBehaviour(dimensionContainer, selectButton);
    for (let i = 0; i < dimensions.length; i++) {
      document.addEventListener("DOMContentLoaded", function (event) {
        if (getInversionStatus(dimensions[i]) == "ascending") {
          inputButton.innerHTML =
            '<img src="./svg/arrow-up.svg" id="invertArrow"/>';
        } else {
          inputButton.innerHTML =
            '<img src="./svg/arrow-down.svg" id="invertArrow"/>';
        }
      });
    }
  });

  container.appendChild(selectButton);
  container.appendChild(dimensionContainer);
}

function generateDropdownForMove() {
  const container = document.getElementById("moDimensionContainer");
  container.style.position = "relative";

  let dimensionContainer = document.createElement("div");
  dimensionContainer.id = "moveOptions";
  dimensionContainer.name = "moveOptions";
  dimensionContainer.className = "ddList";
  dimensionContainer.style.display = "none";

  let selectButton = document.createElement("button");
  selectButton.id = "moveButton";
  selectButton.className = "ddButton";

  let textElement = document.createElement("span");
  textElement.id = "moveText";
  textElement.innerHTML =
    'Move Dimensions <img src="./svg/dropdown-symbol.svg" id="move"/>';
  selectButton.appendChild(textElement);

  const dimensions = getAllVisibleDimensionNames();
  if (dimensions.length > 10) {
    dimensionContainer.style.height = "12.5rem";
  }

  selectButton.addEventListener("click", () => {
    dimensionContainer.innerHTML = "";
    getAllVisibleDimensionNames().forEach(function (dimension) {
      let dimensionLabel = document.createElement("div");
      dimensionLabel.className = "dropdownLabel";
      dimensionLabel.id = "move";
      let arrowLeft = document.createElement("button");
      arrowLeft.className = "inputButtonMoveLeft";
      arrowLeft.id = "moveleft_" + dimension;
      arrowLeft.innerHTML = '<img src="./svg/arrow-left.svg" id="moveArrow"/>';
      arrowLeft.addEventListener("click", () => {
        const value = arrowLeft.id.replace("moveleft_", "");
        if (value != undefined) {
          moveDimensionData = value;
          moveDimensionLeft();
          disableLeftAndRightButton();
        }
      });
      let arrowRight = document.createElement("button");
      arrowRight.className = "inputButtonMoveRight";
      arrowRight.id = "moveright_" + dimension;
      arrowRight.innerHTML =
        '<img src="./svg/arrow-right.svg" id="moveArrow"/>';
      arrowRight.style.paddingRight = "0.5rem";
      arrowRight.addEventListener("click", () => {
        const value = arrowRight.id.replace("moveright_", "");
        if (value != undefined) {
          moveDimensionData = value;
          moveDimensionRight();
          disableLeftAndRightButton();
        }
      });
      let textLabel = document.createElement("label");
      textLabel.textContent = dimension;
      textLabel.id = "moveLabel";
      textLabel.className = "textLabel";
      dimensionLabel.appendChild(arrowLeft);
      dimensionLabel.appendChild(arrowRight);
      dimensionLabel.appendChild(textLabel);
      dimensionContainer.appendChild(dimensionLabel);
    });
    showOptions("moveOptions", "moveButton");
    calcDDBehaviour(dimensionContainer, selectButton);
  });

  container.appendChild(selectButton);
  container.appendChild(dimensionContainer);
}

function calcDDBehaviour(dimensionContainer, selectButton) {
  const dropdownHeight = dimensionContainer.clientHeight;
  const windowHeight = window.innerHeight;
  const dropdownTop = selectButton.getBoundingClientRect().top;

  if (windowHeight - dropdownTop < dropdownHeight) {
    dimensionContainer.style.bottom = "100%";
    dimensionContainer.style.top = "auto";
  } else {
    dimensionContainer.style.bottom = "auto";
    dimensionContainer.style.top = "100%";
  }
}

function getDatasetPath(dataset) {
  return `data/dataset_${dataset}.csv`;
}

export function generateDropDownForDataset() {
  const container = document.getElementById("datasetContainer");
  if (!container) return;

  container.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = "Dataset:";
  label.style.marginRight = "0.5rem";

  const select = document.createElement("select");

  getAllDatasetOptions().forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === getCurrentDataset()) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener("change", async (e) => {
    const value = e.target.value;
    setCurrentDataset(value);

    if (value !== "student_dataset") {
      const path = getDatasetPath(value);
      const res = await fetch(path);
      const text = await res.text();
      drawChart(loadCSV(text));
    } else {
      drawChart(loadCSV(data));
    }
  });

  container.appendChild(label);
  container.appendChild(select);
}

export function generateDropDownForHoverTech() {
  const container = document.getElementById("hoverTechContainer");
  if (!container) return;

  container.innerHTML = "";

  // Check GPU availability directly
  const gpuAvailable = "gpu" in navigator;

  // If GPU not available, force JS
  if (!gpuAvailable && getHoverTechHelper() === "GPU") {
    setHoverTechHelper("JS");
  }

  // Label
  const label = document.createElement("span");
  label.textContent = "Hover:";
  label.style.marginRight = "0.5rem";

  // Dropdown
  const select = document.createElement("select");

  // Disable dropdown if GPU is not available
  if (!gpuAvailable) {
    select.disabled = true;
    select.title = "GPU not available - using JS fallback";
  }

  ["GPU", "JS"].forEach(function(value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;

    // Disable GPU option if not available
    if (value === "GPU" && !gpuAvailable) {
      option.disabled = true;
      option.textContent = "GPU (unavailable)";
    }

    if (value === getHoverTechHelper()) option.selected = true;
    select.appendChild(option);
  });

  select.addEventListener("change", async function(e) {
    const value = e.target.value;
    setHoverTechHelper(value);

    const datasetSelect = document.querySelector("#datasetContainer select");

    if (datasetSelect.value !== "student_dataset") {
      const path = getDatasetPath(datasetSelect.value);
      const res = await fetch(path);
      const text = await res.text();
      drawChart(loadCSV(text));
    } else {
      drawChart(loadCSV(data));
    }
  });

  container.appendChild(label);
  container.appendChild(select);
}

export function generateDropDownForWebTech() {
  const container = document.getElementById("webTechContainer");
  if (!container) return;

  container.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = "Technologies:";
  label.style.marginRight = "0.5rem";

  const select = document.createElement("select");

  const nativeOptions = ["SVG-DOM", "Canvas2D", "WebGL", "WebGPU"];
  const pixiOptions = ["Pixi WebGL", "Pixi WebGPU"];
  const threeOptions = ["Three WebGL", "Three WebGPU"];

  const nativeGroup = document.createElement("optgroup");
  nativeGroup.label = "Native";
  nativeOptions.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === getCurrentWebTechnologie()) option.selected = true;
    nativeGroup.appendChild(option);
  });
  select.appendChild(nativeGroup);

  // Pixi.js group
  const pixiGroup = document.createElement("optgroup");
  pixiGroup.label = "Pixi.js";
  pixiOptions.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === getCurrentWebTechnologie()) option.selected = true;
    pixiGroup.appendChild(option);
  });
  select.appendChild(pixiGroup);

  // Three.js group
  const threeGroup = document.createElement("optgroup");
  threeGroup.label = "Three.js";
  threeOptions.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    if (value === getCurrentWebTechnologie()) option.selected = true;
    threeGroup.appendChild(option);
  });
  select.appendChild(threeGroup);

  select.addEventListener("change", async (e) => {
    const value = e.target.value;
    setCurrentWebTechnologie(value);

    const datasetSelect = document.querySelector("#datasetContainer select");

    if (datasetSelect.value !== "student_dataset") {
      const path = getDatasetPath(datasetSelect.value);
      const res = await fetch(path);
      const text = await res.text();
      drawChart(loadCSV(text));
    } else {
      drawChart(loadCSV(data));
    }
  });

  container.appendChild(label);
  container.appendChild(select);
}

export function generateBenchmarkInput() {
  const container = document.getElementById("benchmarkContainer");
  if (!container) return;

  container.innerHTML = "";

  const label = document.createElement("span");
  label.textContent = "Avg. rendering time benchmark:";
  label.style.marginRight = "0.5rem";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.placeholder = "Enter iterations";
  input.style.width = "120px";
  input.style.marginRight = "0.5rem";

  const btn = document.createElement("button");
  btn.textContent = "Start benchmark";
  btn.className = "input-button";

  const currentDisplay = document.createElement("span");
  currentDisplay.style.marginLeft = "1rem";
  currentDisplay.style.color = "#555";
  let benchmarkData = getBenchmarkData();
  if (benchmarkData.numOfIterations !== null) {
    currentDisplay.textContent = `Iterations: ${benchmarkData.numOfIterations}`;
  }

  btn.addEventListener("click", async () => {
    const avg = await runPolylineBenchmark(parseInt(input.value, 10));

    if (avg == null) {
      alert("Set a valid number of iterations first.");
      return;
    }

    const container = document.getElementById("benchmarkContainer");
    if (!container) return;

    let info = container.querySelector(".benchmark-info");
    if (!info) {
      info = document.createElement("span");
      info.className = "benchmark-info";
      info.style.marginLeft = "1rem";
      container.appendChild(info);
    }
    benchmarkData = getBenchmarkData();
    info.textContent =
      `Iterations: ${benchmarkData.numOfIterations}, ` +
      `Average draw time: ${avg.toFixed(3)} ms`;

    const table = document.querySelector("#pastTestsTable tbody");

    const row = document.createElement("tr");

    const index = table.children.length + 1;

    row.innerHTML = `
    <td>${index}</td>
    <td>${getCurrentWebTechnologie()}</td>
    <td>${getCurrentDataset()}</td>
    <td>${benchmarkData.numOfIterations}</td>
    <td>${avg.toFixed(3)}</td>
  `;

    table.appendChild(row);
  });

  container.appendChild(label);
  container.appendChild(input);
  container.appendChild(btn);
  container.appendChild(currentDisplay);
}

function moveDimensionLeft() {
  moveByOne(moveDimensionData, "left");
  disableLeftAndRightButton();
}

function moveDimensionRight() {
  moveByOne(moveDimensionData, "right");
  disableLeftAndRightButton();
}

function disableLeftAndRightButton() {
  const dimensions = getAllVisibleDimensionNames();
  for (let i = 0; i < dimensions.length; i++) {
    const position = getDimensionPosition(dimensions[i]);
    const numberOfDimensions = getNumberOfDimensions();
    if (position == numberOfDimensions - 1 || position == -1) {
      document.getElementById("moveleft_" + dimensions[i]).disabled = true;
      document.getElementById("moveleft_" + dimensions[i]).innerHTML =
        '<img src="./svg/arrow-left-disabled.svg" id="moveArrow"/>';
    } else {
      document.getElementById("moveleft_" + dimensions[i]).disabled = false;
      document.getElementById("moveleft_" + dimensions[i]).innerHTML =
        '<img src="./svg/arrow-left.svg" id="moveArrow"/>';
    }

    if (position == 0 || position == -1) {
      document.getElementById("moveright_" + dimensions[i]).disabled = true;
      document.getElementById("moveright_" + dimensions[i]).innerHTML =
        '<img src="./svg/arrow-right-disabled.svg" id="moveArrow"/>';
    } else {
      document.getElementById("moveright_" + dimensions[i]).disabled = false;
      document.getElementById("moveright_" + dimensions[i]).innerHTML =
        '<img src="./svg/arrow-right.svg" id="moveArrow"/>';
    }
  }
}

function generateDropdownForFilter() {
  const container = document.getElementById("filtDimensionContainer");
  container.style.position = "relative";

  let selectButton = document.createElement("button");
  selectButton.id = "filterButton";
  selectButton.className = "ddButton";

  let textElement = document.createElement("span");
  textElement.id = "filterText";
  textElement.innerHTML =
    'Set Filter <img src="./svg/dropdown-symbol.svg" id="filter"/>';
  selectButton.appendChild(textElement);

  const dimensions = getAllVisibleDimensionNames();

  selectButton.addEventListener("click", () => {
    dimensionContainer.innerHTML = "";
    getAllVisibleDimensionNames().forEach(function (dimension) {
      if (!isDimensionCategorical(dimension)) {
        let dimensionLabel = document.createElement("label");
        dimensionLabel.className = "dropdownLabel";
        dimensionLabel.id = "filterLabel";
        let filterInput = document.createElement("input");
        filterInput.className = "inputText";
        filterInput.type = "image";
        filterInput.name = "dimension";
        filterInput.value = dimension;
        filterInput.src = "./svg/dropdown-symbol.svg";
        filterInput.id = "filter_" + dimension;
        filterInput.style.height = "0rem";
        dimensionLabel.appendChild(filterInput);
        dimensionLabel.appendChild(document.createTextNode(dimension));
        dimensionContainer.appendChild(dimensionLabel);
      }
    });
    showOptions("filterOptions", "filterButton");
    calcDDBehaviour(dimensionContainer, selectButton);
  });

  let dimensionContainer = document.createElement("div");
  dimensionContainer.id = "filterOptions";
  dimensionContainer.name = "filterOptions";
  dimensionContainer.className = "ddList";
  dimensionContainer.style.display = "none";

  if (dimensions.length > 10) {
    dimensionContainer.style.height = "12.5rem";
  }

  dimensionContainer.addEventListener("click", (event) => {
    if (event.target.value != undefined) {
      filterDimensionData = event.target.value;
      generateModuleForSetFilter();
      dimensionContainer.style.display == "none"
        ? (dimensionContainer.style.display = "block")
        : (dimensionContainer.style.display = "none");
    }
  });

  container.appendChild(selectButton);
  container.appendChild(dimensionContainer);
}

function generateModuleForSetFilter() {
  let section = document.getElementById("bottom-controls");

  let popupWindowFilter = document.createElement("div");
  popupWindowFilter.id = "filterContainer";
  popupWindowFilter.style.visibility = "visible";
  popupWindowFilter.style.display = "block";
  popupWindowFilter.style.width = 20 + "rem";
  popupWindowFilter.style.height = 8 + "rem";
  popupWindowFilter.style.backgroundColor = "white";
  popupWindowFilter.style.border = "1px solid black";

  section.appendChild(popupWindowFilter);

  let headerFilter = document.createElement("div");
  headerFilter.id = "filterHeader";
  const newText =
    filterDimensionData.length > 25
      ? filterDimensionData.substr(0, 25) + "..."
      : filterDimensionData;
  headerFilter.textContent = "Set Filter for\r\n" + newText;
  headerFilter.style.whiteSpace = "pre";
  headerFilter.style.paddingLeft = 0.5 + "rem";
  headerFilter.style.paddingTop = 0.5 + "rem";
  headerFilter.style.fontSize = "large";
  popupWindowFilter.appendChild(headerFilter);

  let closeButtonFilter = document.createElement("a");
  closeButtonFilter.id = "filterCloseButton";
  closeButtonFilter.textContent = "x";
  closeButtonFilter.style.position = "relative";
  closeButtonFilter.style.right = -18.5 + "rem";
  closeButtonFilter.style.top = -4 + "rem";
  closeButtonFilter.style.width = 2.5 + "rem";
  closeButtonFilter.style.height = 2.5 + "rem";
  closeButtonFilter.style.opacity = 0.3;
  closeButtonFilter.style.backgroundColor = "transparent";
  closeButtonFilter.style.cursor = "pointer";
  popupWindowFilter.appendChild(closeButtonFilter);

  closeButtonFilter.onclick = () => {
    popupWindowFilter.remove();
  };

  let labelMinFilter = document.createElement("label");
  labelMinFilter.id = "filterLabelMin";
  labelMinFilter.textContent = "Min";
  labelMinFilter.style.paddingLeft = 0.5 + "rem";
  popupWindowFilter.appendChild(labelMinFilter);

  let currentFilters = getFilter(filterDimensionData);

  let inputMinFilter = document.createElement("input");
  inputMinFilter.id = "filterMinValue";
  inputMinFilter.style.width = 2 + "rem";
  inputMinFilter.style.marginLeft = 0.5 + "rem";
  inputMinFilter.value = currentFilters[0].toFixed(0);
  popupWindowFilter.appendChild(inputMinFilter);

  inputMinFilter.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("onfilterButton").click();
    }
  };

  let labelMaxFilter = document.createElement("label");
  labelMaxFilter.id = "filterLabelMax";
  labelMaxFilter.textContent = "Max";
  labelMaxFilter.style.paddingLeft = 0.5 + "rem";
  popupWindowFilter.appendChild(labelMaxFilter);

  let inputMaxFilter = document.createElement("input");
  inputMaxFilter.id = "filterMaxValue";
  inputMaxFilter.style.width = 2 + "rem";
  inputMaxFilter.style.marginLeft = 0.5 + "rem";
  inputMaxFilter.value = currentFilters[1].toFixed(0);
  popupWindowFilter.appendChild(inputMaxFilter);

  inputMaxFilter.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("onfilterButton").click();
    }
  };

  let popupWindowFilterError = document.createElement("div");
  popupWindowFilterError.id = "filterError";
  popupWindowFilterError.style.position = "absolute";
  popupWindowFilter.appendChild(popupWindowFilterError);

  let filterButton = document.createElement("button");
  filterButton.id = "onfilterButton";
  filterButton.textContent = "Save";
  filterButton.style.marginLeft = 0.5 + "rem";
  filterButton.style.marginRight = 0.5 + "rem";
  filterButton.style.marginTop = 1 + "rem";
  filterButton.style.width = 6 + "rem";
  popupWindowFilter.appendChild(filterButton);

  filterButton.onclick = (event) => {
    let min = Number(inputMinFilter.value);
    let max = Number(inputMaxFilter.value);
    const limit = getDimensionRange(filterDimensionData);
    const inversionstatus = getInversionStatus(filterDimensionData);
    let isOk = true;

    let topLimit = limit[1];
    let bottomLimit = limit[0];

    if (inversionstatus === "descending") {
      if (min < topLimit) {
        min = topLimit;
        showError(
          `Min value is smaller than ${getMinValue(filterDimensionData)}.`
        );
      }
      if (max > bottomLimit) {
        max = bottomLimit;
        showError(
          `Max value is bigger than ${getMaxValue(filterDimensionData)}.`
        );
      }
    } else {
      if (min < bottomLimit) {
        min = bottomLimit;
        showError(
          `Min value is smaller than ${getMinValue(filterDimensionData)}.`
        );
      }
      if (max > topLimit) {
        max = topLimit;
        showError(
          `Max value is bigger than ${getMaxValue(filterDimensionData)}.`
        );
      }
    }

    if (isOk) {
      inversionstatus === "descending"
        ? setFilter(filterDimensionData, min, max)
        : setFilter(filterDimensionData, max, min);
      popupWindowFilter.remove();
    }
  };
}

function showError(message) {
  const popupWindowFilterError = document.getElementById("filterError");
  popupWindowFilterError.textContent = message;
  popupWindowFilterError.style.display = "block";
  popupWindowFilterError.style.paddingLeft = "0.5rem";
  popupWindowFilterError.style.paddingTop = "0.5rem";
  popupWindowFilterError.style.color = "red";
  popupWindowFilterError.style.fontSize = "x-small";
  isOk = false;
}

function generateDropdownForRange() {
  const container = document.getElementById("ranDimensionContainer");
  container.style.position = "relative";

  let selectButton = document.createElement("button");
  selectButton.id = "rangeButton";
  selectButton.className = "ddButton";

  let textElement = document.createElement("span");
  textElement.id = "rangeText";
  textElement.innerHTML =
    'Set Range <img src="./svg/dropdown-symbol.svg" id="range"/>';
  selectButton.appendChild(textElement);

  const dimensions = getAllVisibleDimensionNames();

  selectButton.addEventListener("click", () => {
    dimensionContainer.innerHTML = "";
    getAllVisibleDimensionNames().forEach(function (dimension) {
      if (!isDimensionCategorical(dimension)) {
        let dimensionLabel = document.createElement("label");
        dimensionLabel.className = "dropdownLabel";
        dimensionLabel.id = "rangeLabel";
        let rangeInput = document.createElement("input");
        rangeInput.className = "inputText";
        rangeInput.type = "image";
        rangeInput.name = "dimension";
        rangeInput.value = dimension;
        rangeInput.src = "./svg/dropdown-symbol.svg";
        rangeInput.id = "range_" + dimension;
        rangeInput.style.height = "0rem";
        dimensionLabel.appendChild(rangeInput);
        dimensionLabel.appendChild(document.createTextNode(dimension));
        dimensionContainer.appendChild(dimensionLabel);
      }
    });
    showOptions("rangeOptions", "rangeButton");
    calcDDBehaviour(dimensionContainer, selectButton);
  });

  let dimensionContainer = document.createElement("div");
  dimensionContainer.id = "rangeOptions";
  dimensionContainer.name = "rangeOptions";
  dimensionContainer.className = "ddList";
  dimensionContainer.style.display = "none";

  if (dimensions.length > 10) {
    dimensionContainer.style.height = "12.5rem";
  }

  dimensionContainer.addEventListener("click", (event) => {
    if (event.target.value != undefined) {
      rangeDimensionData = event.target.value;
      generateModuleForRangeSettings();
      dimensionContainer.style.display == "none"
        ? (dimensionContainer.style.display = "block")
        : (dimensionContainer.style.display = "none");
    }
  });

  container.appendChild(selectButton);
  container.appendChild(dimensionContainer);
}

//TODO
function generateModuleForRangeSettings() {
  let section = document.getElementById("bottom-controls");

  let popupWindowRange = document.createElement("div");
  popupWindowRange.id = "rangeContainer";
  popupWindowRange.style.visibility = "visible";
  popupWindowRange.style.display = "block";
  popupWindowRange.style.width = 20 + "rem";
  popupWindowRange.style.height = 14 + "rem";
  popupWindowRange.style.backgroundColor = "white";
  popupWindowRange.style.border = "1px solid black";

  section.appendChild(popupWindowRange);

  let headerRange = document.createElement("div");
  headerRange.id = "rangeHeader";
  const newText =
    rangeDimensionData.length > 25
      ? rangeDimensionData.substr(0, 25) + "..."
      : rangeDimensionData;
  headerRange.textContent = "Set Range for\r\n" + newText; //.replace(/(\S+\s*){1,3}/g, "$&\n");
  headerRange.style.whiteSpace = "pre";
  headerRange.style.paddingLeft = 0.5 + "rem";
  headerRange.style.paddingTop = 0.5 + "rem";
  headerRange.style.fontSize = "large";
  popupWindowRange.appendChild(headerRange);

  let closeButtonRange = document.createElement("a");
  closeButtonRange.id = "rangeCloseButton";
  closeButtonRange.textContent = "x";
  closeButtonRange.style.position = "relative";
  closeButtonRange.style.right = -18.5 + "rem";
  closeButtonRange.style.top = -3 + "rem";
  closeButtonRange.style.width = 2.5 + "rem";
  closeButtonRange.style.height = 2.5 + "rem";
  closeButtonRange.style.opacity = 0.3;
  closeButtonRange.style.backgroundColor = "transparent";
  closeButtonRange.style.cursor = "pointer";
  popupWindowRange.appendChild(closeButtonRange);

  closeButtonRange.onclick = () => {
    popupWindowRange.remove();
  };

  var resultMin =
    getCurrentMinRange(rangeDimensionData) -
      Math.floor(getCurrentMinRange(rangeDimensionData)) !==
    0;
  var resultMax =
    getCurrentMaxRange(rangeDimensionData) -
      Math.floor(getCurrentMaxRange(rangeDimensionData)) !==
    0;
  let minValue = String(getCurrentMinRange(rangeDimensionData));
  let maxValue = String(getCurrentMaxRange(rangeDimensionData));
  if (resultMin && !resultMax) {
    const count = minValue.split(".")[1].length;
    maxValue = getCurrentMaxRange(rangeDimensionData).toFixed(count);
  } else if (!resultMin && resultMax) {
    const count = maxValue.split(".")[1].length;
    minValue = getCurrentMinRange(rangeDimensionData).toFixed(count);
  }

  let infoRange = document.createElement("div");
  infoRange.id = "rangeInfo";
  infoRange.style.color = "grey";
  infoRange.style.fontSize = "smaller";
  infoRange.style.paddingLeft = 0.5 + "rem";
  infoRange.style.paddingTop = 1 + "rem";
  infoRange.style.width = 17.3 + "rem";
  infoRange.textContent =
    "The current range of " +
    rangeDimensionData +
    " is between " +
    minValue +
    " and " +
    maxValue +
    ".";
  popupWindowRange.appendChild(infoRange);

  let infoRange2 = document.createElement("div");
  infoRange2.id = "rangeInfo";
  infoRange2.style.color = "grey";
  infoRange2.style.fontSize = "smaller";
  infoRange2.style.paddingLeft = 0.5 + "rem";
  infoRange2.style.paddingTop = 1 + "rem";
  infoRange2.style.width = 17.3 + "rem";
  infoRange2.textContent =
    "The original range of " +
    rangeDimensionData +
    " is between " +
    getMinValue(rangeDimensionData) +
    " and " +
    getMaxValue(rangeDimensionData) +
    ".";
  popupWindowRange.appendChild(infoRange2);

  let labelMinRange = document.createElement("label");
  labelMinRange.id = "rangeMinLabel";
  labelMinRange.textContent = "Min";
  labelMinRange.style.paddingLeft = 0.5 + "rem";
  popupWindowRange.appendChild(labelMinRange);

  let inputMinRange = document.createElement("input");
  inputMinRange.id = "rangeMinValue";
  inputMinRange.style.width = 2 + "rem";
  inputMinRange.style.marginLeft = 0.5 + "rem";
  inputMinRange.value = minValue;
  popupWindowRange.appendChild(inputMinRange);

  inputMinRange.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("onrangeButton").click();
    }
  };

  let labelMaxRange = document.createElement("label");
  labelMaxRange.id = "rangeMaxLabel";
  labelMaxRange.textContent = "Max";
  labelMaxRange.style.paddingLeft = 0.5 + "rem";
  popupWindowRange.appendChild(labelMaxRange);

  let inputMaxRange = document.createElement("input");
  inputMaxRange.id = "rangeMaxValue";
  inputMaxRange.style.width = 2 + "rem";
  inputMaxRange.style.marginLeft = 0.5 + "rem";
  inputMaxRange.value = maxValue;
  popupWindowRange.appendChild(inputMaxRange);

  inputMaxRange.onkeydown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById("onrangeButton").click();
    }
  };

  let popupWindowRangeError = document.createElement("div");
  popupWindowRangeError.id = "rangeError";
  popupWindowRangeError.style.position = "absolute";
  popupWindowRange.appendChild(popupWindowRangeError);

  let rangeButton = document.createElement("button");
  rangeButton.id = "onrangeButton";
  rangeButton.textContent = "Save";
  rangeButton.style.marginLeft = 0.5 + "rem";
  rangeButton.style.marginRight = 0.5 + "rem";
  rangeButton.style.marginTop = 1 + "rem";
  rangeButton.style.width = 6 + "rem";
  popupWindowRange.appendChild(rangeButton);

  rangeButton.onclick = (event) => {
    let min = Number(inputMinRange.value);
    let max = Number(inputMaxRange.value);

    const inversionStatus = getInversionStatus(rangeDimensionData);
    let isOk = true;

    if (inversionStatus == "descending") {
      if (isNaN(min) || isNaN(max)) {
        alert(`Attention: Values are not numbers!`);
        isOk = false;
      }
      if (
        max < getMinValue(rangeDimensionData) ||
        min > getMaxValue(rangeDimensionData)
      ) {
        popupWindowRangeError.textContent = `The range has to be bigger than 
                    ${minValue} and ${maxValue}.`;
        popupWindowRangeError.style.display = "block";
        popupWindowRangeError.style.paddingLeft = 0.5 + "rem";
        popupWindowRangeError.style.paddingTop = 0.5 + "rem";
        popupWindowRangeError.style.color = "red";
        popupWindowRangeError.style.fontSize = "x-small";
        isOk = false;
      }
    } else {
      if (isNaN(min) || isNaN(max)) {
        alert(`Attention: Values are not numbers!`);
        isOk = false;
      }

      if (
        min > getMinValue(rangeDimensionData) ||
        max < getMaxValue(rangeDimensionData)
      ) {
        popupWindowRangeError.textContent = `The range has to be bigger than 
                        ${minValue} and ${maxValue}.`;
        popupWindowRangeError.style.display = "block";
        popupWindowRangeError.style.paddingLeft = 0.5 + "rem";
        popupWindowRangeError.style.paddingTop = 0.5 + "rem";
        popupWindowRangeError.style.paddingBottom = 0.5 + "rem";
        popupWindowRangeError.style.paddingRight = 0.5 + "rem";
        popupWindowRangeError.style.color = "red";
        popupWindowRangeError.style.fontSize = "x-small";
        isOk = false;
      }
    }
    if (isOk) {
      popupWindowRangeError.style.display = "none";
      setDimensionRange(rangeDimensionData, min, max);
      popupWindowRange.style.display = "none";
    } else {
      popupWindowRange.style.display = "visible";
    }
  };
}

function resetToOriginalRange() {
  const dimensions = getAllVisibleDimensionNames();
  dimensions.forEach(function (dimension) {
    if (!isNaN(getMinValue(dimension))) {
      let min = getMinValue(dimension);
      let max = getMaxValue(dimension);
      setDimensionRange(dimension, min, max);
    }
  });
}

function resetToRoundedRange() {
  const dimensions = getAllVisibleDimensionNames();
  dimensions.forEach(function (dimension) {
    if (!isNaN(getMinValue(dimension))) {
      let min = getMinValue(dimension);
      let max = getMaxValue(dimension);
      setDimensionRangeRounded(dimension, min, max);
    }
  });
}

function resetAll() {
  let reloadedData = loadCSV(data);
  drawChart(reloadedData);
}

function generateDropdownForSelectRecords() {
  let records = getAllRecords();

  const container = document.getElementById("selRecordsContainer");
  container.style.position = "relative";

  let selectButton = document.createElement("button");
  selectButton.id = "selectButtonR";
  selectButton.className = "ddButton";
  selectButton.addEventListener("click", () => {
    showOptionsForRecords("options_r", "selectButtonR");
    calcDDBehaviour(recordsContainer, selectButton);
  });

  let textElement = document.createElement("span");
  textElement.id = "selectText";
  textElement.innerHTML =
    'Select Records <img src="./svg/dropdown-symbol.svg" id="select"/>';
  selectButton.appendChild(textElement);

  let recordsContainer = document.createElement("div");
  recordsContainer.id = "options_r";
  recordsContainer.name = "options_r";
  recordsContainer.className = "ddList";
  recordsContainer.style.display = "none";

  if (records.length > 10) {
    recordsContainer.style.height = "12.5rem";
  }

  recordsContainer.addEventListener("change", (event) => {
    var line = document.getElementsByClassName(event.target.value);
    const element = line[0];
    const computedStyle = window.getComputedStyle(element);
    const strokeColor = computedStyle.stroke;
    if (strokeColor !== "rgb(211, 211, 211)") {
      toggleSelection(event.target.value);
    }
  });

  records.forEach(function (record) {
    let label = document.createElement("div");
    label.className = "dropdownLabel";
    label.id = "selectLabel";
    let input = document.createElement("input");
    input.type = "checkbox";
    input.className = "inputFields";
    input.id = "sel_" + record;
    input.value = record;
    input.name = "record";
    input.checked = false;
    let textLabel = document.createElement("label");
    textLabel.textContent = record;
    textLabel.id = "selectLabel";
    label.appendChild(input);
    label.appendChild(textLabel);
    recordsContainer.appendChild(label);
  });

  container.appendChild(selectButton);
  container.appendChild(recordsContainer);
}

function clearPlot() {
  const parentElement = document.getElementById("parallelcoords");
  const invertContainer = document.getElementById("invDimensionContainer");
  const hideContainer = document.getElementById("hideDimensionContainer");
  const moveContainer = document.getElementById("moDimensionContainer");
  const filterDimensionContainer = document.getElementById(
    "filtDimensionContainer"
  );
  const rangeDimensionContainer = document.getElementById(
    "ranDimensionContainer"
  );
  const selectRecordsContainer = document.getElementById("selRecordsContainer");

  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  while (invertContainer.firstChild) {
    invertContainer.removeChild(invertContainer.firstChild);
  }
  while (hideContainer.firstChild) {
    hideContainer.removeChild(hideContainer.firstChild);
  }
  while (moveContainer.firstChild) {
    moveContainer.removeChild(moveContainer.firstChild);
  }
  while (filterDimensionContainer.firstChild) {
    filterDimensionContainer.removeChild(filterDimensionContainer.firstChild);
  }
  while (rangeDimensionContainer.firstChild) {
    rangeDimensionContainer.removeChild(rangeDimensionContainer.firstChild);
  }
  while (selectRecordsContainer.firstChild) {
    selectRecordsContainer.removeChild(selectRecordsContainer.firstChild);
  }
}
