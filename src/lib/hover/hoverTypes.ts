export type SelectionMode = "hover" | "line" | "box";

export interface DrawState {
  isDrawing: boolean;
  wasDrawing: boolean;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface HoverResult {
  hoveredIds: Set<string>;
  hoveredList: string[];
  selectionMode: SelectionMode;
}

export interface DetectionParams {
  mouseX: number;
  mouseY: number;
  mode: SelectionMode;
  drawStart?: { x: number; y: number };
  drawEnd?: { x: number; y: number };
  offset?: { x: number; y: number };
}

export interface HoverDetectionConfig {
  hoverDistance: number;
  maxPointsPerLine: number;
}

export interface IHoverDetectionBackend {
  init(lineCount: number, config: HoverDetectionConfig): Promise<void>;
  updateLineData(lineData: Float32Array): void;
  detect(params: DetectionParams): Promise<Uint32Array>;
  isAvailable(): boolean;
  destroy(): void;
}

export type BackendFactory = () => IHoverDetectionBackend;

export const DEFAULT_CONFIG: HoverDetectionConfig = {
  hoverDistance: 2,
  maxPointsPerLine: 256,
};