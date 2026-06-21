/**
 * backend/game/GameRoom.js
 * ─────────────────────────────────────────────────────────────
 * Class trung tâm: quản lý trạng thái + luật của MỘT phòng Ma Sói.
 * Là "Source of Truth" — mọi thay đổi state đi qua đây.
 */

const {
  ROLE, TEAM, ROLE_TEAM, PHASE, NIGHT_ORDER,
  PLAYER_STATUS, NIGHT_ACTION,
} = require('../contracts');
const { assignRoles } = require('./roles');
const { resolveNight, NEXT_PHASE, isGuardProtectAllowed } = require('./phases');
const { resolveVote } = require('./voting');
const { checkWin } = require('./winCheck');

class GameRoom {
  constructor(roomCode) {
    this.roomCode = roomCode;
    this.phase = PHASE.LOBBY;
    this.cycle = 0;                 // đêm/ngày thứ mấy (tăng khi vào NIGHT)
    this.players = [];              // [{ id, wallet, name, seat, role, team, status }]
    this.moderatorId = null;        // socket id người tạo phòng (host)
    this.winner = null;             // TEAM.* khi kết thúc

    // Buffer hành động đêm hiện tại: { KILL, PROTECT, CHECK, SAVE, POISON } -> seat
    this.nightActions = {};
    // Phiếu vote ban ngày: { voterSeat -> targetSeat|null }
    this.votes = {};

    // Trạng thái kỹ năng đặc biệt
    this.guard = { lastProtectedSeat: null };
    this.witch = { healUsed: false, poisonUsed: false };

    // Kết quả tạm để công bố ban sáng
    this.lastNightDeaths = [];
    this.lastVoteResult = null;
  }

  // ─── Quản lý người chơi ───────────────────────────────────
  addPlayer({ id, wallet, name }) {
    const existing = this.players.find((p) => p.id === id);
    if (existing) return existing;
    const seat = this.players.length + 1;
    const player = {
      id, wallet: wallet || null,
      name: name || `Player_${seat}`,
      seat, role: null, team: null,
      status: PLAYER_STATUS.ALIVE,
    };
    this.players.push(player);
    return player;
  }

  removePlayerById(id) {
    const p = this.players.find((x) => x.id === id);
    if (!p) return null;
    // Đang trong ván -> đánh dấu chết để vòng lặp không kẹt; ở lobby -> xóa hẳn
    if (this.phase === PHASE.LOBBY) {
      this.players = this.players.filter((x) => x.id !== id);
      this.players.forEach((x, i) => { x.seat = i + 1; }); // dồn lại seat
    } else {
      p.status = PLAYER_STATUS.DEAD;
    }
    return p;
  }

  getBySeat(seat) { return this.players.find((p) => p.seat === seat) || null; }
  alivePlayers() { return this.players.filter((p) => p.status === PLAYER_STATUS.ALIVE); }
  aliveSeats() { return this.alivePlayers().map((p) => p.seat); }
  wolves() { return this.players.filter((p) => p.role === ROLE.WEREWOLF); }

  // ─── Bắt đầu ván ──────────────────────────────────────────
  startGame(roleConfig = null) {
    if (this.players.length < 4) {
      throw new Error('Cần tối thiểu 4 người để bắt đầu.');
    }
    assignRoles(this.players, roleConfig);   // gán role + team + giữ seat
    this.phase = PHASE.ASSIGN_ROLES;
    this.cycle = 0;
    this.winner = null;
    this.guard = { lastProtectedSeat: null };
    this.witch = { healUsed: false, poisonUsed: false };
    return this.players;
  }

  /** Mở màn đêm mới: dọn buffer, tăng cycle, sang NIGHT. */
  beginNight() {
    this.nightActions = {};
    this.votes = {};
    this.cycle += 1;
    this.phase = PHASE.NIGHT;
    return this.phase;
  }

  // ─── Hành động ban đêm (do AI Quản trò gọi qua REST, hoặc client) ──
  /**
   * Ghi nhận 1 hành động đêm.
   * @returns {{ ok:boolean, error?:string, result?:object }}
   */
  applyNightAction(action, targetSeat) {
    if (this.phase !== PHASE.NIGHT) {
      return { ok: false, error: 'Không phải ban đêm.' };
    }
    const target = this.getBySeat(targetSeat);
    if (!target || target.status !== PLAYER_STATUS.ALIVE) {
      return { ok: false, error: `Ghế số ${targetSeat} không còn sống.` };
    }

    switch (action) {
      case NIGHT_ACTION.PROTECT:
        if (!isGuardProtectAllowed(this, targetSeat)) {
          return { ok: false, error: 'Bảo vệ không thể chắn cùng một người 2 đêm liên tiếp.' };
        }
        this.nightActions[NIGHT_ACTION.PROTECT] = targetSeat;
        return { ok: true, result: { protectedSeat: targetSeat } };

      case NIGHT_ACTION.KILL:
        this.nightActions[NIGHT_ACTION.KILL] = targetSeat;
        return { ok: true, result: { targetSeat } };

      case NIGHT_ACTION.CHECK: {
        // Tiên tri soi: trả phe của target để AI đọc lại (không gây chết)
        this.nightActions[NIGHT_ACTION.CHECK] = targetSeat;
        return { ok: true, result: { targetSeat, team: target.team } };
      }

      case NIGHT_ACTION.SAVE:
        if (this.witch.healUsed) return { ok: false, error: 'Phù thủy đã dùng bình cứu.' };
        this.nightActions[NIGHT_ACTION.SAVE] = targetSeat;
        return { ok: true, result: { savedSeat: targetSeat } };

      case NIGHT_ACTION.POISON:
        if (this.witch.poisonUsed) return { ok: false, error: 'Phù thủy đã dùng bình độc.' };
        this.nightActions[NIGHT_ACTION.POISON] = targetSeat;
        return { ok: true, result: { poisonedSeat: targetSeat } };

      default:
        return { ok: false, error: `Hành động không hợp lệ: ${action}` };
    }
  }

  /**
   * Kết thúc đêm: tính người chết, áp dụng status, sang DAY_ANNOUNCE.
   * @returns {{ phase:string, cycle:number, deaths:Array }}
   */
  resolveNightAndAnnounce() {
    const { deaths } = resolveNight(this);
    deaths.forEach(({ seat }) => {
      const p = this.getBySeat(seat);
      if (p) p.status = PLAYER_STATUS.DEAD;
    });
    this.lastNightDeaths = deaths;
    this.phase = PHASE.DAY_ANNOUNCE;
    return { phase: this.phase, cycle: this.cycle, deaths };
  }

  // ─── Ban ngày: thảo luận + vote ───────────────────────────
  beginDiscuss() { this.phase = PHASE.DAY_DISCUSS; return this.phase; }
  beginVote() { this.votes = {}; this.phase = PHASE.VOTE; return this.phase; }

  castVote(voterSeat, targetSeat) {
    if (this.phase !== PHASE.VOTE) return { ok: false, error: 'Không phải lúc bỏ phiếu.' };
    const voter = this.getBySeat(voterSeat);
    if (!voter || voter.status !== PLAYER_STATUS.ALIVE) {
      return { ok: false, error: 'Người bỏ phiếu không hợp lệ.' };
    }
    if (targetSeat !== null) {
      const t = this.getBySeat(targetSeat);
      if (!t || t.status !== PLAYER_STATUS.ALIVE) {
        return { ok: false, error: `Không thể bỏ phiếu cho ghế ${targetSeat}.` };
      }
    }
    this.votes[voterSeat] = targetSeat;
    return { ok: true, result: { tally: resolveVote(this.votes).tally } };
  }

  /**
   * Chốt vote: treo cổ người nhiều phiếu nhất (hòa -> không ai chết).
   * @returns {{ lynchedSeat:(number|null), tie:boolean, tally:object }}
   */
  resolveVoteAndLynch() {
    const res = resolveVote(this.votes);
    if (res.lynchedSeat !== null) {
      const p = this.getBySeat(res.lynchedSeat);
      if (p) p.status = PLAYER_STATUS.DEAD;
    }
    this.lastVoteResult = res;
    this.phase = PHASE.CHECK_WIN;
    return res;
  }

  /**
   * Kiểm tra thắng/thua. Nếu chưa xong -> mở đêm mới (trả nextPhase=NIGHT).
   * @returns {{ over:boolean, winner:(string|null), nextPhase:string }}
   */
  checkWinAndAdvance() {
    const { over, winner } = checkWin(this.players);
    if (over) {
      this.winner = winner;
      this.phase = PHASE.GAME_OVER;
      return { over: true, winner, nextPhase: PHASE.GAME_OVER };
    }
    this.beginNight();
    return { over: false, winner: null, nextPhase: PHASE.NIGHT };
  }

  // ─── Snapshot ─────────────────────────────────────────────
  /** State công khai gửi cho FE — ẩn role của người khác. */
  getPublicState() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      cycle: this.cycle,
      winner: this.winner,
      players: this.players.map((p) => ({
        seat: p.seat,
        name: p.name,
        wallet: p.wallet,
        status: p.status,
        // role ẩn; chỉ lộ khi GAME_OVER
        role: this.phase === PHASE.GAME_OVER ? p.role : undefined,
      })),
    };
  }

  /** State cho AI Quản trò: có role để điều phối, nhưng chỉ đọc. */
  getGmState() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      cycle: this.cycle,
      winner: this.winner,
      players: this.players.map((p) => ({
        seat: p.seat, name: p.name, role: p.role, team: p.team, status: p.status,
      })),
      witch: { ...this.witch },
      guard: { ...this.guard },
    };
  }

  getPrivateRole(seat) {
    const p = this.getBySeat(seat);
    return p ? { seat, role: p.role, team: p.team } : null;
  }
}

module.exports = GameRoom;
