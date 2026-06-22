/**
 * data/seed.ts — dữ liệu demo (user + ELO random) cho leaderboard/lịch sử.
 *   npm run db:seed         seed ~12 user mẫu
 *   npm run db:clean        xóa sạch (DB trắng như người dùng thật)
 */
import { db } from './db.js';
import { ensureUser, applyMatchResult } from './repositories/userRepo.js';

const clean = process.argv.includes('--clean');

if (clean) {
  for (const t of ['users', 'sessions', 'matches', 'attendance', 'rooms']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
  console.log('[seed] Đã xóa sạch toàn bộ bảng.');
  process.exit(0);
}

const NAMES = ['Mặt Trăng', 'Sói Xám', 'Tiên Tri', 'Lữ Khách', 'Bão Đêm', 'Hồ Ly',
  'Thợ Săn', 'Bạch Dương', 'Hắc Ám', 'Minh Nguyệt', 'Cô Độc', 'Vô Danh'];

NAMES.forEach((name, i) => {
  const wallet = `seed_${i.toString().padStart(2, '0')}`;
  ensureUser(wallet, name);
  // vài ván giả để ELO khác nhau
  const games = 3 + (i % 5);
  for (let g = 0; g < games; g++) {
    const won = Math.random() > 0.45;
    applyMatchResult(wallet, { won, delta: won ? 15 : -10 });
  }
});

console.log(`[seed] Đã tạo ${NAMES.length} user demo.`);
