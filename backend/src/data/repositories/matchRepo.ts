/**
 * data/repositories/matchRepo.ts — lịch sử ván (mỗi người mỗi ván 1 dòng).
 */
import { db } from '../db.js';
import type { MatchRow } from '../types.js';

const insertStmt = db.prepare(
  `INSERT INTO matches (wallet, roomCode, role, team, won, delta, eloAfter, playedAt)
   VALUES (@wallet, @roomCode, @role, @team, @won, @delta, @eloAfter, @playedAt)`,
);
const byWalletStmt = db.prepare<[string], MatchRow>(
  'SELECT * FROM matches WHERE wallet = ? ORDER BY playedAt DESC LIMIT 50',
);

export function recordMatch(m: {
  wallet: string;
  roomCode: string | null;
  role: string | null;
  team: string | null;
  won: boolean;
  delta: number;
  eloAfter: number;
}): void {
  insertStmt.run({
    ...m,
    won: m.won ? 1 : 0,
    playedAt: new Date().toISOString(),
  });
}

export function historyOf(wallet: string): MatchRow[] {
  return byWalletStmt.all(wallet);
}
