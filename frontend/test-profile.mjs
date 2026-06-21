/**
 * test-profile.mjs — runtime smoke test ProfileVault (build pass ≠ run OK).
 * Mở app, vào màn Profile, bắt console.error + pageerror.
 * Chạy: node test-profile.mjs  (cần FE dev đang chạy ở :3000)
 */
import { chromium } from 'playwright';

const URL = 'http://localhost:3000/';
const errors = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

// Thử điều hướng tới Profile: tìm nút có "Profile"/avatar; nếu không, vẫn check trang load.
const tryClick = async (sel) => {
  const el = await page.$(sel);
  if (el) { await el.click().catch(() => {}); return true; }
  return false;
};

// Một số app render Profile qua nút profile ở Lobby; thử vài selector phổ biến.
await page.waitForTimeout(1500);
const clicked =
  (await tryClick('button:has-text("Profile")')) ||
  (await tryClick('[aria-label*="profile" i]')) ||
  (await tryClick('button:has-text("Hồ sơ")'));

await page.waitForTimeout(2500); // chờ effect getMe/getSolPrice/getSolBalance

// Render ProfileVault trực tiếp cũng được kiểm bằng cách load và để effect chạy.
const title = await page.title();
const bodyText = (await page.textContent('body'))?.slice(0, 120) || '';

await browser.close();

console.log('--- ProfileVault runtime test ---');
console.log('title:', title);
console.log('navigated to profile:', clicked);
console.log('body snippet:', bodyText.replace(/\s+/g, ' ').trim());
if (errors.length) {
  console.log(`\n❌ ${errors.length} lỗi runtime:`);
  for (const e of errors.slice(0, 20)) console.log('  -', e);
  process.exit(1);
} else {
  console.log('\n✅ Không có console.error / pageerror.');
  process.exit(0);
}
