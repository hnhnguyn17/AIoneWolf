/**
 * api/rooms.routes.ts — lịch sử phòng/ván cho Profile. Khớp FE getHistory.
 *   GET /rooms/history?wallet= → { attendance, matches }
 */
import { Router } from 'express';
import { historyOf as attendanceOf } from '../data/repositories/attendanceRepo.js';
import { historyOf as matchesOf } from '../data/repositories/matchRepo.js';

export const roomsRouter = Router();

roomsRouter.get('/history', (req, res) => {
  const wallet = String(req.query.wallet || '');
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });
  return res.json({ attendance: attendanceOf(wallet), matches: matchesOf(wallet) });
});
