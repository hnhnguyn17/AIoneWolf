/**
 * data/repositories/authAccountRepo.ts — email/password account storage.
 */
import { db } from '../db.js';
import type { AuthAccountRow } from '../types.js';

const getByEmailStmt = db.prepare<[string], AuthAccountRow>(
  'SELECT * FROM auth_accounts WHERE email = ?',
);
const insertStmt = db.prepare(
  `INSERT INTO auth_accounts (email, wallet, passwordHash, passwordSalt, createdAt, lastLogin)
   VALUES (@email, @wallet, @passwordHash, @passwordSalt, @now, @now)`,
);
const touchLoginStmt = db.prepare('UPDATE auth_accounts SET lastLogin = ? WHERE email = ?');

export function getAuthAccountByEmail(email: string): AuthAccountRow | undefined {
  return getByEmailStmt.get(email);
}

export function createAuthAccount(opts: {
  email: string;
  wallet: string;
  passwordHash: string;
  passwordSalt: string;
}): AuthAccountRow {
  insertStmt.run({ ...opts, now: new Date().toISOString() });
  return getByEmailStmt.get(opts.email)!;
}

export function touchAuthAccountLogin(email: string): AuthAccountRow | undefined {
  touchLoginStmt.run(new Date().toISOString(), email);
  return getByEmailStmt.get(email);
}
