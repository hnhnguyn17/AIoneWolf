/**
 * backend/mock/e2e-gm.js
 * ─────────────────────────────────────────────────────────────
 * Test END-TO-END: client socket tạo phòng + start game, rồi giả lập AI Quản trò
 * gọi REST /gm/* (như service ai/) để chạy 1 đêm + 1 vote. Cần backend đang chạy.
 *
 * Chạy:  node mock/e2e-gm.js   (sau khi `npm start` ở terminal khác, hoặc tự spawn)
 */

const { io } = require('socket.io-client');
const http = require('http');

const BASE = process.env.BASE || 'http://localhost:4000';
const GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';

function rest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const req = http.request(u, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GM_SECRET}`,
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: buf ? JSON.parse(buf) : null }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const log = (...a) => console.log(...a);
  log('E2E: kết nối', BASE);

  // 1) Host tạo phòng
  const host = io(BASE, { transports: ['websocket'] });
  let roomCode = null;
  await new Promise((res) => {
    host.on('connect', () => host.emit('room:create'));
    host.on('room:created', (d) => { roomCode = d.roomCode; res(); });
  });
  log('  ✓ Phòng tạo:', roomCode);

  // 2) 5 người chơi join (tổng 6 với việc host cũng là 1 ghế? host là QT, players riêng)
  const names = ['An', 'Binh', 'Cuong', 'Dung', 'Em', 'Phuc'];
  const players = [];
  for (const name of names) {
    const c = io(BASE, { transports: ['websocket'] });
    await new Promise((res) => c.on('connect', () => { c.emit('room:join', { roomCode, name }); res(); }));
    players.push(c);
  }
  await sleep(300);
  log('  ✓', names.length, 'người đã vào');

  // 3) Lấy role từng người (role:assigned)
  const roleBySeat = {};
  players.forEach((c) => c.on('role:assigned', ({ role, seat }) => { roleBySeat[seat] = role; }));

  // 4) Host start game
  host.emit('game:start', {});
  await sleep(400);
  log('  ✓ Bắt đầu. Role theo ghế:', JSON.stringify(roleBySeat));

  // 5) AI lấy state để biết ai là gì
  const st = await rest('GET', `/gm/state?roomCode=${roomCode}`);
  const alive = st.body.players;
  const wolf = alive.find((p) => p.role === 'WEREWOLF');
  const seer = alive.find((p) => p.role === 'SEER');
  const guard = alive.find((p) => p.role === 'GUARD');
  const villager = alive.find((p) => p.role === 'VILLAGER');
  log('  ✓ GM state: Sói ghế', wolf.seat, '| Tiên tri', seer.seat, '| Bảo vệ', guard?.seat);

  // 6) AI gọi hành động đêm (như bóc từ giọng nói)
  let r;
  if (guard) { r = await rest('POST', '/gm/action', { roomCode, action: 'PROTECT', targetSeat: villager.seat });
    log('  🛡️ PROTECT', villager.seat, '->', r.status); }
  r = await rest('POST', '/gm/action', { roomCode, action: 'KILL', targetSeat: villager.seat });
  log('  🐺 KILL', villager.seat, '->', r.status, JSON.stringify(r.body));
  r = await rest('POST', '/gm/action', { roomCode, action: 'CHECK', targetSeat: wolf.seat });
  log('  🔮 CHECK', wolf.seat, '-> phe', r.body.result && r.body.result.team);

  // Test 409: soi ghế không tồn tại
  r = await rest('POST', '/gm/action', { roomCode, action: 'CHECK', targetSeat: 99 });
  log('  ⚠️ CHECK ghế 99 (mong đợi 409):', r.status, r.body.error);

  // 7) Kết đêm -> công bố
  r = await rest('POST', '/gm/advance-phase', { roomCode });
  log('  ☀️ advance NIGHT->', r.body.phase, '| chết:', JSON.stringify(r.body.deaths));

  // discuss -> vote
  await rest('POST', '/gm/advance-phase', { roomCode }); // DAY_ANNOUNCE -> DISCUSS
  r = await rest('POST', '/gm/advance-phase', { roomCode }); // DISCUSS -> VOTE
  log('  🗳️ sang', r.body.phase);

  // 8) Mọi người vote treo Sói qua socket
  const seatByClient = new Map();
  // map client -> seat bằng cách nghe role:assigned đã có roleBySeat; cần seat của từng client
  // join theo thứ tự nên seat = index+1
  players.forEach((c, i) => seatByClient.set(c, i + 1));
  players.forEach((c) => {
    const seat = seatByClient.get(c);
    const me = alive.find((p) => p.seat === seat);
    if (me && me.status === 'ALIVE') c.emit('vote:cast', { targetSeat: wolf.seat });
  });
  await sleep(400);

  // 9) Chốt vote + check win
  r = await rest('POST', '/gm/advance-phase', { roomCode });
  log('  ⚖️ chốt vote: treo ghế', r.body.lynchedSeat, '| over:', r.body.over, '| winner:', r.body.winner);

  log('\n✅ E2E xong — AI Quản trò điều khiển backend qua REST thành công.');
  host.close(); players.forEach((c) => c.close());
  process.exit(0);
}

main().catch((e) => { console.error('E2E lỗi:', e.message); process.exit(1); });
