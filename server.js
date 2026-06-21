const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── Game State ────────────────────────────────────────
// Map<RoomCode, RoomData>
const rooms = new Map();

// ─── Helpers ───────────────────────────────────────────

/** Generate a random 4-char uppercase room code */
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (rooms.has(code)) return generateRoomCode();
    return code;
}

function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, {
            moderatorId: null,
            players: [],
            status: 'waiting'
        });
    }
    return rooms.get(roomId);
}

function buildRoleSummary(players) {
    return players.map(p => ({ name: p.name, role: p.role }));
}

function cleanupUser(socketId) {
    for (const [roomId, room] of rooms.entries()) {
        if (room.moderatorId === socketId) {
            room.moderatorId = null;
            io.to(roomId).emit('mod_status_update', { hasModerator: false });
        }

        const before = room.players.length;
        room.players = room.players.filter(p => p.id !== socketId);
        if (room.players.length !== before) {
            io.to(roomId).emit('player_count_update', room.players.length);
            if (room.moderatorId) {
                io.to(room.moderatorId).emit('player_list_update', room.players);
            }
        }

        if (room.players.length === 0 && !room.moderatorId) {
            rooms.delete(roomId);
        }
    }
}

// ─── Socket.IO Events ─────────────────────────────────

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // ── Create Room (Moderator — auto-generates code) ──
    socket.on('create_room', () => {
        const code = generateRoomCode();
        const room = getRoom(code);
        room.moderatorId = socket.id;
        socket.join(code);

        socket.emit('room_created', { roomCode: code });
        socket.emit('role_assigned', { type: 'moderator' });
        socket.emit('player_list_update', room.players);
        socket.emit('init_state', { hasModerator: true, playerCount: 0 });
    });

    // ── Join Room (Player enters code or scans QR) ─────
    socket.on('join_room', ({ roomId, name }) => {
        const code = roomId.toUpperCase().trim();

        if (!rooms.has(code)) {
            return socket.emit('error_msg', `Phòng "${code}" không tồn tại!`);
        }

        socket.join(code);
        const room = rooms.get(code);

        const isExist = room.players.find(p => p.id === socket.id);
        if (!isExist) {
            room.players.push({
                id: socket.id,
                name: name || `Player_${socket.id.substr(0, 4)}`,
                role: null
            });
        }
        socket.emit('role_assigned', { type: 'player', roomCode: code });
        io.to(code).emit('player_count_update', room.players.length);
        if (room.moderatorId) {
            io.to(room.moderatorId).emit('player_list_update', room.players);
        }
        socket.emit('init_state', {
            hasModerator: !!room.moderatorId,
            playerCount: room.players.length
        });
    });

    // ── Distribute Roles (Fisher-Yates Shuffle) ────────
    socket.on('start_assign_roles', ({ roomId, selectedRoles }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (socket.id !== room.moderatorId) return;

        if (selectedRoles.length !== room.players.length) {
            return socket.emit('error_msg',
                `Không khớp! Roles: ${selectedRoles.length}, Players: ${room.players.length}`);
        }

        // Fisher-Yates Shuffle
        const shuffled = [...selectedRoles];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Assign & emit to each player privately
        room.players.forEach((player, index) => {
            player.role = shuffled[index];
            io.to(player.id).emit('receive_role', player.role);
        });

        room.status = 'assigned';

        // Moderator Cheat Sheet
        socket.emit('role_summary', buildRoleSummary(room.players));
        socket.emit('status_msg', 'Đã chia bài thành công!');
    });

    // ── Reset / Re-deal ────────────────────────────────
    socket.on('reset_room', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (!room) return;
        if (socket.id !== room.moderatorId) return;

        room.players.forEach(p => { p.role = null; });
        room.status = 'waiting';

        io.to(roomId).emit('room_reset');
        socket.emit('player_list_update', room.players);
        socket.emit('player_count_update', room.players.length);
        socket.emit('status_msg', 'Đã reset! Sẵn sàng chia lại.');
    });

    // ── Kick Player ────────────────────────────────────
    socket.on('kick_player', ({ roomId, playerId }) => {
        const room = rooms.get(roomId);
        if (!room || socket.id !== room.moderatorId) return;

        room.players = room.players.filter(p => p.id !== playerId);
        io.to(roomId).emit('player_count_update', room.players.length);
        io.to(room.moderatorId).emit('player_list_update', room.players);

        const targetSocket = io.sockets.sockets.get(playerId);
        if (targetSocket) {
            targetSocket.leave(roomId);
            targetSocket.emit('kicked');
            targetSocket.emit('error_msg', 'Bạn đã bị Quản trò kick khỏi phòng.');
        }
    });

    // ── Disconnect ─────────────────────────────────────
    socket.on('disconnect', () => {
        cleanupUser(socket.id);
    });
});

// ─── Start Server ──────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🐺 Ma Sói server running on port ${PORT}`);
});