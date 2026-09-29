/**
 * Sharing Service
 * Uses native platform share sheet without third-party platform SDKs
 */

import { Share, Platform } from 'react-native';

export class SharingService {
  /**
   * Opens the native OS share sheet for a video file or project export
   */
  public static async shareVideo(
    filePath: string,
    title: string = 'Share Video',
  ): Promise<boolean> {
    try {
      const shareUrl = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;
      const result = await Share.share({
        title,
        message: Platform.OS === 'android' ? undefined : title,
        url: shareUrl,
      });

      return result.action === Share.sharedAction;
    } catch (error) {
      console.warn('Failed to share video:', error);
      return false;
    }
  }

  /**
   * Share text or project details
   */
  public static async shareText(
    message: string,
    title: string = 'Clipvero',
  ): Promise<boolean> {
    try {
      const result = await Share.share({
        title,
        message,
      });
      return result.action === Share.sharedAction;
    } catch (error) {
      console.warn('Failed to share text:', error);
      return false;
    }
  }
}
