import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function getAdsInterstitialUnitId(): string {
  return ADS.INTERSTITIAL_ANDROID;
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

const INTERSTITIAL_LAST_DATE_KEY = '@ads-interstitial-last-date';

export async function checkInterstitialAllowed(): Promise<boolean> {
  try {
    const lastDate = await AsyncStorage.getItem(INTERSTITIAL_LAST_DATE_KEY);
    if (!lastDate) return true;
    const now = new Date();
    const last = new Date(lastDate);
    return now.getFullYear() !== last.getFullYear() || now.getMonth() !== last.getMonth();
  } catch {
    return true;
  }
}

async function recordInterstitialShown(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTERSTITIAL_LAST_DATE_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

export function showInterstitialAd(opts: {
  onClosed: () => void;
  onFailed: () => void;
}): void {
  if (!adsModule) {
    // Expo Go: スキップして次の画面へ
    opts.onClosed();
    return;
  }
  const { InterstitialAd, AdEventType } = adsModule;
  const interstitial = InterstitialAd.createForAdRequest(getAdsInterstitialUnitId(), {
    requestNonPersonalizedAdsOnly: false,
  });

  const unsubLoad = interstitial.addAdEventListener(AdEventType.LOADED, async () => {
    await recordInterstitialShown();
    interstitial.show();
  });
  const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    opts.onClosed();
    cleanup();
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unsubError = interstitial.addAdEventListener('error' as any, () => {
    opts.onFailed();
    cleanup();
  });

  function cleanup() {
    unsubLoad();
    unsubClosed();
    unsubError();
  }

  interstitial.load();
}
