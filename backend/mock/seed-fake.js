/**
 * backend/mock/seed-fake.js
 * ─────────────────────────────────────────────────────────────
 * Bơm DỮ LIỆU GIẢ vào SQLite để thao tác thử: vài user (leaderboard),
 * vài phòng "kênh thế giới", và ít lịch sử ván. Chạy: `node mock/seed-fake.js`
 */
const db = require('../src/db/store');

// ── Fake users (cho leaderboard + profile) ──
const USERS = [
  { wallet: 'WolfKing7xQ2aLpZ9mNvBcD3fGhJ4kRtY8uVwXyZ1234', name: 'Sói Đầu Đàn', elo: 2150 },
  { wallet: 'HunterAB12cd34EF56gh78IJ90kl12MN34op56QR78st90', name: 'Thợ Săn Bóng Đêm', elo: 1720 },
  { wallet: 'SeerXY98zw76VU54ts32RQ10po98NM76lk54JI32hg10fe', name: 'Tiên Tri Cổ', elo: 1480 },
  { wallet: 'GuardP1k2j3h4g5f6d7s8a9z0x1c2v3b4n5m6Q7W8E9R0T', name: 'Vệ Binh Thép', elo: 1180 },
  { wallet: 'NewbieZ9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3h2g1f0', name: 'Tân Binh Mơ Mộng', elo: 620 },
  { wallet: 'WitchM3a9s8k1p2o3i4u5y6t7r8e9w0q1z2x3c4v5b6n7m8', name: 'Phù Thủy Tím', elo: 1990 },
];

for (const u of USERS) {
  db.upsertUser(u.wallet, { name: u.name });
  // Set thẳng ELO fake cho đúng giá trị + win/loss hợp lý.
  const wins = Math.max(0, Math.round((u.elo - 1000) / 25)) + 5;
  const losses = Math.round(wins * 0.6);
  db.setStats(u.wallet, { elo: u.elo, wins, losses, bestStreak: Math.min(wins, 12) });
  // Vài dòng lịch sử ván cho mục History (xen kẽ thắng/thua).
  for (let i = 0; i < 6; i++) {
    db.recordResult(u.wallet, {
      role: ['WEREWOLF', 'SEER', 'VILLAGER', 'GUARD'][i % 4],
      team: i % 3 === 0 ? 'WEREWOLF' : 'VILLAGE',
      won: i % 2 === 0, survived: i % 2 === 0,
    });
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
console.log('   - Users:', db.leaderboard(10).map((u) => `${u.name}(${u.elo}/${u.rank.name})`).join(', '));
console.log('   - Rooms:', db.publicRooms(10).map((r) => `${r.code}[${r.status},${r.playerCount}/${r.maxPlayers}]`).join(', '));
process.exit(0);
