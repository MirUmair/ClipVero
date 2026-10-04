/**
 * Sharing Service
 * Uses native platform share sheet without third-party platform SDKs
 */

import { Share, Platform, NativeModules } from 'react-native';

export class SharingService {
  /**
   * Opens the native OS share sheet for a video file or project export
   */
  public static async shareVideo(
    filePath: string,
    title: string = 'Clipvero Video',
  ): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (!NativeModules.ClipveroMediaEngine?.shareVideo) {
          throw new Error('Video sharing is unavailable on this device.');
        }
        return await NativeModules.ClipveroMediaEngine.shareVideo(filePath, title);
      }
      const shareUrl = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;

      const shareMessage = title || 'Check out my video created with ClipVero!';

      const result = await Share.share({
        title: title || 'ClipVero Video',
        message: shareMessage,
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
    title: string = 'ClipVero',
  ): Promise<boolean> {
    try {
      const safeMessage =
        message?.trim() ||
        'Check out ClipVero - Powerful Video Editing Made Simple';
      const result = await Share.share({
        title: title || 'ClipVero',
        message: safeMessage,
      });
      return result.action === Share.sharedAction;
    } catch (error) {
      console.warn('Failed to share text:', error);
      return false;
    }
  }
}
