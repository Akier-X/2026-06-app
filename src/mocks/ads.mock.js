// Web mock for react-native-google-mobile-ads
const noop = () => {};
const noopAsync = () => Promise.resolve();

module.exports = {
  default: {},
  BannerAd: () => null,
  BannerAdSize: { BANNER: 'BANNER', LARGE_BANNER: 'LARGE_BANNER' },
  InterstitialAd: { createForAdRequest: () => ({ load: noop, show: noopAsync, addAdEventListener: () => noop }) },
  RewardedAd: { createForAdRequest: () => ({ load: noop, show: noopAsync, addAdEventListener: () => noop }) },
  AdEventType: { LOADED: 'loaded', ERROR: 'error', CLOSED: 'closed' },
  RewardedAdEventType: { LOADED: 'loaded', EARNED_REWARD: 'earned_reward', ERROR: 'error' },
  MobileAds: () => ({ initialize: noopAsync }),
  AppOpenAd: { createForAdRequest: () => ({ load: noop, show: noopAsync, addAdEventListener: () => noop }) },
};
