/**
 * backend/mock/seed-fake.js
 * ─────────────────────────────────────────────────────────────
 * Bơm DỮ LIỆU GIẢ vào SQLite để thao tác thử: ~20 user (leaderboard),
 * vài phòng "kênh thế giới", và ít lịch sử ván.
 *
 * Idempotent: chạy lại nhiều lần không nhân bản (dùng upsert + set thẳng stats).
 * Chạy: `node mock/seed-fake.js`  (hoặc `npm run db:seed`)
 */
const db = require('../src/db/store');

// ── 20 fake users (cho leaderboard + profile) ──
// Wallet chỉ là chuỗi định danh (không xác thực ở seed) — đủ dài cho giống địa chỉ Solana.
const NAMES = [
  'Sói Đầu Đàn', 'Thợ Săn Bóng Đêm', 'Tiên Tri Cổ', 'Vệ Binh Thép', 'Tân Binh Mơ Mộng',
  'Phù Thủy Tím', 'Lữ Khách Vô Danh', 'Quạ Đêm', 'Bóng Ma Rừng Sâu', 'Trăng Máu',
  'Kẻ Săn Tiền', 'Đao Phủ Lặng', 'Cú Mèo Trắng', 'Lang Thang', 'Hồn Sương',
  'Thần Tình Yêu', 'Sát Thủ Im Lặng', 'Người Thổi Sáo', 'Linh Mục Già', 'Vua Sương Mù',
];

// ELO rải đều các hạng: Chúa Tể (>=2000), Ma Sói (>=1500), Thợ Săn (>=1000), Tân Binh (<1000).
const ELOS = [
  2310, 2150, 1990, 1880, 1760, 1690, 1620, 1540, 1480, 1410,
  1330, 1270, 1190, 1120, 1060, 980, 910, 840, 720, 610,
];

/** Tạo wallet giả tất định (deterministic) để seed lại không sinh ví mới. */
function fakeWallet(i) {
  const base = `Fake${String(i).padStart(2, '0')}Wolf`;
  return (base + 'x'.repeat(44 - base.length)).slice(0, 44);
}

const USERS = NAMES.map((name, i) => ({ wallet: fakeWallet(i), name, elo: ELOS[i] }));

for (const u of USERS) {
  db.upsertUser(u.wallet, { name: u.name });
  const wins = Math.max(0, Math.round((u.elo - 1000) / 25)) + 5;
  const losses = Math.round(wins * 0.6);
  db.setStats(u.wallet, { elo: u.elo, wins, losses, bestStreak: Math.min(wins, 12) });

  // Vài dòng lịch sử ván cho mục History (xen kẽ thắng/thua) — chỉ thêm nếu user chưa có lịch sử.
  if (db.matchHistory(u.wallet, 1).length === 0) {
    for (let i = 0; i < 6; i++) {
      db.recordResult(u.wallet, {
        role: ['WEREWOLF', 'SEER', 'VILLAGER', 'GUARD'][i % 4],
        team: i % 3 === 0 ? 'WEREWOLF' : 'VILLAGE',
        won: i % 2 === 0, survived: i % 2 === 0,
      });
    }
  }
  // Khôi phục ELO fake sau khi recordResult làm xê dịch.
  db.setStats(u.wallet, { elo: u.elo, wins, losses, bestStreak: Math.min(wins, 12) });
}

// ── Fake phòng "kênh thế giới" ──
const ROOMS = [
  { code: 'ABYS', status: 'WAITING', phase: 'LOBBY', playerCount: 4, maxPlayers: 8,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, VILLAGER: 4 } },
  { code: 'LYCN', status: 'PLAYING', phase: 'NIGHT', playerCount: 8, maxPlayers: 8,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, WITCH: 1, VILLAGER: 3 } },
  { code: 'MOON', status: 'WAITING', phase: 'LOBBY', playerCount: 2, maxPlayers: 6,
    roles: { WEREWOLF: 1, SEER: 1, VILLAGER: 4 } },
  { code: 'FANG', status: 'PLAYING', phase: 'DAY_DISCUSS', playerCount: 10, maxPlayers: 12,
    roles: { WEREWOLF: 3, SEER: 1, GUARD: 1, WITCH: 1, HUNTER: 1, VILLAGER: 5 } },
  { code: 'HOWL', status: 'WAITING', phase: 'LOBBY', playerCount: 6, maxPlayers: 10,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, WITCH: 1, VILLAGER: 5 } },
];

for (const r of ROOMS) {
  db.saveRoom({ ...r, hostWallet: USERS[0].wallet, isPublic: true });
}

console.log('✅ Seed xong:');
console.log(`   - Users: ${db.leaderboard(1000).length} (hiển thị top 5: ` +
  db.leaderboard(5).map((u) => `${u.name}(${u.elo}/${u.rank.name})`).join(', ') + ')');
console.log('   - Rooms:', db.publicRooms(10).map((r) => `${r.code}[${r.status},${r.playerCount}/${r.maxPlayers}]`).join(', '));
process.exit(0);
