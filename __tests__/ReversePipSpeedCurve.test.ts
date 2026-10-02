import {
  calculateEffectiveClipDuration,
  calculateCurveAverageSpeed,
  findClipAtTimelineTime,
} from '../src/utils/timeUtils';
import { MediaClip, SpeedCurve } from '../src/types/project';

describe('Reverse, Speed Curves, and PIP Timeline Calculations', () => {
  const baseClip: MediaClip = {
    id: 'clip_1',
    uri: 'file:///data/clip1.mp4',
    name: 'Sample Clip',
    type: 'video',
    duration: 10,
    originalDuration: 10,
    trimStart: 0,
    trimEnd: 10,
    speed: 1.0,
    volume: 1.0,
    isMuted: false,
    rotation: 0,
    flipHorizontal: false,
    flipVertical: false,
    crop: null,
    filterId: 'none',
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      temperature: 0,
      highlights: 0,
      shadows: 0,
      sharpen: 0,
    },
    transition: { type: 'none', duration: 0.5 },
    width: 1920,
    height: 1080,
  };

  test('normal forward playback advances localTime from trimStart to trimEnd', () => {
    const clips = [baseClip];
    const at0 = findClipAtTimelineTime(clips, 0);
    expect(at0?.localTime).toBe(0);

    const at5 = findClipAtTimelineTime(clips, 5);
    expect(at5?.localTime).toBe(5);

    const at10 = findClipAtTimelineTime(clips, 10);
    expect(at10?.localTime).toBe(10);
  });

  test('reversed video playback plays localTime backward from trimEnd to trimStart', () => {
    const reversedClip: MediaClip = {
      ...baseClip,
      isReversed: true,
    };
    const clips = [reversedClip];

    const at0 = findClipAtTimelineTime(clips, 0);
    expect(at0?.localTime).toBe(10); // Starts at end of clip

    const at3 = findClipAtTimelineTime(clips, 3);
    expect(at3?.localTime).toBe(7); // 10 - 3 = 7

    const at10 = findClipAtTimelineTime(clips, 10);
    expect(at10?.localTime).toBe(0); // Ends at start of clip
  });

  test('calculates average speed from a speed curve', () => {
    const montageCurve: SpeedCurve = {
      preset: 'montage',
      points: [
        { time: 0, speed: 2.5 },
        { time: 0.3, speed: 1.2 },
        { time: 0.5, speed: 0.4 },
        { time: 0.7, speed: 1.2 },
        { time: 1.0, speed: 2.0 },
      ],
    };

    const avg = calculateCurveAverageSpeed(montageCurve);
    // (2.5 + 1.2 + 0.4 + 1.2 + 2.0) / 5 = 7.3 / 5 = 1.46
    expect(avg).toBe(1.46);
  });

  test('calculates effective clip duration with speed curve applied', () => {
    const heroCurve: SpeedCurve = {
      preset: 'hero',
      points: [
        { time: 0, speed: 3.0 },
        { time: 0.4, speed: 1.8 },
        { time: 0.7, speed: 1.0 },
        { time: 1.0, speed: 1.0 },
      ],
    };
    // avg = (3.0 + 1.8 + 1.0 + 1.0) / 4 = 6.8 / 4 = 1.7
    // raw duration = 10s - 0s = 10s
    // effective duration = 10 / 1.7 = 5.882s
    const duration = calculateEffectiveClipDuration(10, 0, 10, 1.0, heroCurve);
    expect(duration).toBeCloseTo(5.882, 2);
  });

  test('flat speed calculation unchanged when curve preset is none', () => {
    const noneCurve: SpeedCurve = {
      preset: 'none',
      points: [],
    };
    const duration = calculateEffectiveClipDuration(10, 0, 10, 2.0, noneCurve);
    expect(duration).toBe(5.0);
  });
});
