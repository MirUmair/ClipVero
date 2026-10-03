import {
  calculateEffectiveClipDuration,
  findClipAtTimelineTime,
  calculateProjectTotalDuration,
} from '../src/utils/timeUtils';
import { MediaClip } from '../src/types/project';

describe('Trim Video Logic and Duration Calculations', () => {
  const baseClip: MediaClip = {
    id: 'clip_trim_1',
    uri: 'file:///sample1.mp4',
    name: 'Trim Sample',
    type: 'video',
    duration: 15.0,
    originalDuration: 15.0,
    trimStart: 0,
    trimEnd: 15.0,
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
    width: 1080,
    height: 1920,
  };

  test('calculates trimmed duration properly', () => {
    const trimmedDuration = calculateEffectiveClipDuration(15.0, 2.5, 7.5, 1.0);
    expect(trimmedDuration).toBe(5.0);
  });

  test('calculates trimmed duration with 2x speed', () => {
    const trimmedFastDuration = calculateEffectiveClipDuration(15.0, 2.0, 10.0, 2.0);
    expect(trimmedFastDuration).toBe(4.0);
  });

  test('handles boundary clamping safely if trimStart >= trimEnd', () => {
    const safeDuration = calculateEffectiveClipDuration(15.0, 10.0, 5.0, 1.0);
    expect(safeDuration).toBeGreaterThan(0);
  });

  test('updates timeline playhead location within trimmed bounds', () => {
    const trimmedClip: MediaClip = {
      ...baseClip,
      trimStart: 3.0,
      trimEnd: 8.0,
      duration: 5.0,
    };
    const clips = [trimmedClip];

    const atStart = findClipAtTimelineTime(clips, 0);
    expect(atStart?.localTime).toBe(3.0);

    const atMid = findClipAtTimelineTime(clips, 2.5);
    expect(atMid?.localTime).toBe(5.5);

    const atEnd = findClipAtTimelineTime(clips, 5.0);
    expect(atEnd?.localTime).toBe(8.0);
  });

  test('updates project total duration after clip trim', () => {
    const clip1: MediaClip = { ...baseClip, id: 'c1', duration: 5.0, trimStart: 1, trimEnd: 6 };
    const clip2: MediaClip = { ...baseClip, id: 'c2', duration: 7.0, trimStart: 0, trimEnd: 7 };
    const total = calculateProjectTotalDuration([clip1, clip2]);
    expect(total).toBe(12.0);
  });
});
