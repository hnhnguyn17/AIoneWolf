/**
 * backend/src/db/migrate.js
 * ─────────────────────────────────────────────────────────────
 * "Migration" cho SQLite. Schema được khai báo dạng CREATE TABLE IF NOT EXISTS
 * ngay trong store.js, nên chỉ cần require('./store') là mọi bảng + index +
 * migration cột (winStreak/bestStreak) được áp dụng, và file
 * backend/data/aionewolf.db được tạo nếu chưa có.
 *
 * Chạy: `node src/db/migrate.js`  (hoặc `npm run db:migrate`)
 */
'use strict';

const fs = require('fs');
const db = require('./store'); // require = chạy toàn bộ CREATE TABLE IF NOT EXISTS

const exists = fs.existsSync(db.DB_FILE);
console.log(`✅ Migrate xong. DB: ${db.DB_FILE} ${exists ? '(sẵn sàng)' : '(MỚI TẠO)'}`);

// Liệt kê nhanh các bảng để xác nhận.
try {
  const users = db.leaderboard(1000).length;
  const rooms = db.publicRooms(1000).length;
  console.log(`   - users: ${users} | public rooms: ${rooms}`);
} catch (e) {
  console.log('   - (không đọc được số liệu, nhưng bảng đã tạo):', e.message);
}

process.exit(0);
