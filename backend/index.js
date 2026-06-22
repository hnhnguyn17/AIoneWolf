/**
 * backend/index.js
 * AIoneWolf backend (gộp AI Quản trò): Express + Socket.io.
 * Agora LLM_URL trỏ vào: POST /ai/chat/completions
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const { router: authRouter, socketAuthMiddleware } = require('./src/auth/walletAuth');
const agoraRouter = require('./src/routes/agora');
const roomsRouter = require('./src/routes/rooms');
const { router: solanaRouter } = require('./src/services/solana/mintBadge');
const { registerHandlers } = require('./src/socket/handlers');
const { createGmService } = require('./src/services/gmService');
const { createAiRouter } = require('./src/routes/ai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// Khởi tạo gmService — cửa mutation duy nhất, inject vào handlers + AI router
const gm = createGmService(io);

// REST routes
app.get('/', (_req, res) => res.json({ name: 'aionewolf-backend', ok: true }));
app.use('/auth', authRouter);
app.use('/agora', agoraRouter);
app.use('/rooms', roomsRouter);
app.use('/solana', solanaRouter);
app.use('/ai', createAiRouter(gm));   // Agora ConvoAI LLM_URL → /ai/chat/completions

// Socket.io
io.use(socketAuthMiddleware);
registerHandlers(io, gm);             // handlers nhận gm để gọi trực tiếp

const PORT = process.env.PORT || 3636;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🐺 AIoneWolf backend (+ AI Quan tro) chay cong ${PORT}`);
  console.log(`   REST: /auth /agora /rooms /solana /ai   |   Socket.io: ON`);
  console.log(`   Agora LLM_URL: http://localhost:${PORT}/ai/chat/completions`);
});
