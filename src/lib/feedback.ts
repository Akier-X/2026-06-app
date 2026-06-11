import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useAppStore } from '@/store/useAppStore';

const COACH_API_URL = process.env.EXPO_PUBLIC_COACH_API_URL ?? '';
const COACH_APP_TOKEN = process.env.EXPO_PUBLIC_COACH_APP_TOKEN ?? '';

export type FeedbackCategory = 'bug' | 'idea' | 'question' | 'other';

export interface FeedbackInput {
  category: FeedbackCategory;
  message: string;
  contact?: string;
}

export function isFeedbackServerConfigured(): boolean {
  return COACH_API_URL.length > 0;
}

/**
 * フィードバックをサーバーへ送信する。
 * サーバー側で feedback.jsonl に構造化保存され、scripts/fetch-feedback.mjs で
 * 一括取得して次回アップデートの計画(Claude Codeでの分析)に使う。
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  if (!COACH_API_URL) {
    throw new Error('feedback server not configured');
  }
  const res = await fetch(`${COACH_API_URL.replace(/\/$/, '')}/api/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(COACH_APP_TOKEN ? { 'x-app-token': COACH_APP_TOKEN } : {}),
    },
    body: JSON.stringify({
      category: input.category,
      message: input.message,
      contact: input.contact ?? '',
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version ?? '',
      isPremium: useAppStore.getState().isPremium,
    }),
  });
  if (!res.ok) {
    throw new Error(`feedback api error: ${res.status}`);
  }
}

/** サーバー未設定時のフォールバック: メール本文を組み立てる。 */
export function buildFeedbackMailto(email: string, input: FeedbackInput): string {
  const categoryLabel: Record<FeedbackCategory, string> = {
    bug: '不具合報告',
    idea: '機能の要望',
    question: '質問',
    other: 'その他',
  };
  const subject = encodeURIComponent(`[ココロコーチ] ${categoryLabel[input.category]}`);
  const body = encodeURIComponent(
    `${input.message}\n\n---\nversion: ${Constants.expoConfig?.version ?? ''} / ${Platform.OS}`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
