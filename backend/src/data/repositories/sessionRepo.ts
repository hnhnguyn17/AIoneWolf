/**
 * data/repositories/sessionRepo.ts — refresh token (jti) lưu DB để thu hồi được.
 */
import { db } from '../db.js';
import type { SessionRow } from '../types.js';

const insertStmt = db.prepare(
  `INSERT INTO sessions (jti, wallet, createdAt, expiresAt, revoked)
   VALUES (@jti, @wallet, @createdAt, @expiresAt, 0)`,
);
const getStmt = db.prepare<[string], SessionRow>('SELECT * FROM sessions WHERE jti = ?');
const revokeStmt = db.prepare('UPDATE sessions SET revoked = 1 WHERE jti = ?');

export function createSession(opts: { jti: string; wallet: string; expiresAt: string }): void {
  insertStmt.run({ ...opts, createdAt: new Date().toISOString() });
}

export function isValid(jti: string): boolean {
  const s = getStmt.get(jti);
  if (!s || s.revoked) return false;
  return new Date(s.expiresAt).getTime() > Date.now();
}

export function revoke(jti: string): void {
  revokeStmt.run(jti);
}
