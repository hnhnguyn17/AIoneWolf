/**
 * data/repositories/roomRepo.ts — lưu phòng theo mốc state machine.
 * Tạo (WAITING) → update status/phase → đóng (ENDED). Persist tách khỏi GameRoom.
 */
import { db } from '../db.js';
import type { RoomRow } from '../types.js';

const upsertStmt = db.prepare(
  `INSERT INTO rooms (code, hostWallet, status, phase, playerCount, maxPlayers, createdAt)
   VALUES (@code, @hostWallet, @status, @phase, @playerCount, @maxPlayers, @createdAt)
   ON CONFLICT(code) DO UPDATE SET
     status = @status, phase = @phase, playerCount = @playerCount`,
);
const endStmt = db.prepare('UPDATE rooms SET status = ?, endedAt = ? WHERE code = ?');
const getStmt = db.prepare<[string], RoomRow>('SELECT * FROM rooms WHERE code = ?');

export function save(r: {
  code: string;
  hostWallet: string | null;
  status: string;
  phase: string | null;
  playerCount: number;
  maxPlayers: number;
}): void {
  upsertStmt.run({ ...r, createdAt: new Date().toISOString() });
}

export function end(code: string, status = 'ENDED'): void {
  endStmt.run(status, new Date().toISOString(), code);
}

export function get(code: string): RoomRow | undefined {
  return getStmt.get(code);
}
