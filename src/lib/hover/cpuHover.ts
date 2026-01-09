import {
  IHoverDetectionBackend,
  HoverDetectionConfig,
  DetectionParams,
  DEFAULT_CONFIG,
} from "./hoverTypes";

export class CPUHoverBackend implements IHoverDetectionBackend {
  private lineCount: number = 0;
  private config: HoverDetectionConfig = DEFAULT_CONFIG;
  private lineData: Float32Array | null = null;

  private dimensionXPositions: number[] = [];

  isAvailable(): boolean {
    return true;
  }

  async init(lineCount: number, config: HoverDetectionConfig): Promise<void> {
    this.lineCount = lineCount;
    this.config = config;
    this.lineData = null;
    this.dimensionXPositions = [];
  }

  updateLineData(lineData: Float32Array): void {
    this.lineData = new Float32Array(lineData);
    this.extractDimensionPositions();
  }

  private extractDimensionPositions(): void {
    if (!this.lineData || this.lineCount === 0) return;

    this.dimensionXPositions = [];
    const maxPts = this.config.maxPointsPerLine;

    for (let i = 0; i < maxPts; i++) {
      const idx = i * 2;
      const x = this.lineData[idx];
      const y = this.lineData[idx + 1];

      if (i > 0 && x === 0 && y === 0) break;

      this.dimensionXPositions.push(x);
    }
  }

  private findSegmentIndex(x: number): number {
    const positions = this.dimensionXPositions;
    if (positions.length < 2) return -1;

    for (let i = 0; i < positions.length - 1; i++) {
      const leftX = positions[i];
      const rightX = positions[i + 1];

      const minX = Math.min(leftX, rightX);
      const maxX = Math.max(leftX, rightX);

      if (x >= minX && x <= maxX) {
        return i;
      }
    }

    return -1;
  }

  private findSegmentRange(minX: number, maxX: number): [number, number] {
    const positions = this.dimensionXPositions;
    if (positions.length < 2) return [-1, -1];

    let startIdx = -1;
    let endIdx = -1;

    for (let i = 0; i < positions.length - 1; i++) {
      const segMinX = Math.min(positions[i], positions[i + 1]);
      const segMaxX = Math.max(positions[i], positions[i + 1]);

      if (segMaxX >= minX && segMinX <= maxX) {
        if (startIdx === -1) startIdx = i;
        endIdx = i;
      }
    }

    return [startIdx, endIdx];
  }

  async detect(params: DetectionParams): Promise<Uint32Array> {
    if (!this.lineData) {
      return new Uint32Array(this.lineCount);
    }

    const results = new Uint32Array(this.lineCount);
    const { hoverDistance } = this.config;

    if (params.mode === "hover") {
      const segIdx = this.findSegmentIndex(params.mouseX);

      if (segIdx === -1) {
        return results;
      }

      for (let lineIdx = 0; lineIdx < this.lineCount; lineIdx++) {
        if (
          this.detectHoverInSegment(
            lineIdx,
            segIdx,
            params.mouseX,
            params.mouseY,
            hoverDistance
          )
        ) {
          results[lineIdx] = 1;
        }
      }
    } else if (params.mode === "line" && params.drawStart && params.drawEnd) {
      // For line selection, find all segments the line might cross
      const minX = Math.min(params.drawStart.x, params.drawEnd.x);
      const maxX = Math.max(params.drawStart.x, params.drawEnd.x);
      const [startIdx, endIdx] = this.findSegmentRange(minX, maxX);

      if (startIdx === -1) {
        return results;
      }

      for (let lineIdx = 0; lineIdx < this.lineCount; lineIdx++) {
        if (
          this.detectLineIntersectionInRange(
            lineIdx,
            startIdx,
            endIdx,
            params.drawStart,
            params.drawEnd
          )
        ) {
          results[lineIdx] = 1;
        }
      }
    } else if (params.mode === "box" && params.drawStart && params.drawEnd) {
      // For box selection, find all segments the box might overlap
      const minX = Math.min(params.drawStart.x, params.drawEnd.x);
      const maxX = Math.max(params.drawStart.x, params.drawEnd.x);
      const [startIdx, endIdx] = this.findSegmentRange(minX, maxX);

      if (startIdx === -1) {
        return results;
      }

      for (let lineIdx = 0; lineIdx < this.lineCount; lineIdx++) {
        if (
          this.detectBoxIntersectionInRange(
            lineIdx,
            startIdx,
            endIdx,
            params.drawStart,
            params.drawEnd
          )
        ) {
          results[lineIdx] = 1;
        }
      }
    }

    return results;
  }

  destroy(): void {
    this.lineData = null;
    this.dimensionXPositions = [];
  }

  private detectHoverInSegment(
    lineIdx: number,
    segmentIdx: number,
    mouseX: number,
    mouseY: number,
    hoverDistance: number
  ): boolean {
    const maxPts = this.config.maxPointsPerLine;
    const idx = (lineIdx * maxPts + segmentIdx) * 2;

    const p1x = this.lineData![idx];
    const p1y = this.lineData![idx + 1];
    const p2x = this.lineData![idx + 2];
    const p2y = this.lineData![idx + 3];

    const dist = this.pointToSegmentDistance(
      mouseX,
      mouseY,
      p1x,
      p1y,
      p2x,
      p2y
    );
    return dist < hoverDistance;
  }

  private detectLineIntersectionInRange(
    lineIdx: number,
    startIdx: number,
    endIdx: number,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): boolean {
    const maxPts = this.config.maxPointsPerLine;

    for (let i = startIdx; i <= endIdx; i++) {
      const idx = (lineIdx * maxPts + i) * 2;
      const p1x = this.lineData![idx];
      const p1y = this.lineData![idx + 1];
      const p2x = this.lineData![idx + 2];
      const p2y = this.lineData![idx + 3];

      if (
        this.lineSegmentsIntersect(
          start.x,
          start.y,
          end.x,
          end.y,
          p1x,
          p1y,
          p2x,
          p2y
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private detectBoxIntersectionInRange(
    lineIdx: number,
    startIdx: number,
    endIdx: number,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): boolean {
    const maxPts = this.config.maxPointsPerLine;
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    for (let i = startIdx; i <= endIdx; i++) {
      const idx = (lineIdx * maxPts + i) * 2;
      const p1x = this.lineData![idx];
      const p1y = this.lineData![idx + 1];
      const p2x = this.lineData![idx + 2];
      const p2y = this.lineData![idx + 3];

      // Skip invalid segments
      const dist = Math.hypot(p2x - p1x, p2y - p1y);
      if (dist < 0.001) continue;

      if (
        this.lineSegmentIntersectsBox(
          p1x,
          p1y,
          p2x,
          p2y,
          minX,
          maxX,
          minY,
          maxY
        )
      ) {
        return true;
      }
    }
    return false;
  }

  private pointToSegmentDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const pax = px - x1;
    const pay = py - y1;
    const bax = x2 - x1;
    const bay = y2 - y1;

    const dotBA = bax * bax + bay * bay;
    if (dotBA === 0) {
      return Math.hypot(pax, pay);
    }

    const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / dotBA));
    const projX = pax - bax * h;
    const projY = pay - bay * h;

    return Math.hypot(projX, projY);
  }

  private lineSegmentsIntersect(
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    p3x: number,
    p3y: number,
    p4x: number,
    p4y: number
  ): boolean {
    const denom = (p4y - p3y) * (p2x - p1x) - (p4x - p3x) * (p2y - p1y);
    if (Math.abs(denom) < 0.0001) return false;

    const ua = ((p4x - p3x) * (p1y - p3y) - (p4y - p3y) * (p1x - p3x)) / denom;
    const ub = ((p2x - p1x) * (p1y - p3y) - (p2y - p1y) * (p1x - p3x)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }

  private lineSegmentIntersectsBox(
    p1x: number,
    p1y: number,
    p2x: number,
    p2y: number,
    minX: number,
    maxX: number,
    minY: number,
    maxY: number
  ): boolean {
    if (
      (p1x >= minX && p1x <= maxX && p1y >= minY && p1y <= maxY) ||
      (p2x >= minX && p2x <= maxX && p2y >= minY && p2y <= maxY)
    ) {
      return true;
    }

    const edges: [number, number, number, number][] = [
      [minX, minY, maxX, minY], // top
      [maxX, minY, maxX, maxY], // right
      [maxX, maxY, minX, maxY], // bottom
      [minX, maxY, minX, minY], // left
    ];

    for (const [ex1, ey1, ex2, ey2] of edges) {
      if (this.lineSegmentsIntersect(p1x, p1y, p2x, p2y, ex1, ey1, ex2, ey2)) {
        return true;
      }
    }

    return false;
  }
}
