/**
 * domain/RoomManager.ts — singleton quản lý các GameRoom đang sống (in-memory).
 * Sinh mã phòng, tạo/tìm/xóa phòng. KHÔNG đụng DB (tầng service lo persist).
 */
import { GameRoom, type RoomHooks } from './GameRoom.js';
import { ROOM_CODE_LENGTH } from '../config/constants.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm (0/O, 1/I)

export class RoomManager {
  private rooms = new Map<string, GameRoom>();

  private genCode(): string {
    let code: string;
    do {
      code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)],
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  create(hostId: string, opts: { maxPlayers?: number; hooks?: RoomHooks } = {}): GameRoom {
    const code = this.genCode();
    const room = new GameRoom(code, hostId, opts);
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): GameRoom | undefined {
    return this.rooms.get(code);
  }

  /** Phòng mà 1 socket id đang ở trong (1 người 1 phòng). */
  findByPlayer(id: string): GameRoom | undefined {
    for (const room of this.rooms.values()) if (room.getById(id)) return room;
    return undefined;
  }

  remove(code: string): void {
    this.rooms.delete(code);
  }

  all(): GameRoom[] {
    return [...this.rooms.values()];
  }
}

/** Singleton dùng chung toàn app. */
export const roomManager = new RoomManager();
