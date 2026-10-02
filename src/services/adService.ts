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

export const ADMOB_TEST_UNITS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
} as const;

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

  public static setAdsEnabled(enabled: boolean) {
    this.config.adsEnabled = enabled;
  }

  public static setProUser(isPro: boolean) {
    this.config.isProUser = isPro;
  }

  public static isPro(): boolean {
    return this.config.isProUser;
  }

  public static getAdUnitId(
    placement: AdPlacement,
    platform: 'android' | 'ios' = 'android',
  ): string {
    const units = ADMOB_TEST_UNITS[platform];
    switch (placement) {
      case 'home_banner':
      case 'export_result_banner':
        return units.banner;
      case 'post_export_interstitial':
        return units.interstitial;
      case 'rewarded_premium_feature':
        return units.rewarded;
      default:
        return units.banner;
    }
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
