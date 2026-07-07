import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'screenshots');
mkdirSync(OUT, { recursive: true });

const PHONE = { width: 390, height: 844 };
const BASE = 'http://localhost:8090';

function daysAgoKey(n) {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}
const today = daysAgoKey(0);

const STORE_STATE = {
  state: {
    profile: {
      name: 'テストユーザー',
      goal: '毎日健康的な習慣を続ける',
      onboardingDone: true,
      moodReminderTime: '22:00',
      weeklyNotificationEnabled: true,
      weeklyNotificationTime: '09:00',
    },
    habits: [
      { id: 'h1', name: '朝の水分補給', emoji: '💧', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'h2', name: '10分ストレッチ', emoji: '🤸', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'h3', name: '読書30分', emoji: '📚', createdAt: '2026-05-10T00:00:00.000Z' },
    ],
    completions: {
      [today]: ['h1'],
      [daysAgoKey(1)]: ['h1', 'h2'],
      [daysAgoKey(2)]: ['h1', 'h2', 'h3'],
      [daysAgoKey(3)]: ['h1', 'h2'],
      [daysAgoKey(4)]: ['h1'],
      [daysAgoKey(5)]: ['h1', 'h2', 'h3'],
      [daysAgoKey(6)]: ['h1', 'h2'],
    },
    moods: {
      [today]: 4,
      [daysAgoKey(1)]: 3,
      [daysAgoKey(2)]: 5,
      [daysAgoKey(3)]: 4,
      [daysAgoKey(4)]: 2,
    },
    chat: [],
    coachUsage: { date: '', count: 0 },
    isPremium: false,
    seenMilestones: [],
    referralCode: 'ABCD-1234',
    freeTrialUntil: null,
    redeemedCodes: [],
  },
  version: 0,
};

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox'],
});

const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.addInitScript((s) => {
  localStorage.setItem('kokoro-coach-store', JSON.stringify(s));
}, STORE_STATE);

// 注意: import.meta エラーをフィルタしないこと。
// 過去にこのエラーがバンドル全体を殺して全画面真っ白の原因だった(zustand ESM)。
page.on('pageerror', err => {
  console.log('[ERR]', err.message.substring(0, 150));
});

// 設定タブを最初に開く（Zustandの非同期ハイドレーション待ち）
await page.goto(`${BASE}/settings`, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);

// 03_settings スクリーンショット
await page.screenshot({ path: path.join(OUT, '03_settings.png'), clip: { x: 0, y: 0, ...PHONE } });
console.log('✓ 03_settings.png');

// きろくタブへ（SPA内ナビゲーション）
const statsTab = page.locator('[role="tab"]').filter({ hasText: 'きろく' }).first();
if (await statsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
  await statsTab.click();
} else {
  await page.goto(`${BASE}/stats`, { waitUntil: 'load', timeout: 30000 });
}
await page.waitForTimeout(2000);
await page.screenshot({ path: path.join(OUT, '02_stats.png'), clip: { x: 0, y: 0, ...PHONE } });
console.log('✓ 02_stats.png');

// 今日タブへ（タブバーをクリック）
const todayTab = page.locator('[role="tab"]').filter({ hasText: '今日' }).first();
const todayTabAlt = page.locator('text=今日').first();
if (await todayTab.isVisible({ timeout: 2000 }).catch(() => false)) {
  await todayTab.click();
} else if (await todayTabAlt.isVisible({ timeout: 2000 }).catch(() => false)) {
  await todayTabAlt.click();
}
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(OUT, '01_today.png'), clip: { x: 0, y: 0, ...PHONE } });
console.log('✓ 01_today.png');

console.log('Final URL:', page.url());

await browser.close();
console.log('Done → screenshots/');
