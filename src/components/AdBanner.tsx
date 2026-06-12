import { StyleSheet, View } from 'react-native';
import { getAdsBannerUnitId } from '@/lib/ads';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BannerAd: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BannerAdSize: any = null;
try {
  const m = require('react-native-google-mobile-ads');
  BannerAd = m.BannerAd;
  BannerAdSize = m.BannerAdSize;
} catch {
  // Expo Go
}

export default function AdBanner() {
  if (!BannerAd) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={getAdsBannerUnitId()}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
});
