/**
 * アプリアイコン一式を生成アート(今日の一輪)から生成する。
 * src/components/art/Bloom.tsx と同じ決定的アルゴリズムをSVGで再現し、
 * Playwright(Chrome)でPNGにラスタライズする。
 *
 *   node scripts/generate-icons.mjs
 *
 * 生成物: assets/images/{icon,android-icon-foreground,android-icon-background,
 *          android-icon-monochrome,splash-icon,favicon}.png
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'assets', 'images');

// ── 和色(theme.tsと同期) ──
const WASHI = '#F7F2E7';
const PETAL = '#D0684A'; // 洗朱(moodScale最上段)
const CORE = '#E3B54F'; // 山吹
const INK = '#26322B';

// ── seed.ts と同じ決定的乱数 ──
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

// ── Bloom.tsx と同じ花びらパス ──
function petalPath(len, width, curl) {
  const w = width / 2;
  return [
    'M 0 0',
    `C ${w * (1 + curl)} ${-len * 0.28}, ${w * 0.9} ${-len * 0.72}, 0 ${-len}`,
    `C ${-w * 0.9} ${-len * 0.72}, ${-w * (1 - curl)} ${-len * 0.28}, 0 0`,
    'Z',
  ].join(' ');
}

/**
 * アイコン用の一輪SVG(中身のグループのみ)。
 * mono=trueで単色シルエット(Androidモノクロアイコン用)。
 */
function bloomGroup({ radius, seedKey, petals, color, coreColor, mono = false }) {
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
    outer.push(
      `<path d="${petalPath(len, width, curl)}" fill="${color}" fill-opacity="${mono ? 1 : 0.5}" transform="rotate(${angle.toFixed(2)})"/>`,
    );
    inner.push(
      `<path d="${petalPath(len * 0.64, width * 0.6, curl * 0.5)}" fill="${mono ? color : mixHex(color, '#FFFFFF', 0.32)}" fill-opacity="${mono ? 1 : 0.65}" transform="rotate(${(angle + (rng() - 0.5) * 6).toFixed(2)})"/>`,
    );
  }
  const coreR = radius * 0.2;
  const seeds = [];
  const seedCount = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < seedCount; i++) {
    const a = (((i * 360) / seedCount + rng() * 20) * Math.PI) / 180;
    const rr = coreR * (1.55 + rng() * 0.3);
    seeds.push(
      `<circle cx="${(Math.cos(a) * rr).toFixed(1)}" cy="${(Math.sin(a) * rr).toFixed(1)}" r="${(radius * 0.045).toFixed(1)}" fill="${mono ? color : mixHex(coreColor, INK, 0.25)}" fill-opacity="${mono ? 1 : 0.9}"/>`,
    );
  }
  const core = mono
    ? `<circle r="${coreR}" fill="${color}"/>`
    : `<circle r="${coreR}" fill="${coreColor}"/><circle r="${coreR * 0.45}" fill="${mixHex(coreColor, '#FFFFFF', 0.45)}"/>`;
  return outer.join('') + inner.join('') + core + seeds.join('');
}

const SEED = 'kokoro-coach-icon';

/** 各アセットのSVG定義 */
function buildSvg(kind, size) {
  const c = size / 2;
  const open = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`;
  const close = '</svg>';
  switch (kind) {
    case 'icon': {
      // 和紙の背景 + 細い落款風の縁 + 一輪
      const bloom = bloomGroup({ radius: size * 0.31, seedKey: SEED, petals: 8, color: PETAL, coreColor: CORE });
      return (
        open +
        `<rect width="${size}" height="${size}" fill="${WASHI}"/>` +
        `<circle cx="${c}" cy="${c}" r="${size * 0.415}" fill="none" stroke="${mixHex(WASHI, INK, 0.16)}" stroke-width="${size * 0.008}" stroke-dasharray="${size * 0.002} ${size * 0.024}" stroke-linecap="round"/>` +
        `<g transform="translate(${c} ${c})">${bloom}</g>` +
        close
      );
    }
    case 'foreground': {
      // アダプティブ前景: 透過背景・セーフゾーン(中央66%)内に収める
      const bloom = bloomGroup({ radius: size * 0.24, seedKey: SEED, petals: 8, color: PETAL, coreColor: CORE });
      return open + `<g transform="translate(${c} ${c})">${bloom}</g>` + close;
    }
    case 'background':
      return open + `<rect width="${size}" height="${size}" fill="${WASHI}"/>` + close;
    case 'monochrome': {
      const bloom = bloomGroup({ radius: size * 0.24, seedKey: SEED, petals: 8, color: '#FFFFFF', coreColor: '#FFFFFF', mono: true });
      return open + `<g transform="translate(${c} ${c})">${bloom}</g>` + close;
    }
    case 'splash': {
      // スプラッシュ: 深緑背景の上に置くため白い一輪(透過PNG)
      const bloom = bloomGroup({ radius: size * 0.3, seedKey: SEED, petals: 8, color: '#F4EFE2', coreColor: '#E9C46A' });
      return open + `<g transform="translate(${c} ${c})">${bloom}</g>` + close;
    }
    case 'favicon': {
      const bloom = bloomGroup({ radius: size * 0.34, seedKey: SEED, petals: 8, color: PETAL, coreColor: CORE });
      return open + `<rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${WASHI}"/>` + `<g transform="translate(${c} ${c})">${bloom}</g>` + close;
    }
  }
}

const TARGETS = [
  { kind: 'icon', size: 1024, file: 'icon.png', transparent: false },
  { kind: 'foreground', size: 1024, file: 'android-icon-foreground.png', transparent: true },
  { kind: 'background', size: 1024, file: 'android-icon-background.png', transparent: false },
  { kind: 'monochrome', size: 1024, file: 'android-icon-monochrome.png', transparent: true },
  { kind: 'splash', size: 512, file: 'splash-icon.png', transparent: true },
  { kind: 'favicon', size: 64, file: 'favicon.png', transparent: false },
];

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox'],
});

for (const t of TARGETS) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size } });
  const svg = buildSvg(t.kind, t.size);
  await page.setContent(
    `<!doctype html><html><head><style>*{margin:0;padding:0}body{background:transparent}</style></head><body>${svg}</body></html>`,
  );
  await page.screenshot({
    path: path.join(OUT, t.file),
    omitBackground: t.transparent,
    clip: { x: 0, y: 0, width: t.size, height: t.size },
  });
  console.log('✓', t.file, `${t.size}x${t.size}`);
  await page.close();
}

await browser.close();
console.log('Done → assets/images/');
