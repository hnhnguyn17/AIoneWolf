/**
 * backend/socket/handlers.js
 * ─────────────────────────────────────────────────────────────
 * Đăng ký các Socket.io event giữa FE và BE. Tên event lấy từ contracts/events.js.
 */

const rooms = require('../game');
const db = require('../db/store');
const { C2S, S2C, PHASE, ROLE } = require('../contracts');

// Tên bot giả (player AI lấp chỗ trống cho khớp playerCount mà DB quảng cáo).
const BOT_NAMES = ['Vex', 'Rune', 'Onyx', 'Spectre', 'Cinder', 'Drift', 'Hex', 'Pulse', 'Lurk', 'Vandal'];
const MAX_PLAYERS = 12;

/**
 * Lấp bot vào phòng cho tới khi đủ `target` người (tối đa 12).
 * Bot là player giả: id 'bot_<n>', wallet null, name lấy trong BOT_NAMES.
 */
function fillBots(room, target) {
  const cap = Math.min(target, MAX_PLAYERS);
  let n = 1;
  while (room.players.length < cap) {
    const id = `bot_${n}`;
    // Tránh trùng id nếu gọi nhiều lần
    if (room.players.some((p) => p.id === id)) { n += 1; continue; }
    const name = BOT_NAMES[(room.players.length) % BOT_NAMES.length];
    room.addPlayer({ id, name });
    n += 1;
  }
  return room.players.length;
}

/** Đồng bộ trạng thái 1 phòng (in-memory) xuống DB — gọi mỗi khi phòng đổi. */
function syncRoomToDb(room, status) {
  try {
    const host = room.players.find((p) => p.id === room.moderatorId);
    db.saveRoom({
      code: room.roomCode,
      hostWallet: host ? host.wallet : null,
      status: status || (room.phase === PHASE.LOBBY ? 'WAITING' : room.phase === PHASE.GAME_OVER ? 'ENDED' : 'PLAYING'),
      phase: room.phase,
      playerCount: room.players.length,
      maxPlayers: 12,
      roles: room.roleConfig || null,
    });
  } catch (e) {
    console.error('syncRoomToDb lỗi:', e.message);
  }
}

function registerHandlers(io, gm) {
  io.on('connection', (socket) => {
    console.log('🔌 connected:', socket.id, socket.wallet ? `(ví ${socket.wallet.slice(0, 6)}…)` : '(guest)');

    // ── Tạo phòng (host/Quản trò) ──
    socket.on(C2S.ROOM_CREATE, ({ name } = {}) => {
      const room = rooms.createRoom();
      room.moderatorId = socket.id;
      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;
      // Host cũng là 1 người chơi (mặc định vào list) — feedback người dùng.
      const player = room.addPlayer({ id: socket.id, wallet: socket.wallet, name });
      socket.data.seat = player.seat;
      // DB: lưu phòng + attendance (1 người 1 phòng)
      db.joinAttendance({ roomCode: room.roomCode, wallet: socket.wallet, name: player.name, seat: player.seat });
      syncRoomToDb(room, 'WAITING');
      socket.emit(S2C.ROOM_STATE, room.getPublicState());
      socket.emit('room:created', { roomCode: room.roomCode });
    });

    // ── Vào phòng ──
    socket.on(C2S.ROOM_JOIN, ({ roomCode, name } = {}) => {
      const code = (roomCode || '').toUpperCase().trim();
      let room = rooms.getRoom(code);

      // Phòng "kênh thế giới" chỉ tồn tại trong DB (seed-fake) → dựng in-memory.
      if (!room) {
        const dbRow = db.getRoomRow(code);
        if (!dbRow) return socket.emit(S2C.ERROR, `Phòng "${roomCode}" không tồn tại.`);

        // Chặn join nếu phòng đang chơi hoặc đã đầy.
        if (dbRow.status === 'PLAYING') {
          return socket.emit(S2C.ERROR, 'Phòng đang chơi, không thể vào.');
        }
        if (dbRow.status === 'ENDED') {
          return socket.emit(S2C.ERROR, 'Phòng đã kết thúc.');
        }
        const maxP = Math.min(dbRow.maxPlayers || MAX_PLAYERS, MAX_PLAYERS);
        if ((dbRow.playerCount || 0) >= maxP) {
          return socket.emit(S2C.ERROR, 'Phòng đã đầy.');
        }

        // Dựng phòng in-memory đúng mã, fill bot tới (playerCount - 1) để chừa
        // 1 chỗ cho user thật sắp vào.
        room = rooms.createRoomWithCode(code);
        if (!room.moderatorId) room.moderatorId = 'bot_1'; // host ảo cho phòng fake
        const botTarget = Math.max(0, Math.min((dbRow.playerCount || 1) - 1, maxP - 1));
        fillBots(room, botTarget);
      }

      // Chặn join nếu phòng in-memory đang chơi hoặc đã đầy.
      if (room.phase && room.phase !== PHASE.LOBBY) {
        return socket.emit(S2C.ERROR, 'Phòng đang chơi, không thể vào.');
      }
      if (room.players.length >= MAX_PLAYERS) {
        return socket.emit(S2C.ERROR, 'Phòng đã đầy.');
      }

      // Ràng buộc 1 người chỉ 1 phòng đồng thời (theo ví).
      if (socket.wallet) {
        const cur = db.activeRoomOf(socket.wallet);
        if (cur && cur !== room.roomCode) {
          return socket.emit(S2C.ERROR, `Bạn đang ở phòng ${cur}. Rời phòng đó trước khi vào phòng mới.`);
        }
      }

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;
      const player = room.addPlayer({ id: socket.id, wallet: socket.wallet, name });
      socket.data.seat = player.seat;
      db.joinAttendance({ roomCode: room.roomCode, wallet: socket.wallet, name: player.name, seat: player.seat });
      syncRoomToDb(room);
      io.to(room.roomCode).emit(S2C.ROOM_STATE, room.getPublicState());
    });

    // ── Rời phòng ──
    socket.on(C2S.ROOM_LEAVE, () => cleanup(socket));

    // ── Bắt đầu ván (chỉ host) ──
    socket.on(C2S.GAME_START, ({ roleConfig } = {}) => {
      const room = rooms.getRoom(socket.data.roomCode);
      if (!room) return;
      if (socket.id !== room.moderatorId) {
        return socket.emit(S2C.ERROR, 'Chỉ Quản trò mới bắt đầu được.');
      }
      const r = gm ? gm.startGame(room, roleConfig || null) : (() => {
        // Fallback nếu không có gm (không nên xảy ra)
        try { room.startGame(roleConfig || null); return { ok: true }; }
        catch (e) { return { ok: false, error: e.message }; }
      })();
      if (!r.ok) return socket.emit(S2C.ERROR, r.error);
      syncRoomToDb(room, 'PLAYING');
    });

    // ── Hành động đêm từ client (Sói/Tiên tri/Bảo vệ/Phù thủy bấm UI) ──
    socket.on(C2S.NIGHT_ACTION, ({ action, targetSeat } = {}) => {
      const room = rooms.getRoom(socket.data.roomCode);
      if (!room) return;
      const r = gm
        ? gm.applyNightAction(room, action, targetSeat, socket.id)
        : room.applyNightAction(action, Number(targetSeat));
      if (!r.ok) return socket.emit(S2C.ERROR, r.error);
    });

    // ── Bỏ phiếu treo cổ ──
    socket.on(C2S.VOTE_CAST, ({ targetSeat } = {}) => {
      const room = rooms.getRoom(socket.data.roomCode);
      if (!room) return;
      const seat = socket.data.seat;
      const r = gm
        ? gm.castVote(room, seat, targetSeat === null ? null : Number(targetSeat))
        : room.castVote(seat, targetSeat === null ? null : Number(targetSeat));
      if (!r.ok) return socket.emit(S2C.ERROR, r.error);
      if (!gm) io.to(room.roomCode).emit(S2C.VOTE_UPDATE, { tally: r.result?.tally, voter: seat });
    });

    // ── Chat (chỉ pha cho phép — ban đêm thường bị khóa với dân) ──
    socket.on(C2S.CHAT_SEND, ({ text } = {}) => {
      const room = rooms.getRoom(socket.data.roomCode);
      if (!room || !text) return;
      if (room.phase === PHASE.NIGHT) {
        return socket.emit(S2C.ERROR, 'Ban đêm không được chat công khai.');
      }
      const p = room.getBySeat(socket.data.seat);
      io.to(room.roomCode).emit(S2C.CHAT_MSG, {
        from: p ? p.name : 'Ẩn danh',
        seat: socket.data.seat,
        text,
        ts: Date.now(),
      });
    });

    // ── Dev Tools (chỉ chạy nội bộ) ──
    socket.on('dev:fill_bots', ({ count } = {}) => {
      const room = rooms.getRoom(socket.data.roomCode);
      if (!room) return;
      // Chỉ host mới có quyền fill bots
      if (room.moderatorId !== socket.id) return socket.emit(S2C.ERROR, 'Chỉ Quản trò mới dùng được lệnh này.');
      fillBots(room, count || 8);
      syncRoomToDb(room);
      io.to(room.roomCode).emit(S2C.ROOM_STATE, room.getPublicState());
    });

    socket.on('disconnect', () => cleanup(socket));
  });

  // Dọn khi rời/rớt mạng — đánh dấu chết để vòng lặp game không kẹt
  function cleanup(socket) {
    const room = rooms.getRoom(socket.data && socket.data.roomCode);
    // DB: ví này rời phòng (active=0) dù room in-memory còn hay không.
    if (socket.wallet) db.leaveAttendanceWallet(socket.wallet);
    if (!room) return;
    const wasMod = room.moderatorId === socket.id;
    room.removePlayerById(socket.id);
    if (wasMod) room.moderatorId = null;
    socket.leave(room.roomCode);
    socket.data.roomCode = null;

    // Còn người THẬT nào không? (bot có id 'bot_*', không tính)
    const realPlayers = room.players.filter((p) => !String(p.id).startsWith('bot_'));
    const onlyBotsLeft = realPlayers.length === 0;

    if (room.players.length === 0 && !room.moderatorId) {
      rooms.removeRoom(room.roomCode);
      db.leaveAttendanceRoom(room.roomCode);
      db.deleteRoom(room.roomCode); // phòng rỗng → xóa khỏi kênh thế giới
    } else if (onlyBotsLeft) {
      // Chỉ còn bot (phòng fake "kênh thế giới") → gỡ phòng in-memory nhưng
      // GIỮ row DB để phòng vẫn hiện ở kênh thế giới cho người khác vào.
      rooms.removeRoom(room.roomCode);
      db.leaveAttendanceRoom(room.roomCode);
    } else {
      syncRoomToDb(room);
      io.to(room.roomCode).emit(S2C.ROOM_STATE, room.getPublicState());
    }
  }
}

module.exports = { registerHandlers };
