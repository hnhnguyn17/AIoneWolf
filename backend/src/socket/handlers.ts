/**
 * socket/handlers.ts — controller realtime. Nối 8 sự kiện C2S → gameService.
 * Mỗi handler validate tối thiểu rồi gọi service; service lo emit S2C.
 */
import type { Server, Socket } from 'socket.io';
import { C2S, S2C } from '../contracts/index.js';
import { roomManager } from '../domain/RoomManager.js';
import { ROOM_STATUS } from '../domain/GameRoom.js';
import { MIN_PLAYERS } from '../config/constants.js';
import type { GameService } from '../services/gameService.js';
import { verifyAccess } from '../services/solana/walletAuth.js';
import * as attendanceRepo from '../data/repositories/attendanceRepo.js';

/** Lấy wallet từ token handshake (nếu có). */
function walletOf(socket: Socket): string | null {
  const token = (socket.handshake.auth as any)?.token;
  return token ? verifyAccess(token) : null;
}

export function registerHandlers(io: Server, game: GameService): void {
  io.on('connection', (socket: Socket) => {
    const wallet = walletOf(socket);
    const name = wallet ? `Người chơi ${wallet.slice(0, 4)}` : `Khách ${socket.id.slice(0, 4)}`;

    // ─── Tạo phòng ───────────────────────────────────────────
    socket.on(C2S.ROOM_CREATE, (_payload, ack?: (r: any) => void) => {
      const room = roomManager.create(socket.id, {
        hooks: {
          onSeerResult: (seerSeat, targetSeat, team) => {
            const seer = room.getBySeat(seerSeat);
            if (seer) io.to(seer.id).emit(S2C.SEER_RESULT, { targetSeat, team });
          },
        },
      });
      room.addPlayer({ id: socket.id, name, wallet });
      socket.join(room.roomCode);
      attendanceRepo.join({ roomCode: room.roomCode, wallet, name, seat: 1 });
      socket.emit(S2C.ROOM_CREATED, { roomCode: room.roomCode });
      game.emitRoomState(room);
      ack?.({ roomCode: room.roomCode });
    });

    // ─── Vào phòng ───────────────────────────────────────────
    socket.on(C2S.ROOM_JOIN, (payload: { roomCode: string; name?: string }) => {
      const room = roomManager.get(String(payload?.roomCode || '').toUpperCase());
      if (!room) return socket.emit(S2C.ERROR, { error: 'Phòng không tồn tại.' });
      const r = room.addPlayer({ id: socket.id, name: payload.name || name, wallet });
      if (!r.ok) return socket.emit(S2C.ERROR, { error: r.error! });
      socket.join(room.roomCode);
      attendanceRepo.join({ roomCode: room.roomCode, wallet, name, seat: r.player!.seat });
      game.emitRoomState(room);
    });

    // ─── Rời phòng ───────────────────────────────────────────
    socket.on(C2S.ROOM_LEAVE, () => leaveRoom());

    // ─── Bắt đầu ván ─────────────────────────────────────────
    socket.on(C2S.GAME_START, (payload: { roleConfig?: string[]; withBots?: boolean }) => {
      const room = roomManager.findByPlayer(socket.id);
      if (!room) return socket.emit(S2C.ERROR, { error: 'Bạn không ở trong phòng.' });
      if (room.hostId !== socket.id) return socket.emit(S2C.ERROR, { error: 'Chỉ chủ phòng được bắt đầu.' });
      if (room.status !== ROOM_STATUS.WAITING) return socket.emit(S2C.ERROR, { error: 'Ván đã bắt đầu.' });

      if (payload?.withBots) game.fillBots(room);
      if (!game.canStart(room)) {
        return socket.emit('room:needBots', {
          have: room.players.length,
          need: MIN_PLAYERS,
          missing: MIN_PLAYERS - room.players.length,
          message: `Cần tối thiểu ${MIN_PLAYERS} người. Thêm bot để bắt đầu?`,
        });
      }
      const r = game.startGame(room, payload?.roleConfig ?? null);
      if (!r.ok) socket.emit(S2C.ERROR, { error: r.error! });
    });

    // ─── Hành động đêm ───────────────────────────────────────
    socket.on(C2S.NIGHT_ACTION, (payload: { action: any; targetSeat: number }) => {
      const room = roomManager.findByPlayer(socket.id);
      if (!room) return;
      const r = game.nightAction(room, socket.id, payload.action, Number(payload.targetSeat));
      if (!r.ok) socket.emit(S2C.ERROR, { error: r.error! });
    });

    // ─── Bỏ phiếu ────────────────────────────────────────────
    socket.on(C2S.VOTE_CAST, (payload: { targetSeat: number | null }) => {
      const room = roomManager.findByPlayer(socket.id);
      if (!room) return;
      const voter = room.getById(socket.id);
      if (!voter) return;
      const target = payload.targetSeat === null ? null : Number(payload.targetSeat);
      const r = game.castVote(room, voter.seat, target);
      if (!r.ok) socket.emit(S2C.ERROR, { error: r.error! });
    });

    // ─── Chat ────────────────────────────────────────────────
    socket.on(C2S.CHAT_SEND, (payload: { text: string }) => {
      const room = roomManager.findByPlayer(socket.id);
      if (!room) return;
      const p = room.getById(socket.id);
      if (!p) return;
      const text = String(payload?.text || '').slice(0, 300);
      if (!text) return;
      io.to(room.roomCode).emit(S2C.CHAT_MSG, { from: p.name, seat: p.seat, text, ts: Date.now() });
    });

    socket.on('disconnect', () => leaveRoom());

    function leaveRoom(): void {
      const room = roomManager.findByPlayer(socket.id);
      if (!room) return;
      const p = room.getById(socket.id);
      if (p) attendanceRepo.leave(room.roomCode, p.seat);
      room.removePlayer(socket.id);
      socket.leave(room.roomCode);
      if (room.players.length === 0) roomManager.remove(room.roomCode);
      else game.emitRoomState(room);
    }
  });
}
