/**
 * Canvas & Ratio Utilities
 * Mathematical calculations for aspect ratio conforming, fit, and fill
 */

import { AspectRatioType } from '../../types/project';

export interface AspectRatioDimension {
  ratio: AspectRatioType;
  label: string;
  width: number;
  height: number;
  aspect: number; // width / height
  description: string;
}

export const ASPECT_RATIOS: AspectRatioDimension[] = [
  {
    ratio: '9:16',
    label: '9:16',
    width: 9,
    height: 16,
    aspect: 9 / 16,
    description: 'Reels / Shorts / TikTok',
  },
  {
    ratio: '1:1',
    label: '1:1',
    width: 1,
    height: 1,
    aspect: 1,
    description: 'Square / Post',
  },
  {
    ratio: '16:9',
    label: '16:9',
    width: 16,
    height: 9,
    aspect: 16 / 9,
    description: 'Landscape / YouTube',
  },
  {
    ratio: '4:5',
    label: '4:5',
    width: 4,
    height: 5,
    aspect: 4 / 5,
    description: 'Instagram Portrait',
  },
  {
    ratio: 'original',
    label: 'Original',
    width: 0,
    height: 0,
    aspect: 0,
    description: 'Match Source Media',
  },
];

/**
 * Returns aspect ratio multiplier for container fitting
 */
export function getAspectRatioValue(
  ratio: AspectRatioType,
  sourceWidth: number = 1080,
  sourceHeight: number = 1920,
): number {
  if (ratio === 'original') {
    return sourceHeight > 0 ? sourceWidth / sourceHeight : 9 / 16;
  }
  const config = ASPECT_RATIOS.find(r => r.ratio === ratio);
  return config ? config.aspect : 9 / 16;
}

/**
 * Calculate preview container bounds while preserving canvas aspect ratio
 */
export function calculateCanvasPreviewBounds(
  canvasRatio: AspectRatioType,
  containerWidth: number,
  containerHeight: number,
  sourceWidth: number = 1080,
  sourceHeight: number = 1920,
): { width: number; height: number } {
  const targetAspect = getAspectRatioValue(
    canvasRatio,
    sourceWidth,
    sourceHeight,
  );
  const containerAspect = containerWidth / Math.max(1, containerHeight);

  if (containerAspect > targetAspect) {
    // Height constrained
    const height = containerHeight;
    const width = height * targetAspect;
    return { width, height };
  } else {
    // Width constrained
    const width = containerWidth;
    const height = width / targetAspect;
    return { width, height };
  }
}
