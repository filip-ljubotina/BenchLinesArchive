import { canvasEl } from "./globals";


let labelsContainer: HTMLDivElement | null = null;
let activeLabels: HTMLDivElement[] = [];

export function createLabelsContainer() {
  labelsContainer = document.createElement("div");
  labelsContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: visible;
  `;

  const parent = canvasEl.parentElement;
  if (parent) {
    const parentStyle = getComputedStyle(parent);
    if (parentStyle.position === "static") {
      parent.style.position = "relative";
    }
    parent.appendChild(labelsContainer);
  }
}

export function createDataPointLabel(
  x: number,
  y: number,
  value: string | number,
  isName: boolean = false
): HTMLDivElement {
  const label = document.createElement("div");

  label.style.cssText = `
    position: absolute;
    left: ${x}px;
    top: ${y}px;
    transform: translate(-50%, -100%) translateY(-8px);
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid #ccc;
    border-radius: 3px;
    padding: 2px 6px;
    font-family: Arial, sans-serif;
    font-size: 12px;
    font-weight: bold;
    color: #cc0000;
    white-space: nowrap;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    z-index: 1000;
    pointer-events: none;
  `;

  if (isName) {
    label.style.color = "#cc0000";
    label.style.fontSize = "13px";
  }

  label.textContent = String(value);

  return label;
}

export function showDataPointLabels(parcoords: any, data: any) {
  if (!labelsContainer || !parcoords) return;

  clearDataPointLabels();

  parcoords.newFeatures.forEach((name: string, index: number) => {
    const value = data[name];
    if (value === undefined || value === null) return;

    const x = parcoords.dragging[name] ?? parcoords.xScales(name);
    const y = parcoords.yScales[name](value);

    const isName = index === 0 || typeof value === "string";

    const label = createDataPointLabel(x, y, value, isName);

    labelsContainer!.appendChild(label);
    activeLabels.push(label);
  });
}

export function clearDataPointLabels() {
  activeLabels.forEach((label) => {
    label.remove();
  });
  activeLabels = [];
}
