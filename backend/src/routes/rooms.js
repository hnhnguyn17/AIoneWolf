/**
 * backend/src/routes/rooms.js
 * ─────────────────────────────────────────────────────────────
 * REST cho "Kênh Thế Giới" + lịch sử chơi (đọc từ DB).
 *
 *   GET /rooms/public            → danh sách phòng công khai (đang chờ/đang chơi)
 *   GET /rooms/history?wallet=   → lịch sử phòng từng tham gia của 1 ví
 *   GET /rooms/me?wallet=        → ví này đang ở phòng nào (null nếu không)
 */

const express = require('express');
const db = require('../db/store');

const router = express.Router();

// GET /rooms/public — cho dashboard "kênh thế giới"
router.get('/public', (_req, res) => {
  const list = db.publicRooms(50).map((r) => ({
    code: r.code,
    status: r.status,            // WAITING | PLAYING | ENDED
    phase: r.phase,
    playerCount: r.playerCount,
    maxPlayers: r.maxPlayers,
    roles: r.roles,              // cấu hình vai (nếu có)
    updatedAt: r.updatedAt,
  }));
  res.json({ rooms: list });
});

// GET /rooms/history?wallet=<base58> — lịch sử phòng đã tham gia
router.get('/history', (req, res) => {
  const wallet = (req.query.wallet || '').toString();
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });
  res.json({
    attendance: db.attendanceHistory(wallet, 30),
    matches: db.matchHistory(wallet, 30),
  });
});

// GET /rooms/me?wallet= — đang ở phòng nào
router.get('/me', (req, res) => {
  const wallet = (req.query.wallet || '').toString();
  res.json({ activeRoom: wallet ? db.activeRoomOf(wallet) : null });
});

module.exports = router;
