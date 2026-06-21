/**
 * backend/mock/sim-game.js
 * ─────────────────────────────────────────────────────────────
 * Giả lập TRỌN 1 ván Ma Sói chỉ bằng game logic (không cần express/socket).
 * Mục đích: CHỨNG MINH state machine chạy đúng luật. Chạy: `node mock/sim-game.js`
 *
 * Kịch bản: 6 người. AI Quản trò được giả lập bằng cách gọi thẳng các method
 * của GameRoom (giống cách routes/gm.js gọi).
 */

const GameRoom = require('../src/game/GameRoom');
const { ROLE, TEAM, PHASE, PLAYER_STATUS, NIGHT_ACTION } = require('../src/contracts');

function log(...a) { console.log(...a); }
function line() { log('─'.repeat(56)); }

function show(room) {
  const s = room.alivePlayers().map((p) => `#${p.seat}${p.name}(${p.role})`).join('  ');
  log(`   Sống: ${s}`);
}

function run() {
  const room = new GameRoom('SIM1');
  ['An', 'Bình', 'Cường', 'Dũng', 'Em', 'Phúc'].forEach((name, i) =>
    room.addPlayer({ id: `s${i}`, wallet: `wallet${i}`, name }));

  line(); log('🎬 BẮT ĐẦU VÁN — 6 người'); line();
  room.startGame(); // dùng preset 6: 2 Sói, Tiên tri, Bảo vệ, 2 Dân
  room.players.forEach((p) => log(`   Ghế ${p.seat} ${p.name.padEnd(6)} -> ${p.role} (${p.team})`));

  // Helper tìm seat theo role (chỉ để sim biết ai làm gì)
  const seatOf = (role) => room.players.find((p) => p.role === role && p.status === PLAYER_STATUS.ALIVE);
  const someVillagerSeat = (exclude = []) =>
    room.alivePlayers().find((p) => p.team === TEAM.VILLAGE && !exclude.includes(p.seat));

  let guard = 8;
  room.beginNight(); // mở đêm đầu tiên (các đêm sau do checkWinAndAdvance mở)
  while (room.phase !== PHASE.GAME_OVER && room.cycle < 8) {
    line(); log(`🌙 ĐÊM ${room.cycle}`);

    // Bảo vệ chắn 1 dân ngẫu nhiên (tránh chắn lại cùng người)
    const guardP = seatOf(ROLE.GUARD);
    if (guardP) {
      const t = someVillagerSeat([room.guard.lastProtectedSeat]);
      if (t) { const r = room.applyNightAction(NIGHT_ACTION.PROTECT, t.seat);
        log(`   🛡️  Bảo vệ chắn #${t.seat} ${t.name} ${r.ok ? '' : '('+r.error+')'}`); }
    }

    // Sói cắn 1 người phe Dân
    const victim = someVillagerSeat([guardP ? room.nightActions[NIGHT_ACTION.PROTECT] : null].filter(Boolean));
    if (victim) { room.applyNightAction(NIGHT_ACTION.KILL, victim.seat);
      log(`   🐺 Sói cắn #${victim.seat} ${victim.name}`); }

    // Tiên tri soi 1 người (đọc kết quả)
    const seerP = seatOf(ROLE.SEER);
    if (seerP) {
      const t = room.wolves().find((w) => w.status === PLAYER_STATUS.ALIVE);
      if (t) { const r = room.applyNightAction(NIGHT_ACTION.CHECK, t.seat);
        log(`   🔮 Tiên tri soi #${t.seat} -> phe ${r.result.team}`); }
    }

    // ── SÁNG: công bố ──
    const ann = room.resolveNightAndAnnounce();
    if (ann.deaths.length === 0) log('   ☀️  Sáng ra: KHÔNG ai chết.');
    else ann.deaths.forEach((d) => {
      const p = room.getBySeat(d.seat);
      log(`   💀 Sáng ra: #${d.seat} ${p.name} đã chết (${d.cause}).`);
    });
    show(room);

    // Check win sau đêm (Sói có thể đã áp đảo)
    let win = room.checkWin ? null : null;

    // ── THẢO LUẬN + VOTE ──
    room.beginDiscuss();
    room.beginVote();
    log(`☀️  NGÀY ${room.cycle}: bỏ phiếu treo cổ`);
    // Mọi người sống vote: dân nhắm vào 1 Sói còn sống; sói vote 1 dân
    const aliveWolf = room.wolves().find((w) => w.status === PLAYER_STATUS.ALIVE);
    room.alivePlayers().forEach((voter) => {
      let target;
      if (voter.team === TEAM.VILLAGE && aliveWolf) target = aliveWolf.seat;
      else target = someVillagerSeat([voter.seat])?.seat ?? null;
      room.castVote(voter.seat, target);
    });
    const vr = room.resolveVoteAndLynch();
    if (vr.lynchedSeat === null) log(`   ⚖️  Vote hòa/không ai bị treo.`);
    else { const p = room.getBySeat(vr.lynchedSeat);
      log(`   🪢 Treo cổ #${vr.lynchedSeat} ${p.name} (${p.role}).`); }

    // ── CHECK WIN ──
    const adv = room.checkWinAndAdvance();
    if (adv.over) {
      line();
      const txt = adv.winner === TEAM.WEREWOLF ? '🐺 PHE SÓI THẮNG' : '🧑‍🌾 PHE DÂN THẮNG';
      log(`🏁 KẾT THÚC — ${txt}  (sau ${room.cycle} đêm)`);
      line();
      break;
    }
    if (--guard < 0) break;
  }

  if (room.phase !== PHASE.GAME_OVER) log('⚠️  Sim dừng (quá số vòng) — kiểm tra luật.');
  log('\n✅ Sim chạy xong. Pha cuối:', room.phase, '| Winner:', room.winner);
}

run();
