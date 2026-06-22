/**
 * data/repositories/userRepo.ts — đọc/ghi bảng users + cập nhật ELO sau ván.
 */
import { db } from '../db.js';
import type { UserRow } from '../types.js';
import { rankOf } from '../../domain/elo.js';

const getStmt = db.prepare<[string], UserRow>('SELECT * FROM users WHERE wallet = ?');
const insertStmt = db.prepare(
  `INSERT INTO users (wallet, name, elo, wins, losses, winStreak, bestStreak, createdAt, lastLogin)
   VALUES (@wallet, @name, 1000, 0, 0, 0, 0, @now, @now)`,
);
const touchLoginStmt = db.prepare('UPDATE users SET lastLogin = ?, name = ? WHERE wallet = ?');
const updateStatsStmt = db.prepare(
  `UPDATE users SET elo = @elo, wins = @wins, losses = @losses,
     winStreak = @winStreak, bestStreak = @bestStreak WHERE wallet = @wallet`,
);

export function getUser(wallet: string): UserRow | undefined {
  return getStmt.get(wallet);
}

/** Lấy user, tạo mới nếu chưa có (lúc đăng nhập lần đầu). */
export function ensureUser(wallet: string, name: string): UserRow {
  const now = new Date().toISOString();
  let u = getStmt.get(wallet);
  if (!u) {
    insertStmt.run({ wallet, name, now });
    u = getStmt.get(wallet)!;
  } else {
    touchLoginStmt.run(now, name, wallet);
  }
  return u;
}

/** Cập nhật kết quả 1 ván cho 1 ví: cộng ELO, win/loss, streak. */
export function applyMatchResult(wallet: string, opts: { won: boolean; delta: number }): UserRow | undefined {
  const u = getStmt.get(wallet);
  if (!u) return undefined;
  const elo = Math.max(0, u.elo + opts.delta);
  const wins = u.wins + (opts.won ? 1 : 0);
  const losses = u.losses + (opts.won ? 0 : 1);
  const winStreak = opts.won ? u.winStreak + 1 : 0;
  const bestStreak = Math.max(u.bestStreak, winStreak);
  updateStatsStmt.run({ wallet, elo, wins, losses, winStreak, bestStreak });
  return getStmt.get(wallet);
}

/** Hồ sơ public (kèm hạng) cho /auth/me. */
export function getProfile(wallet: string) {
  const u = getStmt.get(wallet);
  if (!u) return null;
  return { ...u, rank: rankOf(u.elo) };
}

export function leaderboard(limit = 20): UserRow[] {
  return db.prepare<[number], UserRow>('SELECT * FROM users ORDER BY elo DESC LIMIT ?').all(limit);
}
