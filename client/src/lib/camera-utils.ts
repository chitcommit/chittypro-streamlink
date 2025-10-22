export interface CameraPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutConfig {
  id: string;
  name: string;
  positions: Record<string, CameraPosition>;
}

export const DEFAULT_LAYOUTS: LayoutConfig[] = [
  {
    id: "grid-2x2",
    name: "2x2 Grid",
    positions: {
      "0": { x: 0, y: 0, width: 1, height: 1 },
      "1": { x: 1, y: 0, width: 1, height: 1 },
      "2": { x: 0, y: 1, width: 1, height: 1 },
      "3": { x: 1, y: 1, width: 1, height: 1 },
    }
  },
  {
    id: "grid-3x3",
    name: "3x3 Grid",
    positions: {
      "0": { x: 0, y: 0, width: 1, height: 1 },
      "1": { x: 1, y: 0, width: 1, height: 1 },
      "2": { x: 2, y: 0, width: 1, height: 1 },
      "3": { x: 0, y: 1, width: 1, height: 1 },
      "4": { x: 1, y: 1, width: 1, height: 1 },
      "5": { x: 2, y: 1, width: 1, height: 1 },
      "6": { x: 0, y: 2, width: 1, height: 1 },
      "7": { x: 1, y: 2, width: 1, height: 1 },
      "8": { x: 2, y: 2, width: 1, height: 1 },
    }
  },
  {
    id: "focus-main",
    name: "Focus + Thumbnails",
    positions: {
      "0": { x: 0, y: 0, width: 2, height: 2 },
      "1": { x: 2, y: 0, width: 1, height: 1 },
      "2": { x: 2, y: 1, width: 1, height: 1 },
    }
  }
];

export function calculateGridPositions(
  containerWidth: number,
  containerHeight: number,
  columns: number,
  rows: number,
  gap: number = 16
): CameraPosition[] {
  const positions: CameraPosition[] = [];
  const cellWidth = (containerWidth - (columns - 1) * gap) / columns;
  const cellHeight = (containerHeight - (rows - 1) * gap) / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      positions.push({
        x: col * (cellWidth + gap),
        y: row * (cellHeight + gap),
        width: cellWidth,
        height: cellHeight
      });
    }
  }

  return positions;
}

export function getOptimalGridSize(cameraCount: number): { columns: number; rows: number } {
  if (cameraCount <= 1) return { columns: 1, rows: 1 };
  if (cameraCount <= 4) return { columns: 2, rows: 2 };
  if (cameraCount <= 6) return { columns: 3, rows: 2 };
  if (cameraCount <= 9) return { columns: 3, rows: 3 };
  if (cameraCount <= 12) return { columns: 4, rows: 3 };
  return { columns: 4, rows: 4 };
}

export function validateStreamUrl(url: string): boolean {
  const rtspRegex = /^rtsp:\/\/.+/;
  const httpRegex = /^https?:\/\/.+/;
  return rtspRegex.test(url) || httpRegex.test(url);
}

export function formatCameraResolution(resolution: string): string {
  const resolutionMap: Record<string, string> = {
    "720p": "1280×720",
    "1080p": "1920×1080",
    "4K": "3840×2160",
    "8K": "7680×4320"
  };
  
  return resolutionMap[resolution] || resolution;
}

export function generateCameraId(): string {
  return `cam-${Date.now()}`;
}

export function parsePTZDirection(direction: string): { 
  pan: number; 
  tilt: number; 
  zoom: number 
} {
  const commands: Record<string, { pan: number; tilt: number; zoom: number }> = {
    "up": { pan: 0, tilt: 1, zoom: 0 },
    "down": { pan: 0, tilt: -1, zoom: 0 },
    "left": { pan: -1, tilt: 0, zoom: 0 },
    "right": { pan: 1, tilt: 0, zoom: 0 },
    "up-left": { pan: -1, tilt: 1, zoom: 0 },
    "up-right": { pan: 1, tilt: 1, zoom: 0 },
    "down-left": { pan: -1, tilt: -1, zoom: 0 },
    "down-right": { pan: 1, tilt: -1, zoom: 0 },
    "zoom-in": { pan: 0, tilt: 0, zoom: 1 },
    "zoom-out": { pan: 0, tilt: 0, zoom: -1 },
    "center": { pan: 0, tilt: 0, zoom: 0 }
  };

  return commands[direction] || { pan: 0, tilt: 0, zoom: 0 };
}
