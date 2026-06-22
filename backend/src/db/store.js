/**
 * backend/db/store.js
 * ─────────────────────────────────────────────────────────────
 * Database SQLite — dùng module BUILT-IN `node:sqlite` (Node >= 22.5/24).
 * KHÔNG cần cài thư viện, KHÔNG biên dịch native (chạy ngon trên Windows).
 *
 * File DB: backend/data/aionewolf.db  (tắt/bật server vẫn còn dữ liệu).
 *
 * API giữ nguyên: getUser / upsertUser / recordResult / leaderboard
 * → nếu sau này đổi sang Postgres chỉ cần thay file này.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'aionewolf.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_FILE);

// Khởi tạo bảng users (1 dòng = 1 ví)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    wallet      TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    elo         INTEGER NOT NULL DEFAULT 1000,
    wins        INTEGER NOT NULL DEFAULT 0,
    losses      INTEGER NOT NULL DEFAULT 0,
    winStreak   INTEGER NOT NULL DEFAULT 0,
    bestStreak  INTEGER NOT NULL DEFAULT 0,
    createdAt   TEXT NOT NULL,
    lastLogin   TEXT NOT NULL
  );
`);

// Bảng session: lưu refresh token (access 1h / refresh 3 ngày)
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    jti        TEXT PRIMARY KEY,
    wallet     TEXT NOT NULL,
    createdAt  TEXT NOT NULL,
    expiresAt  TEXT NOT NULL,
    revoked    INTEGER NOT NULL DEFAULT 0
  );
`);

// Lịch sử ván (đơn giản, phục vụ History ở Profile)
db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet    TEXT NOT NULL,
    role      TEXT,
    won       INTEGER NOT NULL,
    delta     INTEGER NOT NULL,
    eloAfter  INTEGER NOT NULL,
    playedAt  TEXT NOT NULL
  );
`);

// Bảng rooms: mỗi phòng được tạo lưu vào đây, cập nhật khi sửa/thêm người.
db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    code        TEXT PRIMARY KEY,
    hostWallet  TEXT,
    status      TEXT NOT NULL DEFAULT 'WAITING',  -- WAITING | PLAYING | ENDED
    phase       TEXT NOT NULL DEFAULT 'LOBBY',
    playerCount INTEGER NOT NULL DEFAULT 0,
    maxPlayers  INTEGER NOT NULL DEFAULT 8,
    rolesJson   TEXT,                              -- cấu hình vai (JSON)
    isPublic    INTEGER NOT NULL DEFAULT 1,        -- 1 = hiện ở "kênh thế giới"
    createdAt   TEXT NOT NULL,
    updatedAt   TEXT NOT NULL
  );
`);

// Bảng attendance: ai đang/đã ở phòng nào. active=1 nghĩa là đang trong phòng.
// Ràng buộc "1 người chỉ 1 phòng đồng thời" enforce ở tầng logic (joinRoom).
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    roomCode    TEXT NOT NULL,
    wallet      TEXT,
    name        TEXT,
    seat        INTEGER,
    active      INTEGER NOT NULL DEFAULT 1,
    joinedAt    TEXT NOT NULL,
    leftAt      TEXT
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_att_wallet ON attendance(wallet, active);`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_att_room ON attendance(roomCode, active);`);

// Bảng nfts: lưu trữ thông tin NFT đã đúc (ví, địa chỉ mint, loại badge, tx signature, thời gian)
db.exec(`
  CREATE TABLE IF NOT EXISTS nfts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet      TEXT NOT NULL,
    mint        TEXT NOT NULL UNIQUE,
    badge       TEXT NOT NULL,
    tx          TEXT NOT NULL,
    mintedAt    TEXT NOT NULL
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_nfts_wallet ON nfts(wallet);`);

// Migration nhẹ: nếu DB cũ thiếu cột streak thì thêm (bỏ qua nếu đã có)
for (const col of ['winStreak', 'bestStreak']) {
  try { db.exec(`ALTER TABLE users ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 0`); } catch { /* đã có */ }
}

// Prepared statements (tái dùng, nhanh + an toàn SQL injection)
const qGet = db.prepare('SELECT * FROM users WHERE wallet = ?');
const qInsert = db.prepare(
  `INSERT INTO users (wallet, name, elo, wins, losses, createdAt, lastLogin)
   VALUES (?, ?, 1000, 0, 0, ?, ?)`
);
const qTouch = db.prepare('UPDATE users SET lastLogin = ?, name = COALESCE(?, name) WHERE wallet = ?');
const qResult = db.prepare('UPDATE users SET wins = ?, losses = ?, elo = ?, winStreak = ?, bestStreak = ? WHERE wallet = ?');
const qBoard = db.prepare('SELECT * FROM users ORDER BY elo DESC LIMIT ?');

// sessions (refresh token)
const qSessInsert = db.prepare('INSERT INTO sessions (jti, wallet, createdAt, expiresAt, revoked) VALUES (?, ?, ?, ?, 0)');
const qSessGet = db.prepare('SELECT * FROM sessions WHERE jti = ?');
const qSessRevoke = db.prepare('UPDATE sessions SET revoked = 1 WHERE jti = ?');
const qSessRevokeWallet = db.prepare('UPDATE sessions SET revoked = 1 WHERE wallet = ?');

// matches (lịch sử)
const qMatchInsert = db.prepare('INSERT INTO matches (wallet, role, won, delta, eloAfter, playedAt) VALUES (?, ?, ?, ?, ?, ?)');
const qMatchByWallet = db.prepare('SELECT * FROM matches WHERE wallet = ? ORDER BY id DESC LIMIT ?');

// nfts (NFT đã đúc)
const qNftInsert = db.prepare(
  `INSERT INTO nfts (wallet, mint, badge, tx, mintedAt)
   VALUES (?, ?, ?, ?, ?)`
);
const qNftByWallet = db.prepare('SELECT * FROM nfts WHERE wallet = ? ORDER BY id DESC');

const { computeDelta, applyDelta, getRank, nftMilestone } = require('../game/elo');

/** Lấy user theo ví (null nếu chưa có). */
function getUser(wallet) {
  return qGet.get(wallet) || null;
}

/**
 * Tạo mới hoặc cập nhật user khi đăng nhập. Lần đầu khởi tạo ELO 1000.
 * @returns {object} user sau cập nhật
 */
function upsertUser(wallet, patch = {}) {
  const now = new Date().toISOString();
  const existing = qGet.get(wallet);
  if (existing) {
    qTouch.run(now, patch.name ?? null, wallet);
  } else {
    const name = patch.name || `Sói ${wallet.slice(0, 4)}`;
    qInsert.run(wallet, name, now, now);
  }
  return qGet.get(wallet);
}

/**
 * Ghi kết quả 1 ván theo công thức ELO trong .ask/ask.txt (game/elo.js).
 * @param {string} wallet
 * @param {object} ctx - { role, team, won, survived, afk?, mvp? }
 * @returns {object} { user, delta, breakdown, rank, nft } — nft != null khi đạt mốc streak
 */
function recordResult(wallet, ctx) {
  const u = qGet.get(wallet);
  if (!u) return null;
  const { delta, breakdown } = computeDelta(ctx);
  const elo = applyDelta(u.elo, delta);
  const wins = u.wins + (ctx.won ? 1 : 0);
  const losses = u.losses + (ctx.won ? 0 : 1);
  const winStreak = ctx.won ? u.winStreak + 1 : 0;
  const bestStreak = Math.max(u.bestStreak, winStreak);

  qResult.run(wins, losses, elo, winStreak, bestStreak, wallet);
  qMatchInsert.run(wallet, ctx.role || null, ctx.won ? 1 : 0, delta, elo, new Date().toISOString());

  const user = qGet.get(wallet);
  return {
    user,
    delta,
    breakdown,
    rank: getRank(elo),
    nft: nftMilestone(winStreak), // mốc NFT 20/50/100 thắng liên tiếp
  };
}

/** Bảng xếp hạng theo ELO giảm dần (kèm hạng). */
function leaderboard(limit = 20) {
  return qBoard.all(limit).map((u) => ({ ...u, rank: getRank(u.elo) }));
}

/** DEV/seed: set thẳng ELO + win/loss cho 1 ví (dùng tạo fake data). */
const qSetStats = db.prepare('UPDATE users SET elo = ?, wins = ?, losses = ?, bestStreak = ? WHERE wallet = ?');
function setStats(wallet, { elo, wins = 0, losses = 0, bestStreak = 0 }) {
  qSetStats.run(elo, wins, losses, bestStreak, wallet);
  return qGet.get(wallet);
}

/** Lịch sử ván của 1 ví. */
function matchHistory(wallet, limit = 20) {
  return qMatchByWallet.all(wallet, limit);
}

// ─── Sessions (refresh token) ─────────────────────────────
function createSession(jti, wallet, expiresAt) {
  qSessInsert.run(jti, wallet, new Date().toISOString(), expiresAt);
}
function getSession(jti) {
  return qSessGet.get(jti) || null;
}
function revokeSession(jti) {
  qSessRevoke.run(jti);
}
function revokeAllSessions(wallet) {
  qSessRevokeWallet.run(wallet);
}

// ─── Rooms (lưu phòng + cập nhật liên tục) ────────────────
const qRoomUpsert = db.prepare(`
  INSERT INTO rooms (code, hostWallet, status, phase, playerCount, maxPlayers, rolesJson, isPublic, createdAt, updatedAt)
  VALUES (@code, @hostWallet, @status, @phase, @playerCount, @maxPlayers, @rolesJson, @isPublic, @now, @now)
  ON CONFLICT(code) DO UPDATE SET
    hostWallet=excluded.hostWallet, status=excluded.status, phase=excluded.phase,
    playerCount=excluded.playerCount, maxPlayers=excluded.maxPlayers,
    rolesJson=excluded.rolesJson, isPublic=excluded.isPublic, updatedAt=excluded.updatedAt
`);
const qRoomGet = db.prepare('SELECT * FROM rooms WHERE code = ?');
const qRoomDelete = db.prepare('DELETE FROM rooms WHERE code = ?');
const qRoomPublic = db.prepare(
  `SELECT * FROM rooms WHERE isPublic = 1 AND status != 'ENDED' ORDER BY updatedAt DESC LIMIT ?`
);

/** Tạo/cập nhật 1 phòng (gọi mỗi khi phòng đổi: tạo, thêm người, đổi role, đổi pha). */
function saveRoom(room) {
  const now = new Date().toISOString();
  qRoomUpsert.run({
    code: room.code,
    hostWallet: room.hostWallet || null,
    status: room.status || 'WAITING',
    phase: room.phase || 'LOBBY',
    playerCount: room.playerCount || 0,
    maxPlayers: room.maxPlayers || 8,
    rolesJson: room.roles ? JSON.stringify(room.roles) : null,
    isPublic: room.isPublic === false ? 0 : 1,
    now,
  });
  return qRoomGet.get(room.code);
}
function getRoomRow(code) { return qRoomGet.get(code) || null; }
function deleteRoom(code) { qRoomDelete.run(code); }
/** Danh sách phòng công khai cho "kênh thế giới". */
function publicRooms(limit = 50) {
  return qRoomPublic.all(limit).map((r) => ({
    ...r,
    roles: r.rolesJson ? safeParse(r.rolesJson) : null,
    isPublic: !!r.isPublic,
  }));
}
function safeParse(s) { try { return JSON.parse(s); } catch { return null; } }

// ─── Attendance (ai ở phòng nào — 1 người 1 phòng) ────────
const qAttActiveByWallet = db.prepare('SELECT * FROM attendance WHERE wallet = ? AND active = 1');
const qAttByRoom = db.prepare('SELECT * FROM attendance WHERE roomCode = ? AND active = 1');
const qAttJoin = db.prepare(
  'INSERT INTO attendance (roomCode, wallet, name, seat, active, joinedAt) VALUES (?, ?, ?, ?, 1, ?)'
);
const qAttLeaveWallet = db.prepare(
  "UPDATE attendance SET active = 0, leftAt = ? WHERE wallet = ? AND active = 1"
);
const qAttLeaveRoom = db.prepare(
  "UPDATE attendance SET active = 0, leftAt = ? WHERE roomCode = ? AND active = 1"
);
const qAttHistoryByWallet = db.prepare(
  'SELECT * FROM attendance WHERE wallet = ? ORDER BY id DESC LIMIT ?'
);

/** Ví này đang ở phòng nào? (null nếu không). Dùng để chặn vào 2 phòng. */
function activeRoomOf(wallet) {
  if (!wallet) return null;
  const row = qAttActiveByWallet.get(wallet);
  return row ? row.roomCode : null;
}
/**
 * Ghi nhận tham gia phòng. Enforce "1 người 1 phòng": rời mọi phòng cũ trước.
 * @returns {{ ok:boolean, error?:string }}
 */
function joinAttendance({ roomCode, wallet, name, seat }) {
  const now = new Date().toISOString();
  if (wallet) {
    const cur = activeRoomOf(wallet);
    if (cur && cur !== roomCode) {
      // Tự rời phòng cũ (1 người 1 phòng). Trả cờ để caller biết.
      qAttLeaveWallet.run(now, wallet);
    } else if (cur === roomCode) {
      return { ok: true, already: true };
    }
  }
  qAttJoin.run(roomCode, wallet || null, name || null, seat ?? null, now);
  return { ok: true };
}
function leaveAttendanceWallet(wallet) {
  if (!wallet) return;
  qAttLeaveWallet.run(new Date().toISOString(), wallet);
}
function leaveAttendanceRoom(roomCode) {
  qAttLeaveRoom.run(new Date().toISOString(), roomCode);
}
function roomAttendance(roomCode) {
  return qAttByRoom.all(roomCode);
}
/** Lịch sử phòng từng tham gia (cho mục "xem lại lịch sử chơi"). */
function attendanceHistory(wallet, limit = 30) {
  return qAttHistoryByWallet.all(wallet, limit);
}

/** Lưu thông tin NFT mới đúc thành công. */
function saveNft(wallet, mint, badge, tx) {
  const now = new Date().toISOString();
  qNftInsert.run(wallet, mint, badge, tx, now);
  return { wallet, mint, badge, tx, mintedAt: now };
}

/** Lấy danh sách NFT của ví. */
function getUserNfts(wallet) {
  if (!wallet) return [];
  return qNftByWallet.all(wallet);
}

module.exports = {
  getUser, upsertUser, recordResult, leaderboard, matchHistory, setStats,
  createSession, getSession, revokeSession, revokeAllSessions,
  // rooms
  saveRoom, getRoomRow, deleteRoom, publicRooms,
  // attendance
  activeRoomOf, joinAttendance, leaveAttendanceWallet, leaveAttendanceRoom,
  roomAttendance, attendanceHistory,
  // nfts
  saveNft, getUserNfts,
  getRank, DB_FILE,
};
