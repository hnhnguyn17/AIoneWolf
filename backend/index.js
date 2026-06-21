/**
 * backend/index.js
 * ─────────────────────────────────────────────────────────────
 * Điểm vào server AIoneWolf: Express + HTTP + Socket.io.
 * Gom: auth ví Solana, REST cho AI Quản trò, Agora token (stub), Solana mint (stub).
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { router: authRouter, socketAuthMiddleware } = require('./src/auth/walletAuth');
const { createGmRouter } = require('./src/routes/gm');
const agoraRouter = require('./src/routes/agora');
const roomsRouter = require('./src/routes/rooms');
const { router: solanaRouter } = require('./src/services/solana/mintBadge');
const { registerHandlers } = require('./src/socket/handlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/', (_req, res) => res.json({ name: 'aionewolf-backend', ok: true }));

// REST routes
app.use('/auth', authRouter);
app.use('/gm', createGmRouter(io));   // inject io để phát socket event ra FE
app.use('/agora', agoraRouter);
app.use('/rooms', roomsRouter);       // kênh thế giới + lịch sử chơi
app.use('/solana', solanaRouter);

// Socket.io
io.use(socketAuthMiddleware);
registerHandlers(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐺 AIoneWolf backend chạy trên cổng ${PORT}`);
  console.log(`   REST: /auth /gm /agora /solana   |   Socket.io: ON`);
});
