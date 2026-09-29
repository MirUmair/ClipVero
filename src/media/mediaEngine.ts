/**
 * Clipvero Shared Media Engine
 * Modular abstraction layer for native on-device media processing
 * Works seamlessly with Android Jetpack Media3 Transformer
 */

import { NativeModules, NativeEventEmitter } from 'react-native';
import { Project, MediaClip } from '../types/project';

const { ClipveroMediaEngine } = NativeModules;

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  rotation: number;
  bitrate: number;
}

export interface ExportProgressEvent {
  percentage: number;
}

export interface NativeExportResult {
  outputPath: string;
  fileSize: number;
  resolution: string;
}

export class MediaEngine {
  private static eventEmitter: NativeEventEmitter | null = null;
  private static isMock: boolean = !ClipveroMediaEngine;

  private static getEmitter(): NativeEventEmitter | null {
    if (!this.eventEmitter && ClipveroMediaEngine) {
      this.eventEmitter = new NativeEventEmitter(ClipveroMediaEngine);
    }
    return this.eventEmitter;
  }

  /**
   * Retrieves video metadata (dimensions, duration, rotation, bitrate) on-device
   */
  public static async getVideoMetadata(uri: string): Promise<VideoMetadata> {
    if (ClipveroMediaEngine?.getVideoMetadata) {
      try {
        const data = await ClipveroMediaEngine.getVideoMetadata(uri);
        return {
          duration: data.duration || 10,
          width: data.width || 1080,
          height: data.height || 1920,
          rotation: data.rotation || 0,
          bitrate: data.bitrate || 0,
        };
      } catch (e) {
        console.warn('Native metadata extraction failed, using fallback:', e);
      }
    }

    // Fallback default for images or mock testing
    return {
      duration: 5.0,
      width: 1080,
      height: 1920,
      rotation: 0,
      bitrate: 0,
    };
  }

  /**
   * Generate on-device frame thumbnail at a given timestamp
   */
  public static async generateThumbnail(
    uri: string,
    timeSec: number = 0,
    width: number = 240,
    height: number = 240,
  ): Promise<string> {
    if (ClipveroMediaEngine?.generateThumbnail) {
      try {
        return await ClipveroMediaEngine.generateThumbnail(
          uri,
          timeSec,
          width,
          height,
        );
      } catch (e) {
        console.warn('Native thumbnail generation failed:', e);
      }
    }
    // Return original uri if fallback
    return uri;
  }

  /**
   * Generate multiple thumbnail frames across a clip for timeline caching
   */
  public static async generateTimelineThumbnails(
    uri: string,
    count: number = 6,
  ): Promise<string[]> {
    if (ClipveroMediaEngine?.generateTimelineThumbnails) {
      try {
        const thumbs: string[] =
          await ClipveroMediaEngine.generateTimelineThumbnails(uri, count);
        if (thumbs && thumbs.length > 0) return thumbs;
      } catch (e) {
        console.warn('Native timeline thumbnail extraction failed:', e);
      }
    }
    // Fallback: return array of original uri
    return Array(count).fill(uri);
  }

  /**
   * Extract audio stream from a video into local file
   */
  public static async extractAudio(
    videoUri: string,
    outputName: string = 'extracted',
  ): Promise<string> {
    if (ClipveroMediaEngine?.extractAudio) {
      return await ClipveroMediaEngine.extractAudio(videoUri, outputName);
    }
    throw new Error('Audio extraction is only supported on Android devices');
  }

  /**
   * Export video project using Jetpack Media3 Transformer
   */
  public static async exportProject(
    project: Project,
    onProgress?: (progress: number) => void,
  ): Promise<NativeExportResult> {
    let subscription: any = null;

    if (onProgress) {
      const emitter = this.getEmitter();
      if (emitter) {
        subscription = emitter.addListener(
          'onClipveroExportProgress',
          (event: any) => {
            onProgress(event?.percentage ?? 0);
          },
        );
      }
    }

    try {
      if (ClipveroMediaEngine?.exportProject) {
        const configJson = JSON.stringify({
          name: project.name,
          clips: project.clips.map(c => ({
            uri: c.uri,
            trimStart: c.trimStart,
            trimEnd: c.trimEnd,
            speed: c.speed,
            volume: c.volume,
            isMuted: c.isMuted,
            rotation: c.rotation,
            transition: c.transition,
          })),
          exportSettings: project.exportSettings,
        });

        const result: NativeExportResult =
          await ClipveroMediaEngine.exportProject(configJson);
        return result;
      }

      // Non-native testing mock export (simulates progress and produces dummy file)
      for (let p = 0; p <= 100; p += 25) {
        if (onProgress) onProgress(p);
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 60);
        });
      }

      return {
        outputPath: project.clips[0]?.uri || 'file:///mock/output.mp4',
        fileSize: 1024 * 1024 * 5, // 5 MB
        resolution: '1080x1920',
      };
    } finally {
      if (subscription) {
        subscription.remove();
      }
    }
  }

  /**
   * Launch native device photo/video picker and return MediaClip instances
   */
  public static async pickMedia(): Promise<MediaClip[]> {
    if (ClipveroMediaEngine?.pickMedia) {
      try {
        const rawItems = await ClipveroMediaEngine.pickMedia();
        if (Array.isArray(rawItems)) {
          return rawItems.map((item: any) => ({
            id: `clip_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 7)}`,
            uri: item.uri,
            name: item.name || 'Picked Video',
            type: item.type === 'image' ? 'image' : 'video',
            duration:
              typeof item.duration === 'number' && item.duration > 0
                ? item.duration
                : 10.0,
            originalDuration:
              typeof item.originalDuration === 'number' &&
              item.originalDuration > 0
                ? item.originalDuration
                : 10.0,
            trimStart: 0,
            trimEnd:
              typeof item.duration === 'number' && item.duration > 0
                ? item.duration
                : 10.0,
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
            thumbnailUri: item.thumbnailUri || item.uri,
            width: item.width || 1080,
            height: item.height || 1920,
          }));
        }
      } catch (e) {
        console.warn('Native pickMedia error:', e);
        throw e;
      }
    }
    return [];
  }

  /**
   * Cancel ongoing export safely
   */
  public static async cancelExport(): Promise<boolean> {
    if (ClipveroMediaEngine?.cancelExport) {
      return await ClipveroMediaEngine.cancelExport();
    }
    return true;
  }
}
