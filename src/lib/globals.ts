export let padding: number;
export let paddingXaxis: number;
export let width: number;
export let height: number;
export let yAxis: {};
export let selected: [];
export let parcoords: {
  xScales: any;
  yScales: Record<string, any>;
  dragging: Record<string, any>;
  dragPosStart: Record<string, any>;
  currentPosOfDims: any;
  newFeatures: any;
  features: any[];
  newDataset: any;
  data: any;
} = {
  xScales: {},
  yScales: {},
  dragging: {},
  dragPosStart: {},
  currentPosOfDims: [],
  newFeatures: null,
  features: [],
  newDataset: null,
  data: null,
};
export let active: any;
export let key: string;
export let svg: any;
export let hoverlabel: string;
export let refreshData: any;
export let initDimension: any;
export let canvasEl: HTMLCanvasElement | null = null;

export type GraphicsWebTech = "Canvas2D" | "SVG-DOM" | "WebGL" | "WebGPU";
export let currWebTech: GraphicsWebTech = "SVG-DOM";
export type StudentDataset = "default" | "100" | "1000" | "10000" | "100000";
export let currDataset: StudentDataset = "default";
export const lineState: Record<string, { active: boolean }> = {};

export type BenchmarkData = {
  numOfIterations: number | null;
  avgSpeedTime: number | null;
};
export let benchmarkData: BenchmarkData = {
  numOfIterations: null,
  avgSpeedTime: null,
};

export function setBenchmarkData(newBenchmarkData) {
  benchmarkData = newBenchmarkData;
}

export function setDataset(dataset: StudentDataset) {
  currDataset = dataset;
}

export function makeLineInactiveCanvas(currentLineName: string) {
  lineState[currentLineName] = { active: false };
}

export function makeLineActiveCanvas(currentLineName: string) {
  lineState[currentLineName] = { active: true };
}

export function setCurrentWebTech(webTech: GraphicsWebTech) {
  currWebTech = webTech;
}

export function setCanvasEl(newCanvasEl: HTMLCanvasElement) {
  canvasEl = newCanvasEl;
}

export function setHoverLabel(label: string): void {
  hoverlabel = label;
}

export function setYaxis(axis: any): void {
  yAxis = axis;
}

export function setRefreshData(data: any): void {
  refreshData = data;
}

export function setSvg(svgData: any): void {
  svg = svgData;
}

export function setWidth(value: number): void {
  width = value;
}

export function setHeight(value: number): void {
  height = value;
}

export function setPadding(value: number): void {
  padding = value;
}

export function setPaddingXaxis(value: number): void {
  paddingXaxis = value;
}

export function setInitDimension(dimensions: any): void {
  initDimension = dimensions;
}

export function setActive(paths: any): void {
  active = paths;
}

export function setParcoords(value: typeof parcoords) {
  parcoords = value;
}

export function setXScales(value: any): void {
  parcoords.xScales = value;
}

export function setYScales(value: Record<string, any>): void {
  parcoords.yScales = value;
}

export function setDragging(value: Record<string, any>): void {
  parcoords.dragging = value;
}

export function setDragPosStart(value: Record<string, any>): void {
  parcoords.dragPosStart = value;
}

export function setCurrentPosOfDims(value: any): void {
  parcoords.currentPosOfDims = value;
}

export function setNewFeatures(value: any): void {
  parcoords.newFeatures = value;
}

export function setFeatures(value: any[]): void {
  parcoords.features = value;
}

export function setNewDataset(value: any): void {
  parcoords.newDataset = value;
}

export function setData(value: any): void {
  parcoords.data = value;
}

export function setKey(value: string): void {
  key = value;
}
