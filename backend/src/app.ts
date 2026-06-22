/**
 * app.ts — COMPOSITION ROOT. Nơi DUY NHẤT khởi tạo + nối mọi thành phần.
 * Tránh circular: service nhận deps qua tham số, không import lẫn nhau top-level.
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { authRouter } from './api/auth.routes.js';
import { roomsRouter } from './api/rooms.routes.js';
import { agoraRouter } from './api/agora.routes.js';
import { aiRouter } from './api/ai.routes.js';
import { errorHandler } from './api/middleware.js';

import { GameService } from './services/gameService.js';
import { GmService } from './services/ai/gmService.js';
import { BotService } from './services/ai/botService.js';
import { registerHandlers } from './socket/handlers.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // REST
  app.get('/health', (_req, res) => res.json({ ok: true, name: 'echoes-backend', version: '2.0.0' }));
  app.use('/auth', authRouter);
  app.use('/rooms', roomsRouter);
  app.use('/agora', agoraRouter);
  app.use('/ai', aiRouter);
  app.use(errorHandler);

  // Socket + game
  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: '*' } });

  const game = new GameService(io);
  const gm = new GmService(io);
  const bot = new BotService(io, game);
  game.attachAI(gm, bot);

  registerHandlers(io, game);

  return { app, httpServer, io };
}
