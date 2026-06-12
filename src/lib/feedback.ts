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

