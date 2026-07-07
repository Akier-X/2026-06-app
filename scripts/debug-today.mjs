import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHONE = { width: 390, height: 844 };

const STORE_STATE = {
  state: {
    profile: { name: 'テスト', goal: '健康', onboardingDone: true },
    habits: [],
    completions: {},
    moods: {},
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

const allMessages = [];
page.on('console', msg => {
  const text = msg.text();
  if (!text.includes('import.meta') && !text.includes('iosAppId')) {
    allMessages.push(`[${msg.type()}] ${text.substring(0, 200)}`);
  }
});
page.on('pageerror', err => {
  if (!err.message.includes('import.meta')) allMessages.push(`[PAGEERROR] ${err.message.substring(0, 200)}`);
});
page.on('response', res => {
  if (res.status() >= 400) allMessages.push(`[${res.status()}] ${res.url()}`);
});

await page.goto('http://localhost:8090/settings', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(5000);

console.log('URL:', page.url());
console.log('Messages:');
allMessages.forEach(m => console.log(' ', m));

const dom = await page.evaluate(() => {
  const root = document.getElementById('root');
  return root?.innerHTML?.substring(0, 500) ?? 'no root';
});
console.log('DOM:', dom.substring(0, 300));

await browser.close();
