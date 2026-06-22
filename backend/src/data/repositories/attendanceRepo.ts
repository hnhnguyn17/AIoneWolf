/**
 * data/repositories/attendanceRepo.ts — ai ở phòng nào, vai gì.
 * Tạo khi vào phòng; cập nhật vai khi chia bài; đánh dấu rời khi ra/hết ván.
 */
import { db } from '../db.js';
import type { AttendanceRow } from '../types.js';

const insertStmt = db.prepare(
  `INSERT INTO attendance (roomCode, wallet, name, seat, role, active, joinedAt)
   VALUES (@roomCode, @wallet, @name, @seat, NULL, 1, @joinedAt)`,
);
const setRoleStmt = db.prepare(
  'UPDATE attendance SET role = ? WHERE roomCode = ? AND seat = ? AND active = 1',
);
const leaveStmt = db.prepare(
  'UPDATE attendance SET active = 0, leftAt = ? WHERE roomCode = ? AND seat = ? AND active = 1',
);
const byWalletStmt = db.prepare<[string], AttendanceRow>(
  'SELECT * FROM attendance WHERE wallet = ? ORDER BY joinedAt DESC LIMIT 50',
);

export function join(opts: { roomCode: string; wallet: string | null; name: string; seat: number }): void {
  insertStmt.run({ ...opts, joinedAt: new Date().toISOString() });
}

export function setRole(roomCode: string, seat: number, role: string): void {
  setRoleStmt.run(role, roomCode, seat);
}

export function leave(roomCode: string, seat: number): void {
  leaveStmt.run(new Date().toISOString(), roomCode, seat);
}

export function historyOf(wallet: string): AttendanceRow[] {
  return byWalletStmt.all(wallet);
}
