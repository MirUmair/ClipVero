/**
 * Clipvero Thumbnail Cache
 * In-memory and disk LRU cache to prevent redundant frame decoding
 */

import { MediaEngine } from './mediaEngine';

interface CachedThumbnails {
  clipId: string;
  uri: string;
  thumbnails: string[];
  timestamp: number;
}

export class ThumbnailCache {
  private static cache: Map<string, CachedThumbnails> = new Map();
  private static maxEntries = 40;

  /**
   * Retrieves cached timeline thumbnails or generates new ones
   */
  public static async getTimelineThumbnails(
    clipId: string,
    uri: string,
    count: number = 6,
  ): Promise<string[]> {
    const cached = this.cache.get(clipId);
    if (cached && cached.uri === uri && cached.thumbnails.length >= count) {
      return cached.thumbnails.slice(0, count);
    }

    try {
      const thumbs = await MediaEngine.generateTimelineThumbnails(uri, count);
      this.cache.set(clipId, {
        clipId,
        uri,
        thumbnails: thumbs,
        timestamp: Date.now(),
      });

      // Evict oldest if limit reached
      if (this.cache.size > this.maxEntries) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }

      return thumbs;
    } catch {
      return [];
    }
  }

  /**
   * Synchronously returns cached thumbnails for dynamic preview scrub
   */
  public static getCachedThumbnails(clipId: string): string[] | null {
    return this.cache.get(clipId)?.thumbnails || null;
  }

  /**
   * Clear cache on memory warning or project switch
   */
  public static clear() {
    this.cache.clear();
  }
}
