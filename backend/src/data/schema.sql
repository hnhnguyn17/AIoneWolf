-- schema.sql — DDL idempotent (CREATE IF NOT EXISTS). Chạy bởi data/migrate.ts.

-- Người dùng (bền vững, 1 ví = 1 dòng).
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

-- Refresh token (access 1h / refresh nhiều ngày).
CREATE TABLE IF NOT EXISTS sessions (
  jti        TEXT PRIMARY KEY,
  wallet     TEXT NOT NULL,
  createdAt  TEXT NOT NULL,
  expiresAt  TEXT NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);

-- Tài khoản email/password. wallet là id nội bộ dạng "email:<normalized-email>"
-- để những luồng game/JWT hiện có vẫn dùng cùng khóa users.wallet.
CREATE TABLE IF NOT EXISTS auth_accounts (
  email         TEXT PRIMARY KEY,
  wallet        TEXT NOT NULL UNIQUE,
  passwordHash  TEXT NOT NULL,
  passwordSalt  TEXT NOT NULL,
  createdAt     TEXT NOT NULL,
  lastLogin     TEXT NOT NULL
);

-- Lịch sử ván (kết quả mỗi người mỗi ván).
CREATE TABLE IF NOT EXISTS matches (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet    TEXT NOT NULL,
  roomCode  TEXT,
  role      TEXT,
  team      TEXT,
  won       INTEGER NOT NULL,
  delta     INTEGER NOT NULL,
  eloAfter  INTEGER NOT NULL,
  playedAt  TEXT NOT NULL
);

-- Tham gia phòng (ai ở phòng nào, vai gì) — tạo khi vào, cập nhật khi rời/hết.
CREATE TABLE IF NOT EXISTS attendance (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  roomCode  TEXT NOT NULL,
  wallet    TEXT,
  name      TEXT NOT NULL,
  seat      INTEGER NOT NULL,
  role      TEXT,
  active    INTEGER NOT NULL DEFAULT 1,
  joinedAt  TEXT NOT NULL,
  leftAt    TEXT
);

-- Phòng (lưu khi tạo, cập nhật trạng thái theo mốc state machine).
CREATE TABLE IF NOT EXISTS rooms (
  code        TEXT PRIMARY KEY,
  hostWallet  TEXT,
  status      TEXT NOT NULL,
  phase       TEXT,
  playerCount INTEGER NOT NULL DEFAULT 0,
  maxPlayers  INTEGER NOT NULL,
  createdAt   TEXT NOT NULL,
  endedAt     TEXT
);
