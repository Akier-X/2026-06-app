import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 最小限のイベント計測。
 * - 端末内リングバッファ(最新500件)に常に保存 — オフライン前提・追加SDKなし
 * - `EXPO_PUBLIC_COACH_API_URL` 設定時のみ、fire-and-forget でサーバーへも送信
 *   (server/ 側に /api/metrics が無くても 404 を握りつぶすだけで実害なし)
 *
 * 目的は「ペイウォールはどこから開かれ、どこから課金されたか」の転換ファネルを
 * リリース後に検証できるようにすること。
 */

const STORE_KEY = 'kokoro-analytics-events';
const MAX_EVENTS = 500;

export type AnalyticsEvent =
  | 'onboarding_done'
  | 'paywall_view'
  | 'purchase_success'
  | 'purchase_restore'
  | 'trial_redeemed'
  | 'rewarded_unlock'
  | 'share'
  | 'bloom_theme_set';

export interface AnalyticsEntry {
  e: AnalyticsEvent;
  p: Record<string, string | number>;
  t: string;
}

// AsyncStorageの読み書きを直列化して競合を防ぐ
let queue: Promise<void> = Promise.resolve();

export function track(event: AnalyticsEvent, props?: Record<string, string | number>): void {
  const entry: AnalyticsEntry = { e: event, p: props ?? {}, t: new Date().toISOString() };
  if (__DEV__) console.log('[analytics]', entry.e, entry.p);

  queue = queue.then(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORE_KEY);
      const list: AnalyticsEntry[] = raw ? JSON.parse(raw) : [];
      list.push(entry);
      if (list.length > MAX_EVENTS) list.splice(0, list.length - MAX_EVENTS);
      await AsyncStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch {
      /* 計測はアプリ動作に影響させない */
    }
  });

  const url = process.env.EXPO_PUBLIC_COACH_API_URL;
  if (url) {
    const token = process.env.EXPO_PUBLIC_COACH_APP_TOKEN;
    fetch(`${url.replace(/\/$/, '')}/api/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(entry),
    }).catch(() => {});
  }
}

/** 端末内に貯まったイベントを取得(デバッグ・将来のエクスポート用) */
export async function getLocalEvents(): Promise<AnalyticsEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
