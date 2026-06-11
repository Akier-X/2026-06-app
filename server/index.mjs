import { appendFile, mkdir, readFile } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

/**
 * ココロコーチ AIプロキシ & フィードバック収集サーバー
 *
 * Anthropic APIキーをアプリに埋め込まないための薄いプロキシ。
 * 環境変数:
 *   ANTHROPIC_API_KEY  (必須)
 *   PORT               (任意、デフォルト 8787)
 *   COACH_APP_TOKEN    (任意。設定すると x-app-token ヘッダーの一致を要求)
 *   ADMIN_TOKEN        (フィードバック閲覧用。GET /api/feedback に必要)
 *   FEEDBACK_FILE      (任意。デフォルト ./data/feedback.jsonl)
 */

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
const PORT = Number(process.env.PORT ?? 8787);
const APP_TOKEN = process.env.COACH_APP_TOKEN ?? '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
const FEEDBACK_FILE = process.env.FEEDBACK_FILE ?? './data/feedback.jsonl';

const SYSTEM_PROMPT = `あなたは「ココロコーチ」。習慣形成とセルフケアを支援する、日本語で話す温かいAIコーチです。

役割:
- ユーザーの習慣づくり・気分・モチベーションの相談にのる
- 行動科学(スモールステップ、if-thenプランニング、習慣スタッキング等)に基づく現実的な提案をする
- ユーザーの記録(コンテキストとして渡される)を踏まえ、具体的に励ます

スタイル:
- 2〜4文程度の短く読みやすい返答。絵文字はひかえめに1つまで
- 説教やリストの乱用はしない。共感→ひとつの具体的な提案、の順
- 医療・メンタルヘルスの診断や治療は行わない。深刻な不調がうかがえる場合は、専門家や相談窓口への相談をやさしく勧める`;

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-app-token, x-admin-token',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}');
}

const FEEDBACK_CATEGORIES = new Set(['bug', 'idea', 'question', 'other']);

/** フィードバックをJSONL(1行1レコード)で追記保存。Claude Codeでの分析を想定した構造化形式。 */
async function handleFeedbackPost(req, res) {
  const body = await readBody(req);
  const message = String(body.message ?? '').trim();
  if (!message) {
    sendJson(res, 400, { error: 'message required' });
    return;
  }
  const record = {
    id: `fb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    category: FEEDBACK_CATEGORIES.has(body.category) ? body.category : 'other',
    message: message.slice(0, 4000),
    contact: String(body.contact ?? '').slice(0, 200),
    platform: String(body.platform ?? '').slice(0, 20),
    appVersion: String(body.appVersion ?? '').slice(0, 20),
    isPremium: Boolean(body.isPremium),
    status: 'new', // トリアージ時に triaged / done 等へ更新する想定
  };
  await mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
  await appendFile(FEEDBACK_FILE, JSON.stringify(record) + '\n', 'utf-8');
  sendJson(res, 200, { ok: true, id: record.id });
}

/** 管理用: 蓄積したフィードバックをJSONで返す (scripts/fetch-feedback.mjs から利用)。 */
async function handleFeedbackGet(req, res) {
  if (!ADMIN_TOKEN || req.headers['x-admin-token'] !== ADMIN_TOKEN) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }
  let items = [];
  try {
    const raw = await readFile(FEEDBACK_FILE, 'utf-8');
    items = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    // ファイル未作成 = フィードバック0件
  }
  sendJson(res, 200, { count: items.length, items });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = (req.url ?? '').split('?')[0];

  try {
    if (req.method === 'GET' && url === '/api/feedback') {
      await handleFeedbackGet(req, res);
      return;
    }
    if (req.method === 'POST' && url === '/api/feedback') {
      if (APP_TOKEN && req.headers['x-app-token'] !== APP_TOKEN) {
        sendJson(res, 401, { error: 'unauthorized' });
        return;
      }
      await handleFeedbackPost(req, res);
      return;
    }
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'internal error' });
    return;
  }

  if (req.method !== 'POST' || url !== '/api/coach') {
    sendJson(res, 404, { error: 'not found' });
    return;
  }
  if (APP_TOKEN && req.headers['x-app-token'] !== APP_TOKEN) {
    sendJson(res, 401, { error: 'unauthorized' });
    return;
  }

  try {
    const { messages = [], context = {} } = await readBody(req);

    if (!Array.isArray(messages) || messages.length === 0) {
      sendJson(res, 400, { error: 'messages required' });
      return;
    }

    const contextBlock = [
      context.name ? `ユーザーの名前: ${context.name}` : null,
      context.goal ? `ユーザーの目標: ${context.goal}` : null,
      context.habitSummary ? `今日の習慣の状況: ${context.habitSummary}` : null,
      context.moodSummary ? `直近の気分(1-5): ${context.moodSummary}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: `${SYSTEM_PROMPT}\n\n<user_context>\n${contextBlock}\n</user_context>`,
      messages: messages
        .slice(-20)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '') })),
    });

    if (response.stop_reason === 'refusal') {
      sendJson(res, 200, {
        reply: 'ごめんなさい、その話題にはお答えできません。習慣やセルフケアのことなら、なんでも聞いてくださいね。',
      });
      return;
    }

    const reply = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    sendJson(res, 200, { reply });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`kokoro-coach server listening on :${PORT}`);
});
