/**
 * Subtle Haptic Feedback Service
 * Provides tactile feedback for timeline scrubbing, trimming snap, splits, etc.
 */

import { Vibration, Platform } from 'react-native';

export class HapticsService {
  private static enabled: boolean = true;

  public static setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subtle light tick for scrubbing or slider steps
   */
  public static light() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(10);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Medium impact for clip selection or tool toggling
   */
  public static medium() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate(25);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Distinct snap feedback for snapping trim handles or split actions
   */
  public static snap() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 15, 30, 20]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Success notification pattern for export completion
   */
  public static success() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'android') {
        Vibration.vibrate([0, 30, 60, 40]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Ignore vibration errors
    }
  }
}
