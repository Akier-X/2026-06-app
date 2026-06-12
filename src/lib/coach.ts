import { lastNDateKeys, todayKey } from '@/lib/dates';
import { generateLocalCoachReply } from '@/lib/localCoach';
import { generateLLMReply, isLLMReady } from '@/lib/llm';
import { useAppStore } from '@/store/useAppStore';
import type { ChatMessage, CoachContext } from '@/types';

const COACH_API_URL = process.env.EXPO_PUBLIC_COACH_API_URL ?? '';
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

function buildSystemPrompt(ctx: CoachContext): string {
  return `あなたは「ここロコーチ」という日本語の習慣コーチAIです。ユーザーの習慣化・セルフケア・メンタルウェルネスを温かくサポートします。

【応答ルール】
- 必ず日本語のみで返答する
- 温かく共感的な口調（ですます調）で話す
- 返答は2〜4文程度に簡潔にまとめる
- 具体的で実践しやすいアドバイスを心がける
- 「死にたい」「消えたい」「自殺」などが出たらよりそいホットライン（0120-279-338）を案内する
- 英語・記号の羅列・コードブロックは使わない

【ユーザー情報】
名前: ${ctx.name || '未設定'}
目標: ${ctx.goal || '未設定'}
今日の習慣: ${ctx.habitSummary}
最近の気分（過去7日）: ${ctx.moodSummary}`;
}

/**
 * ストリーミング対応のコーチ送信
 * - LLMがロード済み → llama.rn でリアルタイムにトークンを返す
 * - それ以外（Expo Go / DL未完了）→ ローカルルールベースで一括返答
 */
export async function sendToCoachStreaming(
  history: ChatMessage[],
  onToken: (token: string) => void,
): Promise<string> {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const userText = lastUser?.text ?? '';

  // ── LLMパス ──────────────────────────────
  if (isLLMReady()) {
    const ctx = buildCoachContext();
    const systemPrompt = buildSystemPrompt(ctx);

    // 直近10件（最後のユーザー発言は除く）を会話履歴として渡す
    const historyMsgs = history
      .slice(-11, -1)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    return generateLLMReply(systemPrompt, historyMsgs, userText, onToken);
  }

  // ── フォールバック: ルールベース ────────────
  await new Promise((r) => setTimeout(r, 500));
  const reply = generateLocalCoachReply(userText, history);
  onToken(reply);
  return reply;
}

/** 後方互換: 既存のサーバーAPIパスを残す */
export async function sendToCoach(history: ChatMessage[]): Promise<string> {
  if (!COACH_API_URL) {
    const lastUserMessage = [...history].reverse().find((m) => m.role === 'user');
    await new Promise((r) => setTimeout(r, 500));
    return generateLocalCoachReply(lastUserMessage?.text ?? '', history);
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
  if (!res.ok) throw new Error(`coach api error: ${res.status}`);
  const data = (await res.json()) as { reply?: string };
  if (!data.reply) throw new Error('coach api returned empty reply');
  return data.reply;
}
