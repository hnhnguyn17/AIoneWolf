/**
 * backend/game/index.js
 * ─────────────────────────────────────────────────────────────
 * RoomManager: quản lý tập các phòng đang sống (in-memory).
 */

const GameRoom = require('./GameRoom');

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I/O/0/1 cho dễ đọc

class RoomManager {
  constructor() {
    /** @type {Map<string, GameRoom>} */
    this.rooms = new Map();
  }

  generateRoomCode() {
    let code;
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom() {
    const code = this.generateRoomCode();
    const room = new GameRoom(code);
    this.rooms.set(code, room);
    return room;
  }

  /**
   * Tạo phòng in-memory với MỘT mã code cụ thể (vd phòng "kênh thế giới" từ DB
   * chưa có bản in-memory). Nếu code đã tồn tại thì trả phòng hiện có.
   */
  createRoomWithCode(code) {
    const key = (code || '').toUpperCase().trim();
    if (!key) return this.createRoom();
    if (this.rooms.has(key)) return this.rooms.get(key);
    const room = new GameRoom(key);
    this.rooms.set(key, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get((code || '').toUpperCase().trim()) || null;
  }

  removeRoom(code) {
    this.rooms.delete(code);
  }

  /** Tìm phòng chứa socket id (để cleanup khi disconnect). */
  findRoomBySocket(socketId) {
    for (const room of this.rooms.values()) {
      if (room.moderatorId === socketId) return room;
      if (room.players.some((p) => p.id === socketId)) return room;
    }
    return null;
  }
}

// Singleton dùng chung toàn backend
module.exports = new RoomManager();
module.exports.RoomManager = RoomManager;
module.exports.GameRoom = GameRoom;
