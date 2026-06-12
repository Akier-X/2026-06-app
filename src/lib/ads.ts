import { Platform } from 'react-native';
import { ADS } from '@/constants/ads';

// react-native-google-mobile-ads は Expo Go では動作しないためフォールバック付きで読み込む
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let adsModule: any = null;
try {
  adsModule = require('react-native-google-mobile-ads');
} catch {
  // Expo Go / web
}

export function getAdsBannerUnitId(): string {
  return Platform.OS === 'ios' ? ADS.BANNER_ANDROID : ADS.BANNER_ANDROID;
}

export function getAdsRewardedUnitId(): string {
  return Platform.OS === 'ios' ? ADS.REWARDED_ANDROID : ADS.REWARDED_ANDROID;
}

export async function initAds(): Promise<void> {
  if (!adsModule) return;
  try {
    await adsModule.default().initialize();
  } catch {
    // 初期化失敗は無視
  }
}

export function isAdsAvailable(): boolean {
  return !!adsModule;
}

export function showRewardedAd(opts: {
  onRewarded: () => void;
  onFailed: () => void;
}): void {
  if (!adsModule) {
    // Expo Go ではモックとして即座に報酬を付与
    opts.onRewarded();
    return;
  }
  const { RewardedAd, RewardedAdEventType } = adsModule;
  const rewarded = RewardedAd.createForAdRequest(getAdsRewardedUnitId(), {
    requestNonPersonalizedAdsOnly: false,
  });

  const unsubLoad = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => { rewarded.show(); },
  );
  const unsubReward = rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    () => { opts.onRewarded(); cleanup(); },
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsubError = rewarded.addAdEventListener('error' as any, () => {
    opts.onFailed();
    cleanup();
  });

  function cleanup() {
    unsubLoad();
    unsubReward();
    unsubError();
  }

  rewarded.load();
}
