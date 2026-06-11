#!/usr/bin/env node
/**
 * サーバーに蓄積されたユーザーフィードバックを取得し、
 * feedback-export/ にJSONLとサマリーを書き出す。
 *
 * 使い方:
 *   COACH_API_URL=https://your-server.example.com ADMIN_TOKEN=xxxx node scripts/fetch-feedback.mjs
 *
 * 出力:
 *   feedback-export/feedback.jsonl   全レコード (1行1件)
 *   feedback-export/summary.md       件数サマリー (カテゴリ別・直近30日)
 *
 * 次回アップデートをClaude Codeで行うときは、このスクリプトを実行してから
 * CLAUDE.md の「フィードバック駆動アップデート」手順に従う。
 */
import { mkdir, writeFile } from 'node:fs/promises';

const API_URL = process.env.COACH_API_URL;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!API_URL || !ADMIN_TOKEN) {
  console.error('COACH_API_URL と ADMIN_TOKEN を環境変数で指定してください。');
  console.error('例: COACH_API_URL=https://... ADMIN_TOKEN=xxx node scripts/fetch-feedback.mjs');
  process.exit(1);
}

const res = await fetch(`${API_URL.replace(/\/$/, '')}/api/feedback`, {
  headers: { 'x-admin-token': ADMIN_TOKEN },
});
if (!res.ok) {
  console.error(`取得に失敗しました: HTTP ${res.status}`);
  process.exit(1);
}
const { items } = await res.json();

await mkdir('feedback-export', { recursive: true });
await writeFile(
  'feedback-export/feedback.jsonl',
  items.map((i) => JSON.stringify(i)).join('\n') + (items.length ? '\n' : ''),
  'utf-8',
);

const byCategory = {};
const recentCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
let recent = 0;
for (const item of items) {
  byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
  if (new Date(item.createdAt).getTime() > recentCutoff) recent++;
}

const summary = [
  '# フィードバックサマリー',
  '',
  `- 取得日時: ${new Date().toISOString()}`,
  `- 総件数: ${items.length}(直近30日: ${recent})`,
  '',
  '| カテゴリ | 件数 |',
  '|---|---|',
  ...Object.entries(byCategory).map(([k, v]) => `| ${k} | ${v} |`),
  '',
  '詳細は feedback.jsonl を参照。',
  '',
].join('\n');

await writeFile('feedback-export/summary.md', summary, 'utf-8');

console.log(`✅ ${items.length}件のフィードバックを feedback-export/ に書き出しました。`);
console.log(summary);
