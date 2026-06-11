import { lastNDateKeys, todayKey } from '@/lib/dates';
import { generateLocalCoachReply } from '@/lib/localCoach';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage, CoachContext } from '@/types';

/**
 * AIコーチクライアント
 *
 * デフォルトは **APIキー不要のローカルエンジン**(src/lib/localCoach.ts)。
 * 運営者のAPIキーもユーザーのAPIキーも不要で、通信費ゼロ・オフラインで動作する。
 *
 * 将来Claudeベースのコーチに切り替えたい場合のみ、`server/` をデプロイして
 * EXPO_PUBLIC_COACH_API_URL を設定する(任意のオプション)。
 */
const COACH_API_URL = process.env.EXPO_PUBLIC_COACH_API_URL ?? '';
// サーバー側 COACH_APP_TOKEN と同じ値を設定する(簡易的なアプリ専用認証)
const COACH_APP_TOKEN = process.env.EXPO_PUBLIC_COACH_APP_TOKEN ?? '';

export function buildCoachContext(): CoachContext {
  const s = useAppStore.getState();
  const today = todayKey();
  const doneToday = s.completions[today] ?? [];
  const habitSummary =
    s.habits.length === 0
      ? 'まだ習慣が登録されていません。'
      : s.habits
          .map(
            (h) =>
              `${h.emoji} ${h.name}: 今日は${doneToday.includes(h.id) ? '達成済み' : '未達成'}`,
          )
          .join(' / ');
  const moodSummary = lastNDateKeys(7)
    .map((key) => {
      const m = s.moods[key];
      return m ? `${key}: ${m}/5` : null;
    })
    .filter(Boolean)
    .join(', ');
  return {
    name: s.profile.name,
    goal: s.profile.goal,
    habitSummary,
    moodSummary: moodSummary || '気分の記録はまだありません。',
  };
}

export async function sendToCoach(history: ChatMessage[]): Promise<string> {
  if (!COACH_API_URL) {
    // デフォルト: ローカルエンジン(API不使用)
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user');
    await new Promise((r) => setTimeout(r, 400)); // 考えている間(うちあわせ感)
    return generateLocalCoachReply(lastUserMessage?.text ?? '');
  }

  const context = buildCoachContext();
  const res = await fetch(`${COACH_API_URL.replace(/\/$/, '')}/api/coach`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(COACH_APP_TOKEN ? { 'x-app-token': COACH_APP_TOKEN } : {}),
    },
    body: JSON.stringify({
      messages: history.slice(-20).map((m) => ({ role: m.role, content: m.text })),
      context,
    }),
  });
  if (!res.ok) {
    throw new Error(`coach api error: ${res.status}`);
  }
  const data = (await res.json()) as { reply?: string };
  if (!data.reply) {
    throw new Error('coach api returned empty reply');
  }
  return data.reply;
}
