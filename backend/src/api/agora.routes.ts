/**
 * api/agora.routes.ts — cấp RTC token cho người chơi join kênh voice.
 *   GET /agora/token?channel=&uid=  → { appId, channel, uid, token, stub }
 * Kênh Sói (-wolves): chỉ cấp token nếu seat là Sói (bảo vệ kênh bí mật).
 */
import { Router } from 'express';
import { buildUserToken } from '../services/agora/token.js';
import { roomManager } from '../domain/RoomManager.js';
import { ROLE } from '../contracts/index.js';

export const agoraRouter = Router();

agoraRouter.get('/token', (req, res) => {
  const channel = String(req.query.channel || '');
  const uid = Number(req.query.uid || 0);
  if (!channel) return res.status(400).json({ error: 'Thiếu channel.' });

  // Bảo vệ kênh Sói: chỉ Sói mới lấy được token.
  if (/-wolves$/.test(channel)) {
    const room = roomManager.get(String(req.query.roomCode || ''));
    const seat = Number(req.query.seat);
    const player = room?.getBySeat(seat);
    if (!player || player.role !== ROLE.WEREWOLF) {
      return res.status(403).json({ error: 'Chỉ phe Sói được vào kênh này.' });
    }
  }

  const { token, appId, stub } = buildUserToken(channel, uid);
  return res.json({ appId: appId || 'STUB_APP_ID', channel, uid, token, stub });
});
