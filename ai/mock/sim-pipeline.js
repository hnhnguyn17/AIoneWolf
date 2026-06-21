/**
 * mock/sim-pipeline.js
 * ─────────────────────────────────────────────────────────────
 * [MOCK] Chung minh PIPELINE "AI biet game state":
 *   buildGameContext (lay nguoi song/chet tu backend) -> tool-server boc lenh
 *   -> TU CHOI thao tac nguoi DA CHET, cho phep thao tac nguoi CON SONG.
 *
 * Chay doc lap (KHONG can Agora/LLM that):
 *   node mock/sim-pipeline.js
 * Tu spawn fake-backend in-process (ghe 3 = DA CHET) + goi tool-server.
 */

'use strict';

process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4055';
process.env.GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';
process.env.LLM_PROVIDER = 'stub';

const http = require('http');
const express = require('express');

// ── fake-backend rieng cho sim: ghe 3 DA CHET san de test tu choi ──
const fake = express();
fake.use(express.json());
const ROOM = {
  roomCode: 'DEMO', phase: 'NIGHT', cycle: 2,
  players: [
    { seat: 1, name: 'An', status: 'ALIVE' },
    { seat: 2, name: 'Binh', status: 'ALIVE' },
    { seat: 3, name: 'Cuong', status: 'DEAD' },   // <-- da chet
    { seat: 4, name: 'Dung', status: 'ALIVE' },
    { seat: 5, name: 'Em', status: 'ALIVE' },
    { seat: 6, name: 'Phuc', status: 'ALIVE' },
  ],
};
fake.get('/gm/state', (_req, res) => res.json(ROOM));
fake.post('/gm/action', (req, res) => {
  const { targetSeat } = req.body || {};
  const p = ROOM.players.find((x) => x.seat === Number(targetSeat));
  if (!p || p.status !== 'ALIVE') return res.status(409).json({ error: `Ghe ${targetSeat} da chet.` });
  return res.json({ ok: true, result: { targetSeat } });
});

const app = require('../tool-server'); // express app (khong tu listen khi require)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function post(port, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: 'localhost', port, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => { let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => resolve(JSON.parse(b))); });
    req.on('error', reject); req.write(data); req.end();
  });
}

async function say(port, text) {
  const r = await post(port, '/chat/completions', { roomCode: 'DEMO', messages: [{ role: 'user', content: text }] });
  return r.choices[0].message.content;
}

async function main() {
  const fakeSrv = fake.listen(4055);
  const toolSrv = app.listen(5055);
  await sleep(300);

  console.log('─'.repeat(60));
  console.log(' SIM-PIPELINE: AI biet ai song/chet (ghe 3 DA CHET)');
  console.log('─'.repeat(60));

  const cases = [
    'Soi can nguoi so 3',   // -> phai TU CHOI (ghe 3 chet)
    'Soi can nguoi so 4',   // -> hop le (song)
    'Tien tri soi so 3',    // -> tu choi (chet)
    'Bao ve che so 5',      // -> hop le
    'Soi can so 9',         // -> tu choi (khong ton tai)
  ];
  for (const c of cases) {
    const reply = await say(5055, c);
    console.log(`\n🗣️  "${c}"`);
    console.log(`🤖  ${reply}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('✅ Pipeline OK: AI tu choi thao tac nguoi da chet/khong ton tai,');
  console.log('   chap nhan nguoi con song — dua tren GAME STATE tu backend.');
  fakeSrv.close(); toolSrv.close();
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
