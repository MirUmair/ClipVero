/**
 * Comprehensive Unit Tests for Clipvero
 * Tests core video editing math, timeline, split, trim, speed,
 * project persistence, autosave, and export logic.
 */

import {
  calculateEffectiveClipDuration,
  calculateProjectTotalDuration,
  findClipAtTimelineTime,
  getClipTimelineRange,
  formatDuration,
  formatDurationTenths,
} from '../src/utils/timeUtils';
import {
  getAspectRatioValue,
  calculateCanvasPreviewBounds,
} from '../src/editor/canvas/canvasUtils';
import { generateExportFileName, formatFileSize } from '../src/utils/fileUtils';
import { ProjectStorage } from '../src/storage/projectStorage';
import { AutosaveManager } from '../src/storage/autosaveManager';
import { Project, MediaClip } from '../src/types/project';

describe('Clipvero Media & Timeline Engine', () => {
  beforeEach(() => {
    ProjectStorage.clearMemoryCache();
    AutosaveManager.cancel();
  });

  describe('Duration & Speed Calculations', () => {
    it('calculates duration correctly at 1.0x normal speed', () => {
      // 10s clip trimmed from 2s to 8s (6s raw) at 1.0x -> 6s
      const dur = calculateEffectiveClipDuration(10, 2, 8, 1.0);
      expect(dur).toBe(6);
    });

    it('calculates duration correctly for slow motion (0.5x)', () => {
      // 4s raw at 0.5x speed -> 8s effective playback
      const dur = calculateEffectiveClipDuration(10, 0, 4, 0.5);
      expect(dur).toBe(8);
    });

    it('calculates duration correctly for fast motion (2.0x)', () => {
      // 10s raw at 2.0x speed -> 5s effective playback
      const dur = calculateEffectiveClipDuration(10, 0, 10, 2.0);
      expect(dur).toBe(5);
    });

    it('handles speed-adjusted duration at 0.25x and 4x extremes', () => {
      const slow = calculateEffectiveClipDuration(10, 0, 2, 0.25);
      expect(slow).toBe(8);

      const fast = calculateEffectiveClipDuration(10, 0, 8, 4.0);
      expect(fast).toBe(2);
    });

    it('enforces safe trim bounds (trimEnd > trimStart)', () => {
      const dur = calculateEffectiveClipDuration(10, 5, 2, 1.0);
      expect(dur).toBeGreaterThan(0);
    });
  });

  describe('Multiple Clip Timeline Duration & Locating', () => {
    const mockClips: MediaClip[] = [
      {
        id: 'c1',
        uri: 'file:///v1.mp4',
        name: 'Clip 1',
        type: 'video',
        duration: 5.0,
        originalDuration: 10.0,
        trimStart: 0,
        trimEnd: 5.0,
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
      },
      {
        id: 'c2',
        uri: 'file:///v2.mp4',
        name: 'Clip 2',
        type: 'video',
        duration: 7.0,
        originalDuration: 14.0,
        trimStart: 0,
        trimEnd: 14.0,
        speed: 2.0, // 14 raw / 2 speed = 7.0 effective
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
      },
    ];

    it('sums total duration across multiple clips accurately', () => {
      const total = calculateProjectTotalDuration(mockClips);
      expect(total).toBe(12.0);
    });

    it('finds active clip in Clip 1 range', () => {
      const match = findClipAtTimelineTime(mockClips, 2.5);
      expect(match).not.toBeNull();
      expect(match?.clip.id).toBe('c1');
      expect(match?.clipIndex).toBe(0);
      expect(match?.localTime).toBe(2.5);
    });

    it('finds active clip in Clip 2 range with speed compensation', () => {
      // Timeline time 8.5s is 3.5s into Clip 2. Since Clip 2 is 2x speed, local media time is 0 + 3.5 * 2 = 7s
      const match = findClipAtTimelineTime(mockClips, 8.5);
      expect(match).not.toBeNull();
      expect(match?.clip.id).toBe('c2');
      expect(match?.clipIndex).toBe(1);
      expect(match?.localTime).toBe(7.0);
    });

    it('returns timeline start and end ranges for clips', () => {
      const r0 = getClipTimelineRange(mockClips, 0);
      expect(r0.start).toBe(0);
      expect(r0.end).toBe(5.0);

      const r1 = getClipTimelineRange(mockClips, 1);
      expect(r1.start).toBe(5.0);
      expect(r1.end).toBe(12.0);
    });
  });

  describe('Non-Destructive Split Calculations', () => {
    it('splits a clip cleanly into two parts without altering total duration', () => {
      const originalClip: MediaClip = {
        id: 'orig',
        uri: 'file:///vid.mp4',
        name: 'Original',
        type: 'video',
        duration: 10.0,
        originalDuration: 10.0,
        trimStart: 0,
        trimEnd: 10.0,
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

      const splitPoint = 4.0;
      const part1: MediaClip = {
        ...originalClip,
        id: 'part_1',
        trimStart: originalClip.trimStart,
        trimEnd: splitPoint,
        duration: calculateEffectiveClipDuration(
          originalClip.originalDuration,
          originalClip.trimStart,
          splitPoint,
          originalClip.speed,
        ),
      };

      const part2: MediaClip = {
        ...originalClip,
        id: 'part_2',
        trimStart: splitPoint,
        trimEnd: originalClip.trimEnd,
        duration: calculateEffectiveClipDuration(
          originalClip.originalDuration,
          splitPoint,
          originalClip.trimEnd,
          originalClip.speed,
        ),
      };

      expect(part1.duration).toBe(4.0);
      expect(part2.duration).toBe(6.0);
      expect(part1.duration + part2.duration).toBe(originalClip.duration);
      expect(part1.trimStart).toBe(0);
      expect(part1.trimEnd).toBe(4.0);
      expect(part2.trimStart).toBe(4.0);
      expect(part2.trimEnd).toBe(10.0);
    });
  });

  describe('Canvas and Aspect Ratio Math', () => {
    it('correctly maps standard social aspect ratios', () => {
      expect(getAspectRatioValue('9:16')).toBeCloseTo(9 / 16);
      expect(getAspectRatioValue('1:1')).toBe(1);
      expect(getAspectRatioValue('16:9')).toBeCloseTo(16 / 9);
      expect(getAspectRatioValue('4:5')).toBeCloseTo(4 / 5);
    });

    it('calculates preview bounds fitted within max container constraints', () => {
      const bounds916 = calculateCanvasPreviewBounds('9:16', 360, 400);
      expect(bounds916.width).toBeLessThanOrEqual(360);
      expect(bounds916.height).toBeLessThanOrEqual(400);
      expect(bounds916.width / bounds916.height).toBeCloseTo(9 / 16);

      const bounds169 = calculateCanvasPreviewBounds('16:9', 360, 400);
      expect(bounds169.width).toBe(360);
      expect(bounds169.height).toBeCloseTo(360 / (16 / 9));
    });
  });

  describe('Project Serialization & Storage', () => {
    it('saves, retrieves, and duplicates a project', async () => {
      const project: Project = {
        id: 'proj_test_1',
        name: 'Cool Reel',
        createdAt: 1000,
        updatedAt: 1000,
        aspectRatio: '9:16',
        canvasBackground: { type: 'fit' },
        clips: [],
        textLayers: [
          {
            id: 't1',
            text: 'Hello World',
            startTime: 0,
            endTime: 3,
            x: 0.5,
            y: 0.5,
            scale: 1,
            rotation: 0,
            fontFamily: 'System',
            fontSize: 24,
            color: '#FFFFFF',
            opacity: 1,
            textAlign: 'center',
            animation: 'fadeIn',
          },
        ],
        stickerLayers: [],
        audioTracks: [],
        exportSettings: {
          resolution: '1080p',
          fps: 30,
          quality: 'recommended',
          format: 'mp4',
        },
      };

      await ProjectStorage.saveProject(project);
      const retrieved = await ProjectStorage.getProject('proj_test_1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Cool Reel');
      expect(retrieved?.textLayers.length).toBe(1);

      // Duplicate
      const dup = await ProjectStorage.duplicateProject('proj_test_1');
      expect(dup).not.toBeNull();
      expect(dup?.name).toBe('Cool Reel (Copy)');
      expect(dup?.id).not.toBe('proj_test_1');

      // Rename
      await ProjectStorage.renameProject('proj_test_1', 'Renamed Reel');
      const renamed = await ProjectStorage.getProject('proj_test_1');
      expect(renamed?.name).toBe('Renamed Reel');

      // Delete
      await ProjectStorage.deleteProject('proj_test_1');
      const deleted = await ProjectStorage.getProject('proj_test_1');
      expect(deleted).toBeNull();
    });

    it('flushes debounced autosave state properly', async () => {
      const project: Project = {
        id: 'proj_auto_1',
        name: 'Autosaved Reel',
        createdAt: 2000,
        updatedAt: 2000,
        aspectRatio: '9:16',
        canvasBackground: { type: 'fit' },
        clips: [],
        textLayers: [],
        stickerLayers: [],
        audioTracks: [],
        exportSettings: {
          resolution: '1080p',
          fps: 30,
          quality: 'recommended',
          format: 'mp4',
        },
      };

      AutosaveManager.scheduleSave(project);
      await AutosaveManager.flush();

      const saved = await ProjectStorage.getProject('proj_auto_1');
      expect(saved).not.toBeNull();
      expect(saved?.name).toBe('Autosaved Reel');
    });
  });

  describe('File & String Formatters', () => {
    it('formats time duration string', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(12)).toBe('00:12');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3665)).toBe('01:01:05');
      expect(formatDurationTenths(12.34)).toBe('00:12.3');
    });

    it('formats file sizes accurately', () => {
      expect(formatFileSize(500)).toBe('500.0 B');
      expect(formatFileSize(2048)).toBe('2.0 KB');
      expect(formatFileSize(1048576 * 5)).toBe('5.0 MB');
    });

    it('generates sanitized export file names', () => {
      const filename = generateExportFileName('My Travel Vlog #1');
      expect(filename).toMatch(/^Clipvero_My_Travel_Vlog__1_[0-9]+\.mp4$/);
    });
  });
});
