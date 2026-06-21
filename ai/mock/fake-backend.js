/**
 * mock/fake-backend.js
 * ─────────────────────────────────────────────────────────────
 * [MOCK] Backend gia lap /gm/* de chay tool-server doc lap khi chua co
 * backend that. Tra du lieu gia hop voi contracts/api.md.
 *
 * Chay:  node mock/fake-backend.js     (cong 4000)
 * Roi:   node tool-server.js           (cong 5000, BACKEND_URL=http://localhost:4000)
 *
 * Hanh vi mo phong:
 *   - Phong "DEMO": 6 ghe, tat ca con song, ghe 9 -> coi nhu da chet (test 409).
 *   - POST /gm/action: tra ok. Rieng CHECK ghe le -> phe DAN, ghe chan -> phe SOI
 *     (de demo seer doc lai ket qua). Target chet/khong ton tai -> 409.
 *   - POST /gm/advance-phase: tra deaths gia.
 */

'use strict';

const express = require('express');

const PORT = 4000;
const GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';

const app = express();
app.use(express.json());

// State gia don gian cho phong DEMO.
const ROOMS = {
  DEMO: {
    roomCode: 'DEMO',
    phase: 'NIGHT',
    cycle: 1,
    players: [
      { seat: 1, status: 'ALIVE' },
      { seat: 2, status: 'ALIVE' },
      { seat: 3, status: 'ALIVE' },
      { seat: 4, status: 'ALIVE' },
      { seat: 5, status: 'ALIVE' },
      { seat: 6, status: 'ALIVE' },
    ],
    deadline: null,
    winner: null,
  },
};

// ─── Middleware: check Bearer GM_SECRET ─────────────────────
function requireGmSecret(req, res, next) {
  const auth = req.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (token !== GM_SECRET) {
    return res.status(401).json({ error: 'GM_SECRET khong hop le' });
  }
  next();
}

function getRoom(roomCode) {
  return ROOMS[roomCode] || ROOMS.DEMO;
}

function isAlive(room, seat) {
  const p = room.players.find((x) => x.seat === seat);
  return !!(p && p.status === 'ALIVE');
}

// ─── POST /gm/action ────────────────────────────────────────
app.post('/gm/action', requireGmSecret, (req, res) => {
  const { roomCode, actorRole, action, targetSeat } = req.body || {};
  const room = getRoom(roomCode);

  // Target khong ton tai / da chet -> 409 (test luong "khong hop le").
  if (!isAlive(room, targetSeat)) {
    return res
      .status(409)
      .json({ error: `Ghe so ${targetSeat} khong con song hoac khong ton tai.` });
  }

  // Mo phong ket qua CHECK cho Tien tri: ghe chan -> SOI, ghe le -> DAN.
  let result = { targetSeat };
  if (action === 'CHECK') {
    result = { targetSeat, team: targetSeat % 2 === 0 ? 'WEREWOLF' : 'VILLAGE' };
  }

  console.log(`[fake-backend] /gm/action room=${roomCode} ${actorRole}/${action} -> ghe ${targetSeat}`);
  return res.json({ ok: true, result });
});

// ─── POST /gm/advance-phase ─────────────────────────────────
app.post('/gm/advance-phase', requireGmSecret, (req, res) => {
  const { roomCode, from } = req.body || {};
  const room = getRoom(roomCode);
  room.cycle += 1;
  room.phase = 'DAY_ANNOUNCE';

  // Deaths gia: ghe 3 chet dem qua (demo).
  const deaths = [{ seat: 3, cause: 'WEREWOLF' }];
  const victim = room.players.find((p) => p.seat === 3);
  if (victim) victim.status = 'DEAD';

  console.log(`[fake-backend] /gm/advance-phase room=${roomCode} from=${from} -> DAY_ANNOUNCE`);
  return res.json({ phase: 'DAY_ANNOUNCE', cycle: room.cycle, deaths });
});

// ─── GET /gm/state ──────────────────────────────────────────
app.get('/gm/state', requireGmSecret, (req, res) => {
  const room = getRoom(req.query.roomCode);
  return res.json(room);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[fake-backend] MOCK backend chay tai http://localhost:${PORT}  (GM_SECRET=${GM_SECRET})`);
  });
}

module.exports = app;
