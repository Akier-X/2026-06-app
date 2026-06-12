import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * RevenueCat wrapper.
 *
 * react-native-purchases requires a native build (development build / TestFlight /
 * App Store). In Expo Go and on web the native module is missing, so we fall back
 * to a mock implementation that simulates a successful purchase — handy for UI
 * development before the store products exist.
 */

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
const isMock = isExpoGo || Platform.OS === 'web';

// RevenueCat public API keys (Project settings > API keys). Safe to ship in the app.
const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '';
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? '';

export const PREMIUM_ENTITLEMENT = 'premium';

export interface PlanOption {
  id: string;
  title: string;
  priceString: string;
  /** Monthly equivalent display string for annual plans (e.g. "月々¥317"). */
  monthlyEquivalent?: string;
  period: 'monthly' | 'annual';
  /** Native RevenueCat package — undefined in mock mode. */
  rcPackage?: unknown;
}

function getPurchases() {
  // Lazy require so Expo Go never touches the missing native module.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('react-native-purchases').default;
}

export async function initPurchases(): Promise<void> {
  if (isMock) return;
  const Purchases = getPurchases();
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  if (!apiKey) return;
  Purchases.configure({ apiKey });
}

export async function fetchPlans(): Promise<PlanOption[]> {
  if (isMock) {
    return [
      { id: 'mock-monthly', title: '月額プラン', priceString: '¥480/月', period: 'monthly' },
      { id: 'mock-annual', title: '年額プラン', priceString: '¥3,800/年', period: 'annual', monthlyEquivalent: '月々¥317' },
    ];
  }
  const Purchases = getPurchases();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) return [];
  const plans: PlanOption[] = [];
  if (current.monthly) {
    plans.push({
      id: current.monthly.identifier,
      title: '月額プラン',
      priceString: `${current.monthly.product.priceString}/月`,
      period: 'monthly',
      rcPackage: current.monthly,
    });
  }
  if (current.annual) {
    const annualPrice: number = current.annual.product.price;
    const monthly = Math.round(annualPrice / 12);
    plans.push({
      id: current.annual.identifier,
      title: '年額プラン',
      priceString: `${current.annual.product.priceString}/年`,
      monthlyEquivalent: `月々¥${monthly.toLocaleString()}`,
      period: 'annual',
      rcPackage: current.annual,
    });
  }
  return plans;
}

/** Returns true when the user now has the premium entitlement. */
export async function purchasePlan(plan: PlanOption): Promise<boolean> {
  if (isMock) {
    await new Promise((r) => setTimeout(r, 800));
    return true;
  }
  const Purchases = getPurchases();
  const { customerInfo } = await Purchases.purchasePackage(plan.rcPackage);
  return PREMIUM_ENTITLEMENT in customerInfo.entitlements.active;
}

/** Returns true when a previous purchase was restored with the premium entitlement. */
export async function restorePurchases(): Promise<boolean> {
  if (isMock) {
    await new Promise((r) => setTimeout(r, 500));
    return false;
  }
  const Purchases = getPurchases();
  const customerInfo = await Purchases.restorePurchases();
  return PREMIUM_ENTITLEMENT in customerInfo.entitlements.active;
}

/** Re-check entitlement on app start (e.g. renewal lapsed or refunded). */
export async function checkPremium(): Promise<boolean | null> {
  if (isMock) return null; // keep local state in mock mode
  try {
    const Purchases = getPurchases();
    const customerInfo = await Purchases.getCustomerInfo();
    return PREMIUM_ENTITLEMENT in customerInfo.entitlements.active;
  } catch {
    return null;
  }
}
