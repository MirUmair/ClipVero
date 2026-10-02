import { MediaClip, SpeedCurve } from '../types/project';

/**
 * Calculates average speed from a speed curve
 */
export function calculateCurveAverageSpeed(curve?: SpeedCurve): number {
  if (
    !curve ||
    !curve.points ||
    curve.points.length === 0 ||
    curve.preset === 'none'
  ) {
    return 1.0;
  }
  const sum = curve.points.reduce((acc, p) => acc + p.speed, 0);
  return Number((sum / curve.points.length).toFixed(2));
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  if (hrs > 0) {
    const paddedHrs = hrs.toString().padStart(2, '0');
    return `${paddedHrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${paddedMins}:${paddedSecs}`;
}

/**
 * Format seconds with tenths: mm:ss.s
 */
export function formatDurationTenths(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return '00:00.0';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);

  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');

  return `${paddedMins}:${paddedSecs}.${tenths}`;
}

/**
 * Calculates effective playback duration of a clip accounting for trim and playback speed.
 * Formula: (trimEnd - trimStart) / speed
 */
export function calculateEffectiveClipDuration(
  originalDuration: number,
  trimStart: number,
  trimEnd: number,
  speed: number = 1.0,
  speedCurve?: SpeedCurve,
): number {
  const safeStart = Math.max(0, trimStart);
  const safeEnd = Math.min(
    originalDuration,
    Math.max(safeStart + 0.1, trimEnd),
  );
  const rawDuration = safeEnd - safeStart;
  const effectiveSpeed =
    speedCurve && speedCurve.preset !== 'none'
      ? calculateCurveAverageSpeed(speedCurve)
      : Math.max(0.1, speed);
  return Number((rawDuration / effectiveSpeed).toFixed(3));
}

/**
 * Calculates total duration of project by summing effective durations of all clips.
 */
export function calculateProjectTotalDuration(clips: MediaClip[]): number {
  if (!clips || clips.length === 0) {
    return 0;
  }
  const total = clips.reduce((acc, clip) => {
    return acc + (clip.duration || 0);
  }, 0);
  return Number(total.toFixed(3));
}

/**
 * Given a project timeline time (in seconds), finds which clip is playing,
 * its index, and the clip's local timeline time (in raw media time accounting for speed, trim, and reverse).
 */
export function findClipAtTimelineTime(
  clips: MediaClip[],
  time: number,
): {
  clip: MediaClip;
  clipIndex: number;
  clipStartTime: number;
  clipEndTime: number;
  localTime: number; // raw media timestamp
} | null {
  if (!clips || clips.length === 0) {
    return null;
  }

  let accumulatedTime = 0;
  const clampedTime = Math.max(0, time);

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipDuration = clip.duration || 0;
    const clipEndTime = accumulatedTime + clipDuration;

    // Check if within bounds, or if it's the last clip and at the exact end
    if (
      clampedTime >= accumulatedTime &&
      (clampedTime < clipEndTime || i === clips.length - 1)
    ) {
      const elapsedInClip = clampedTime - accumulatedTime;
      const effectiveSpeed =
        clip.speedCurve && clip.speedCurve.preset !== 'none'
          ? calculateCurveAverageSpeed(clip.speedCurve)
          : clip.speed || 1.0;

      const rawMediaTime = clip.isReversed
        ? clip.trimEnd - elapsedInClip * effectiveSpeed
        : clip.trimStart + elapsedInClip * effectiveSpeed;

      return {
        clip,
        clipIndex: i,
        clipStartTime: accumulatedTime,
        clipEndTime,
        localTime: Math.min(
          clip.trimEnd,
          Math.max(clip.trimStart, rawMediaTime),
        ),
      };
    }

    accumulatedTime = clipEndTime;
  }

  return null;
}

/**
 * Returns timeline start and end times for a specific clip index.
 */
export function getClipTimelineRange(
  clips: MediaClip[],
  clipIndex: number,
): { start: number; end: number } {
  if (!clips || clipIndex < 0 || clipIndex >= clips.length) {
    return { start: 0, end: 0 };
  }

  let start = 0;
  for (let i = 0; i < clipIndex; i++) {
    start += clips[i].duration || 0;
  }

  return {
    start: Number(start.toFixed(3)),
    end: Number((start + (clips[clipIndex].duration || 0)).toFixed(3)),
  };
}
