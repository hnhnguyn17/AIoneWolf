/**
 * backend/routes/gm.js
 * ─────────────────────────────────────────────────────────────
 * REST cho AI Quản trò (service ai/) gọi vào. Bảo vệ bằng Bearer GM_SECRET.
 *
 *   POST /gm/action         - ghi nhận 1 hành động đêm (KILL/PROTECT/CHECK/SAVE/POISON)
 *   POST /gm/advance-phase  - kết đêm -> công bố sáng (trả deaths) HOẶC chốt vote
 *   GET  /gm/state          - snapshot để AI biết ai sống / pha nào
 *
 * Các route này MUTATE GameRoom và phát socket event ra FE qua emitter được inject.
 */

const express = require('express');
const rooms = require('../game');
const { PHASE } = require('../contracts');

const GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';

/**
 * @param {object} io - socket.io server (để phát event ra FE). Có thể null khi test.
 */
function createGmRouter(io) {
  const router = express.Router();

  // Auth: Bearer GM_SECRET
  router.use((req, res, next) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (token !== GM_SECRET) return res.status(401).json({ error: 'Sai GM_SECRET.' });
    next();
  });

  const emit = (code, event, payload) => { if (io) io.to(code).emit(event, payload); };

  // POST /gm/action { roomCode, action, targetSeat }
  router.post('/action', (req, res) => {
    const { roomCode, action, targetSeat } = req.body || {};
    const room = rooms.getRoom(roomCode);
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại.' });

    const r = room.applyNightAction(action, Number(targetSeat));
    if (!r.ok) return res.status(409).json({ error: r.error });
    return res.json({ ok: true, result: r.result });
  });

  // POST /gm/advance-phase { roomCode, from }
  router.post('/advance-phase', (req, res) => {
    const { roomCode } = req.body || {};
    const room = rooms.getRoom(roomCode);
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại.' });

    switch (room.phase) {
      case PHASE.NIGHT: {
        const out = room.resolveNightAndAnnounce();
        emit(roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        out.deaths.forEach((d) => emit(roomCode, 'player:died', { seat: d.seat, cause: d.cause }));
        emit(roomCode, 'room:state', room.getPublicState());
        return res.json({ phase: room.phase, cycle: room.cycle, deaths: out.deaths });
      }
      case PHASE.DAY_ANNOUNCE: {
        room.beginDiscuss();
        emit(roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        return res.json({ phase: room.phase, cycle: room.cycle });
      }
      case PHASE.DAY_DISCUSS: {
        room.beginVote();
        emit(roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        return res.json({ phase: room.phase, cycle: room.cycle });
      }
      case PHASE.VOTE: {
        const res1 = room.resolveVoteAndLynch();
        if (res1.lynchedSeat !== null) {
          emit(roomCode, 'player:died', { seat: res1.lynchedSeat, cause: 'LYNCH' });
        }
        const win = room.checkWinAndAdvance();
        emit(roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        emit(roomCode, 'room:state', room.getPublicState());
        if (win.over) emit(roomCode, 'game:over', { winner: win.winner });
        return res.json({
          phase: room.phase, cycle: room.cycle,
          lynchedSeat: res1.lynchedSeat, tie: res1.tie,
          over: win.over, winner: win.winner,
        });
      }
      default:
        return res.status(409).json({ error: `Không thể advance từ pha ${room.phase}.` });
    }
  });

  // GET /gm/state?roomCode=ABCD
  router.get('/state', (req, res) => {
    const room = rooms.getRoom(req.query.roomCode);
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại.' });
    return res.json(room.getGmState());
  });

  // POST /gm/speak { roomCode, text } — Quản trò chủ động nói (FE hiển thị + Agora TTS sau)
  router.post('/speak', (req, res) => {
    const { roomCode, text } = req.body || {};
    const room = rooms.getRoom(roomCode);
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại.' });
    emit(roomCode, 'gm:speak', { text });
    return res.json({ ok: true });
  });

  return router;
}

module.exports = { createGmRouter, GM_SECRET };
