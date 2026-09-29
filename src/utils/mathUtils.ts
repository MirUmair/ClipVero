/**
 * Math & Snapping helpers
 */

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function snapToNearest(
  value: number,
  snapPoints: number[],
  threshold: number = 0.2,
): number {
  let closest = value;
  let minDiff = Infinity;

  for (const point of snapPoints) {
    const diff = Math.abs(value - point);
    if (diff < minDiff && diff <= threshold) {
      minDiff = diff;
      closest = point;
    }
  }

  return closest;
}
