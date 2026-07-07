/**
 * Google Play ストア素材を生成する。
 *
 *   node scripts/generate-store-assets.mjs            # Feature Graphic のみ
 *   node scripts/generate-store-assets.mjs --shots    # + スクリーンショット(要: expo web on :8090)
 *
 * 生成物:
 *   store-assets/feature-graphic.png   1024x500
 *   store-assets/screenshot-*.png      1080x1920 (9:16)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'store-assets');
mkdirSync(OUT, { recursive: true });

const WITH_SHOTS = process.argv.includes('--shots');
const BASE = 'http://localhost:8090';

// ── 和色 ──
const WASHI = '#F7F2E7';
const CARD = '#FFFDF6';
const INK = '#26322B';
const INK2 = '#5F6D65';
const PETAL = '#D0684A';
const CORE = '#E3B54F';
const PINE = '#3E7053';

// ── 決定的乱数と花(generate-icons.mjsと同一アルゴリズム) ──
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
function createRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + (((pb >> 16) & 255) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + (((pb >> 8) & 255) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}
function petalPath(len, width, curl) {
  const w = width / 2;
  return `M 0 0 C ${w * (1 + curl)} ${-len * 0.28}, ${w * 0.9} ${-len * 0.72}, 0 ${-len} C ${-w * 0.9} ${-len * 0.72}, ${-w * (1 - curl)} ${-len * 0.28}, 0 0 Z`;
}
function bloomGroup({ radius, seedKey, petals, color, coreColor }) {
  const rng = createRng(hashSeed(seedKey));
  const n = Math.min(petals + 4, 13);
  const baseRot = rng() * 360;
  const outer = [];
  const inner = [];
  for (let i = 0; i < n; i++) {
    const angle = baseRot + (i * 360) / n + (rng() - 0.5) * 9;
    const len = radius * (0.9 + rng() * 0.18);
    const width = len * (0.5 + rng() * 0.14);
    const curl = (rng() - 0.5) * 0.25;
    outer.push(`<path d="${petalPath(len, width, curl)}" fill="${color}" fill-opacity="0.5" transform="rotate(${angle.toFixed(2)})"/>`);
    inner.push(`<path d="${petalPath(len * 0.64, width * 0.6, curl * 0.5)}" fill="${mixHex(color, '#FFFFFF', 0.32)}" fill-opacity="0.65" transform="rotate(${(angle + (rng() - 0.5) * 6).toFixed(2)})"/>`);
  }
  const coreR = radius * 0.2;
  const seeds = [];
  const seedCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < seedCount; i++) {
    const a = (((i * 360) / seedCount + rng() * 20) * Math.PI) / 180;
    const rr = coreR * (1.55 + rng() * 0.3);
    seeds.push(`<circle cx="${(Math.cos(a) * rr).toFixed(1)}" cy="${(Math.sin(a) * rr).toFixed(1)}" r="${(radius * 0.045).toFixed(1)}" fill="${mixHex(coreColor, INK, 0.25)}" fill-opacity="0.9"/>`);
  }
  return (
    outer.join('') + inner.join('') +
    `<circle r="${coreR}" fill="${coreColor}"/><circle r="${coreR * 0.45}" fill="${mixHex(coreColor, '#FFFFFF', 0.45)}"/>` +
    seeds.join('')
  );
}

/** 茎つきの一輪(庭用) */
function sprout({ x, baseY, headY, radius, seedKey, color, petals }) {
  const rng = createRng(hashSeed(seedKey + ':stem'));
  const sway = (rng() - 0.5) * 18;
  const stem = `<path d="M ${x} ${baseY} C ${x - sway * 0.3} ${baseY - (baseY - headY) * 0.4}, ${x + sway} ${headY + (baseY - headY) * 0.35}, ${x + sway * 0.5} ${headY + radius * 0.6}" stroke="${mixHex(PINE, WASHI, 0.15)}" stroke-width="3.4" stroke-linecap="round" fill="none"/>`;
  const leaf = `<path d="M ${x} ${baseY - 16} q -14 -6 -17 -19 q 13 2 17 19 Z" fill="${mixHex(PINE, WASHI, 0.15)}" fill-opacity="0.7"/>`;
  return stem + leaf + `<g transform="translate(${x + sway * 0.5} ${headY})">${bloomGroup({ radius, seedKey, petals: petals ?? 3 + Math.floor(rng() * 5), color, coreColor: CORE })}</g>`;
}

// ─────────────────────────────────────────────
// 1. Feature Graphic 1024x500
// ─────────────────────────────────────────────
function featureGraphicHtml() {
  const W = 1024;
  const H = 500;
  const moods = ['#8AA69E', '#A9B47F', '#D0684A', '#DCAC4E', '#7C8FA0', '#DCAC4E'];
  const garden = [];
  const baseY = 420;
  // 3本目(x=790)が主役の大輪。テキスト領域(〜560px)には被せない
  const xs = [655, 722, 790, 862, 925, 975];
  const radii = [30, 38, 62, 34, 42, 26];
  const heights = [120, 180, 265, 150, 210, 95];
  xs.forEach((x, i) => {
    const headY = baseY - heights[i];
    garden.push(sprout({ x, baseY, headY, radius: radii[i], seedKey: i === 2 ? 'kokoro-coach-icon' : `fg-day-${i}`, color: i === 2 ? PETAL : moods[i], petals: i === 2 ? 8 : undefined }));
  });
  const bigBloom = '';
  return `<!doctype html><html><head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0} body{width:${W}px;height:${H}px;overflow:hidden;background:${WASHI};position:relative;font-family:'Shippori Mincho B1',serif}
.title{position:absolute;left:64px;top:150px;color:${INK};font-size:64px;font-weight:800;letter-spacing:10px}
.tagline{position:absolute;left:66px;top:250px;color:${INK2};font-size:25px;font-weight:600;letter-spacing:4px}
.sub{position:absolute;left:66px;top:305px;color:${mixHex(INK2, WASHI, 0.3)};font-size:16px;letter-spacing:3px}
.seal{position:absolute;left:64px;top:70px;width:34px;height:34px;background:#C0653F;border-radius:7px;color:${CARD};font-size:19px;font-weight:700;display:flex;align-items:center;justify-content:center}
.brand{position:absolute;left:110px;top:76px;color:${mixHex(INK2, WASHI, 0.25)};font-size:15px;letter-spacing:5px}
</style></head><body>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">
  <line x1="600" y1="${baseY}" x2="1000" y2="${baseY}" stroke="${mixHex(INK, WASHI, 0.82)}" stroke-width="2.5" stroke-linecap="round"/>
  ${garden.join('')}
  ${bigBloom}
</svg>
<div class="seal">心</div><div class="brand">KOKORO COACH</div>
<div class="title">ココロコーチ</div>
<div class="tagline">毎日の記録が、一輪の花になる。</div>
<div class="sub">習慣 × 気分 × AI分析 — こころの庭を育てるセルフケア</div>
</body></html>`;
}

// ─────────────────────────────────────────────
// 2. アプリ実機スクリーンショット 1080x1920 (9:16)
// ─────────────────────────────────────────────
function daysAgoKey(n) {
  const d = new Date(Date.now() - n * 86400000);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
}
const STORE_STATE = {
  state: {
    profile: { name: 'ゆうき', goal: '毎日を少しずつ整える', onboardingDone: true },
    habits: [
      { id: 'h1', name: '朝の白湯', emoji: '🍵', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'h2', name: '10分散歩', emoji: '🚶', createdAt: '2026-05-01T00:00:00.000Z' },
      { id: 'h3', name: '寝る前の読書', emoji: '📖', createdAt: '2026-05-10T00:00:00.000Z' },
    ],
    completions: {
      [daysAgoKey(0)]: ['h1', 'h2', 'h3'],
      [daysAgoKey(1)]: ['h1', 'h2'],
      [daysAgoKey(2)]: ['h1', 'h2', 'h3'],
      [daysAgoKey(3)]: ['h1'],
      [daysAgoKey(4)]: ['h1', 'h2'],
      [daysAgoKey(5)]: ['h1', 'h2', 'h3'],
      [daysAgoKey(6)]: ['h1', 'h2'],
    },
    moods: {
      [daysAgoKey(0)]: 5, [daysAgoKey(1)]: 4, [daysAgoKey(2)]: 4,
      [daysAgoKey(3)]: 2, [daysAgoKey(4)]: 3, [daysAgoKey(5)]: 5, [daysAgoKey(6)]: 4,
    },
    chat: [],
    coachUsage: { date: '', count: 0 },
    isPremium: true,
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

// Feature Graphic
{
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(featureGraphicHtml(), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'feature-graphic.png'), clip: { x: 0, y: 0, width: 1024, height: 500 } });
  console.log('✓ feature-graphic.png 1024x500');
  await page.close();
}

if (WITH_SHOTS) {
  const PHONE = { width: 360, height: 640 }; // x3 = 1080x1920 (9:16)
  const shots = [
    { file: 'screenshot-1-today.png', url: '/', action: null },
    {
      file: 'screenshot-2-share.png',
      url: '/',
      action: async (page) => {
        const btn = page.locator('text=一輪をシェア').first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(1500);
        }
      },
    },
    { file: 'screenshot-3-garden.png', url: '/stats', action: null },
    { file: 'screenshot-4-coach.png', url: '/coach', action: null },
    { file: 'screenshot-5-tree.png', url: '/settings', action: null },
  ];
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 3 });
    const page = await ctx.newPage();
    await page.addInitScript((st) => localStorage.setItem('kokoro-coach-store', JSON.stringify(st)), STORE_STATE);
    await page.goto(`${BASE}${s.url}`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);
    if (s.action) await s.action(page);
    await page.screenshot({ path: path.join(OUT, s.file), clip: { x: 0, y: 0, ...PHONE } });
    console.log('✓', s.file, '1080x1920');
    await ctx.close();
  }
}

await browser.close();
console.log('Done → store-assets/');
