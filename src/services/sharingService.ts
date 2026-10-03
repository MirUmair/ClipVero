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
    title: string = 'Clipvero Video',
  ): Promise<boolean> {
    try {
      const shareUrl = filePath.startsWith('file://')
        ? filePath
        : `file://${filePath}`;

      const shareMessage =
        Platform.OS === 'android'
          ? `${title || 'EditMate Video'}\n${shareUrl}`
          : title || 'Check out my video created with EditMate!';

      const result = await Share.share({
        title: title || 'EditMate Video',
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
    title: string = 'EditMate',
  ): Promise<boolean> {
    try {
      const safeMessage =
        message?.trim() ||
        'Check out EditMate - Powerful Video Editing Made Simple';
      const result = await Share.share({
        title: title || 'EditMate',
        message: safeMessage,
      });
      return result.action === Share.sharedAction;
    } catch (error) {
      console.warn('Failed to share text:', error);
      return false;
    }
  }
}
