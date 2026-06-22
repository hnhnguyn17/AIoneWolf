/**
 * services/gameService.ts
 * ─────────────────────────────────────────────────────────────
 * ORCHESTRATION: nối domain (GameRoom) với socket + DB + AI.
 * Room cầm trịch LUẬT; service này lo SIDE-EFFECT: emit socket, đặt timer
 * auto-advance theo pha, persist DB, gọi GM/bot narrate.
 *
 * Đây là tầng DUY NHẤT biết cả `io` (socket) lẫn domain. Domain không biết socket.
 */
import type { Server } from 'socket.io';
import {
  S2C,
  PHASE,
  type Team,
} from '../contracts/index.js';
import { PHASE_DURATION, MIN_PLAYERS, BOT_ID_PREFIX } from '../config/constants.js';
import { GameRoom, ROOM_STATUS } from '../domain/GameRoom.js';
import { roomManager } from '../domain/RoomManager.js';
import { computeEloDelta } from '../domain/elo.js';
import * as userRepo from '../data/repositories/userRepo.js';
import * as matchRepo from '../data/repositories/matchRepo.js';
import * as attendanceRepo from '../data/repositories/attendanceRepo.js';
import * as roomRepo from '../data/repositories/roomRepo.js';
import type { GmService } from './ai/gmService.js';
import type { BotService } from './ai/botService.js';

export class GameService {
  private timers = new Map<string, NodeJS.Timeout>();
  private gm: GmService | null = null;
  private bot: BotService | null = null;

  constructor(private io: Server) {}

  /** Tiêm AI (sau khi khởi tạo, vì AI cần gameService). */
  attachAI(gm: GmService, bot: BotService): void {
    this.gm = gm;
    this.bot = bot;
  }

  // ─── Helpers emit ──────────────────────────────────────────
  private emitRoom(room: GameRoom): void {
    this.io.to(room.roomCode).emit(S2C.ROOM_STATE, room.toPublicState());
  }
  private emitPhase(room: GameRoom): void {
    const dur = PHASE_DURATION[room.phase as keyof typeof PHASE_DURATION] ?? null;
    room.deadline = dur ? Date.now() + dur : null;
    this.io.to(room.roomCode).emit(S2C.PHASE_CHANGED, {
      phase: room.phase,
      cycle: room.cycle,
      deadline: room.deadline,
    });
    this.bot?.onPhase(room);
    if (dur) this.armTimer(room, dur);
  }

  private armTimer(room: GameRoom, dur: number): void {
    this.clearTimer(room.roomCode);
    const t = setTimeout(() => {
      this.timers.delete(room.roomCode);
      try {
        const cur = roomManager.get(room.roomCode);
        if (cur && cur.status === ROOM_STATUS.IN_GAME) this.advance(cur);
      } catch (e) {
        console.error('[game] auto-advance lỗi:', (e as Error).message);
      }
    }, dur);
    this.timers.set(room.roomCode, t);
  }
  private clearTimer(code: string): void {
    const t = this.timers.get(code);
    if (t) {
      clearTimeout(t);
      this.timers.delete(code);
    }
  }

  // ─── Bắt đầu ván ───────────────────────────────────────────
  startGame(room: GameRoom, roleConfig?: string[] | null): { ok: boolean; error?: string } {
    const r = room.startGame(roleConfig as any);
    if (!r.ok) return r;

    // Gửi vai riêng cho từng người.
    for (const p of room.players) {
      this.io.to(p.id).emit(S2C.ROLE_ASSIGNED, { role: p.role!, seat: p.seat });
      if (p.role) attendanceRepo.setRole(room.roomCode, p.seat, p.role);
    }
    // Bảng vai cho host (gồm bot).
    this.io.to(room.hostId).emit(S2C.HOST_ROLE_MAP, {
      map: room.players.map((p) => ({ seat: p.seat, name: p.name, role: p.role!, isBot: p.isBot() })),
    });

    roomRepo.save(this.roomRow(room));
    this.gm?.onGameStart(room);
    this.emitPhase(room); // đang ở NIGHT (ASSIGN → NIGHT)
    this.emitRoom(room);
    return { ok: true };
  }

  // ─── Hành động đêm ─────────────────────────────────────────
  nightAction(room: GameRoom, actorId: string, action: any, targetSeat: number): { ok: boolean; error?: string } {
    return room.applyNightAction(actorId, action, targetSeat, room.roundId);
  }

  // ─── Bỏ phiếu ──────────────────────────────────────────────
  castVote(room: GameRoom, voterSeat: number, targetSeat: number | null): { ok: boolean; error?: string } {
    const r = room.castVote(voterSeat, targetSeat, room.roundId);
    if (r.ok && r.tally) this.io.to(room.roomCode).emit(S2C.VOTE_UPDATE, { tally: r.tally, voter: voterSeat });
    return r;
  }

  // ─── Đẩy pha theo state machine ────────────────────────────
  advance(room: GameRoom): void {
    switch (room.phase) {
      case PHASE.NIGHT:
        return this.resolveNight(room);
      case PHASE.DAY_ANNOUNCE:
        room.beginDiscuss();
        this.emitPhase(room);
        return;
      case PHASE.DAY_DISCUSS:
        room.beginVote();
        this.emitPhase(room);
        return;
      case PHASE.VOTE:
        return this.resolveVote(room);
      default:
        return;
    }
  }

  private resolveNight(room: GameRoom): void {
    const { deaths } = room.resolveNight();
    this.emitPhase(room); // DAY_ANNOUNCE
    for (const d of deaths) this.io.to(room.roomCode).emit(S2C.PLAYER_DIED, d);
    this.emitRoom(room);
    this.gm?.onNightResolved(room, deaths);

    if (this.checkEnd(room)) return;
  }

  private resolveVote(room: GameRoom): void {
    const { lynchedSeat, deaths } = room.resolveVote();
    for (const d of deaths) this.io.to(room.roomCode).emit(S2C.PLAYER_DIED, d);
    this.emitRoom(room);
    this.gm?.onVoteResolved(room, lynchedSeat);

    if (this.checkEnd(room)) return;
    room.beginNight();
    this.gm?.onNightFall(room);
    this.emitPhase(room);
  }

  /** Kiểm tra kết thúc; nếu hết → tổng kết ELO + emit game:over. */
  private checkEnd(room: GameRoom): boolean {
    const win = room.checkWin();
    if (!win.over) return false;
    this.clearTimer(room.roomCode);
    this.io.to(room.roomCode).emit(S2C.GAME_OVER, { winner: win.winner! });
    this.gm?.onGameOver(room, win.winner!);
    this.settle(room, win.winner!);
    roomRepo.end(room.roomCode);
    return true;
  }

  /** Tổng kết: cộng ELO + ghi matches cho người chơi thật. */
  private settle(room: GameRoom, winner: Team): void {
    for (const p of room.players) {
      if (!p.wallet || !p.role || !p.team) continue;
      const won = p.team === winner;
      const delta = computeEloDelta({ role: p.role, team: p.team, won, survived: p.isAlive() });
      const u = userRepo.applyMatchResult(p.wallet, { won, delta });
      matchRepo.recordMatch({
        wallet: p.wallet,
        roomCode: room.roomCode,
        role: p.role,
        team: p.team,
        won,
        delta,
        eloAfter: u?.elo ?? 0,
      });
      attendanceRepo.leave(room.roomCode, p.seat);
    }
  }

  /** Đủ người tối thiểu để bắt đầu? */
  canStart(room: GameRoom): boolean {
    return room.players.length >= MIN_PLAYERS;
  }

  /** Fill bot cho đủ MIN_PLAYERS (hoặc tới số mong muốn). */
  fillBots(room: GameRoom, target?: number): void {
    const want = Math.max(MIN_PLAYERS, target ?? room.players.length);
    let i = 1;
    while (room.players.length < want && !room.isFull()) {
      const id = `${BOT_ID_PREFIX}${i}`;
      if (!room.getById(id)) room.addPlayer({ id, name: `Bot ${i}` });
      i++;
    }
  }

  private roomRow(room: GameRoom) {
    const host = room.getById(room.hostId);
    return {
      code: room.roomCode,
      hostWallet: host?.wallet ?? null,
      status: room.status,
      phase: room.phase,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
    };
  }

  emitRoomState(room: GameRoom): void {
    this.emitRoom(room);
  }
}
