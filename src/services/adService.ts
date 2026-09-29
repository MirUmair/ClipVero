/**
 * AdService - Abstraction layer for future non-intrusive ads
 * Strictly follows policy: Never interrupts active editing or export processing
 */

export type AdPlacement =
  | 'home_banner'
  | 'export_result_banner'
  | 'post_export_interstitial'
  | 'rewarded_premium_feature';

export interface AdConfig {
  adsEnabled: boolean;
  isProUser: boolean;
  testMode: boolean;
}

export class AdService {
  private static config: AdConfig = {
    adsEnabled: false, // Disabled by default until production setup
    isProUser: false,
    testMode: true,
  };

  public static initialize(config?: Partial<AdConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public static setProUser(isPro: boolean) {
    this.config.isProUser = isPro;
  }

  public static isPro(): boolean {
    return this.config.isProUser;
  }

  public static shouldShowAd(_placement: AdPlacement): boolean {
    if (this.config.isProUser || !this.config.adsEnabled) {
      return false;
    }
    // Placements allowed only when not actively editing
    return true;
  }

  public static async showPostExportInterstitial(): Promise<boolean> {
    if (!this.shouldShowAd('post_export_interstitial')) {
      return false;
    }
    // Reserved for SDK integration without blocking active workflows
    return true;
  }

  public static async showRewardedAd(_featureName: string): Promise<boolean> {
    if (!this.shouldShowAd('rewarded_premium_feature')) {
      return true; // If ads disabled or pro, feature is granted
    }
    return true;
  }
}
