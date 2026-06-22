'use strict';

/**
 * backend/src/services/gmService.js
 * CỬA MUTATION DUY NHẤT. Mọi thay đổi state (người click / AI nghe / bot)
 * đều qua đây → mutate GameRoom + emit socket. KHÔNG chứa luật (luật ở GameRoom).
 *
 * Khởi tạo 1 lần với io: const gm = createGmService(io)
 */

const rooms = require('../game');
const db = require('../db/store');
const { PHASE, PLAYER_STATUS } = require('../contracts');

function createGmService(io) {
  const emit = (code, event, payload) => { if (io) io.to(code).emit(event, payload); };
  const emitTo = (id, event, payload) => { if (io) io.to(id).emit(event, payload); };

  // ─── BẮT ĐẦU VÁN ───
  function startGame(room, roleConfig) {
    try {
      room.startGame(roleConfig || null);
    } catch (e) {
      return { ok: false, error: e.message };
    }
    if (roleConfig) room.roleConfig = roleConfig;

    // Role riêng từng người
    room.players.forEach((p) => {
      emitTo(p.id, 'role:assigned', { role: p.role, seat: p.seat });
    });

    // Bảng vai CHỈ cho host (gồm cả bot)
    if (room.moderatorId) {
      emitTo(room.moderatorId, 'host:roleMap', {
        map: room.players.map((p) => ({
          seat: p.seat, name: p.name, role: p.role,
          isBot: String(p.id).startsWith('bot_'),
        })),
      });
    }

    room.beginNight();
    emit(room.roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
    emit(room.roomCode, 'room:state', room.getPublicState());
    return { ok: true };
  }

  // ─── HÀNH ĐỘNG ĐÊM ───
  function applyNightAction(room, action, targetSeat, actorSocketId) {
    const r = room.applyNightAction(action, Number(targetSeat));
    if (!r.ok) return { ok: false, error: r.error };
    // Tiên tri soi → trả riêng cho người soi (nếu biết socket)
    if (r.result && r.result.team !== undefined && actorSocketId) {
      emitTo(actorSocketId, 'seer:result', {
        targetSeat: r.result.targetSeat, team: r.result.team,
      });
    }
    return { ok: true, result: r.result };
  }

  // ─── BỎ PHIẾU ───
  function castVote(room, voterSeat, targetSeat) {
    const r = room.castVote(voterSeat, targetSeat === null ? null : Number(targetSeat));
    if (!r.ok) return { ok: false, error: r.error };
    emit(room.roomCode, 'vote:update', { tally: r.result.tally, voter: voterSeat });
    return { ok: true, result: r.result };
  }

  // ─── KẾT ĐÊM → CÔNG BỐ SÁNG ───
  function resolveNight(room) {
    const out = room.resolveNightAndAnnounce();
    emit(room.roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
    out.deaths.forEach((d) => emit(room.roomCode, 'player:died', { seat: d.seat, cause: d.cause }));
    emit(room.roomCode, 'room:state', room.getPublicState());
    return { ok: true, deaths: out.deaths };
  }

  // ─── CHỐT VOTE → LYNCH → CHECK WIN ───
  function resolveVote(room) {
    const res = room.resolveVoteAndLynch();
    if (res.lynchedSeat !== null) {
      emit(room.roomCode, 'player:died', { seat: res.lynchedSeat, cause: 'LYNCH' });
    }
    const win = room.checkWinAndAdvance();
    emit(room.roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
    emit(room.roomCode, 'room:state', room.getPublicState());
    if (win.over) {
      emit(room.roomCode, 'game:over', { winner: win.winner });
      _recordEloForRoom(room, win.winner);
    }
    return { ok: true, lynchedSeat: res.lynchedSeat, tie: res.tie, over: win.over, winner: win.winner };
  }

  // ─── ADVANCE PHASE (theo pha hiện tại) — dùng cho AI/REST ───
  function advancePhase(room) {
    switch (room.phase) {
      case PHASE.NIGHT:        return resolveNight(room);
      case PHASE.DAY_ANNOUNCE: {
        room.beginDiscuss();
        emit(room.roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        return { ok: true, phase: room.phase };
      }
      case PHASE.DAY_DISCUSS: {
        room.beginVote();
        emit(room.roomCode, 'phase:changed', { phase: room.phase, cycle: room.cycle });
        return { ok: true, phase: room.phase };
      }
      case PHASE.VOTE: return resolveVote(room);
      default:
        return { ok: false, error: `Không thể advance từ pha ${room.phase}.` };
    }
  }

  // ─── QUẢN TRÒ NÓI (FE hiển thị) ───
  function speak(room, text) {
    emit(room.roomCode, 'gm:speak', { text });
    return { ok: true };
  }

  function _recordEloForRoom(room, winner) {
    try {
      const { mintCoreNftOnchain } = require('./solana/mintBadge');
      room.players.forEach((p) => {
        if (!p.wallet) return;
        const won = p.team === winner;
        const result = db.recordResult(p.wallet, {
          role: p.role, team: p.team, won,
          survived: p.status === PLAYER_STATUS.ALIVE,
        });

        // Nếu người chơi đạt mốc NFT, thực hiện đúc (bất đồng bộ)
        if (result && result.nft) {
          console.log(`[Game Over] Người chơi ${p.name} (${p.wallet}) đạt mốc NFT: ${result.nft}. Đang tiến hành mint...`);
          mintCoreNftOnchain(p.wallet, result.nft)
            .then(({ mint, tx }) => {
              console.log(`[Game Over] Tự động mint thành công cho ${p.name}. Mint: ${mint}, Tx: ${tx}`);
            })
            .catch((err) => {
              console.error(`[Game Over] Tự động mint thất bại cho ${p.name}:`, err.message);
            });
        }
      });
    } catch (e) {
      console.error('recordEloForRoom lỗi:', e.message);
    }
  }

  return {
    startGame, applyNightAction, castVote,
    resolveNight, resolveVote, advancePhase, speak,
    getRoom: (code) => rooms.getRoom(code),
  };
}

module.exports = { createGmService };
