/**
 * Premium Service Architecture (Free vs Pro)
 */

export interface ProFeatureConfig {
  id: string;
  name: string;
  isProOnly: boolean;
}

export const PRO_FEATURES: Record<string, ProFeatureConfig> = {
  export4k: { id: 'export4k', name: '4K Ultra HD Export', isProOnly: true },
  export60fps: {
    id: 'export60fps',
    name: '60 FPS Ultra-Smooth Export',
    isProOnly: false,
  }, // Available
  premiumFilters: {
    id: 'premiumFilters',
    name: 'Cinematic Color Grading Presets',
    isProOnly: false,
  },
  noWatermark: { id: 'noWatermark', name: 'Watermark Free', isProOnly: false }, // Clipvero is 100% watermark free!
  adFree: { id: 'adFree', name: 'Ad-Free Experience', isProOnly: true },
};

export class PremiumService {
  private static isPro: boolean = false;

  public static isProUser(): boolean {
    return this.isPro;
  }

  public static setProStatus(isPro: boolean) {
    this.isPro = isPro;
  }

  public static canUseFeature(featureId: string): boolean {
    const feature = PRO_FEATURES[featureId];
    if (!feature || !feature.isProOnly) {
      return true;
    }
    return this.isPro;
  }
}
