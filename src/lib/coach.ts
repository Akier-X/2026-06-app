import { lastNDateKeys, todayKey } from '@/lib/dates';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage, CoachContext } from '@/types';

/**
 * AI coach client. Talks to the proxy server in `server/` (which holds the
 * Anthropic API key — never ship the key inside the app).
 *
 * Set EXPO_PUBLIC_COACH_API_URL (e.g. https://your-server.example.com).
 * When unset, a local demo reply is returned so the app works standalone.
 */
const COACH_API_URL = process.env.EXPO_PUBLIC_COACH_API_URL ?? '';

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

const DEMO_REPLIES = [
  'いいですね!まずは小さな一歩から始めましょう。今日の習慣をひとつだけ、5分でいいので試してみませんか?🌱',
  '焦らなくて大丈夫です。続けられた日に注目してみましょう。昨日より少しでも前に進めていれば十分です。',
  'その気持ち、よくわかります。完璧を目指すより「やめないこと」を目標にしてみましょう。応援しています!',
];

export async function sendToCoach(history: ChatMessage[]): Promise<string> {
  if (!COACH_API_URL) {
    // Demo mode: no server configured.
    await new Promise((r) => setTimeout(r, 600));
    return DEMO_REPLIES[history.length % DEMO_REPLIES.length];
  }

  const context = buildCoachContext();
  const res = await fetch(`${COACH_API_URL.replace(/\/$/, '')}/api/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
