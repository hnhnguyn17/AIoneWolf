/**
 * backend/routes/agora.js
 * ─────────────────────────────────────────────────────────────
 * Cấp Agora RTC token cho client join kênh voice.
 *
 * ⚠️ HIỆN LÀ STUB — trả token=null để FE chạy được luồng.
 * Khi nối thật: dùng App ID + App Certificate sinh token bằng `agora-token`
 * (RtcTokenBuilder.buildTokenWithUid). App Certificate là BÍ MẬT, chỉ ở server.
 *
 * Quy ước channel:
 *   room-<roomCode>-day    : kênh chung cả phòng (ban ngày mở mic)
 *   room-<roomCode>-wolves : kênh riêng phe Sói — CHỈ cấp token cho người là Sói
 */

const express = require('express');
const rooms = require('../game');
const { ROLE } = require('../contracts');

const router = express.Router();

// GET /agora/token?channel=&uid=&role=&roomCode=&seat=
router.get('/token', (req, res) => {
  const channel = (req.query.channel || '').toString();
  const uid = Number(req.query.uid || 0);
  const role = (req.query.role || 'publisher').toString();

  // Bảo vệ kênh wolves: nếu xin kênh sói thì seat phải là Sói
  if (/-wolves$/.test(channel)) {
    const room = rooms.getRoom(req.query.roomCode);
    const seat = Number(req.query.seat);
    const player = room && room.getBySeat(seat);
    if (!player || player.role !== ROLE.WEREWOLF) {
      return res.status(403).json({ error: 'Chỉ phe Sói được vào kênh này.' });
    }
  }

  // TODO(thật): const token = RtcTokenBuilder.buildTokenWithUid(
  //   APP_ID, APP_CERT, channel, uid, RtcRole.PUBLISHER, expireTs);
  return res.json({
    appId: process.env.AGORA_APP_ID || 'STUB_APP_ID',
    channel,
    uid,
    role,
    token: null,   // null = test mode; thay bằng token thật khi có App Certificate
    stub: true,
  });
});

module.exports = router;
