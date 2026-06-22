/**
 * api/auth.routes.ts — đăng nhập ví + hồ sơ. Khớp frontend/src/lib/api.js.
 *   GET  /auth/nonce?wallet=   → { nonce, message }
 *   POST /auth/verify          → { token, wallet }   (FE đọc `token`)
 *   POST /auth/refresh         → { accessToken }
 *   POST /auth/logout          → { ok }
 *   GET  /auth/me  (Bearer)    → { wallet, user }
 */
import { Router } from 'express';
import { z } from 'zod';
import { issueNonce, verifySignature, refresh, logout } from '../services/solana/walletAuth.js';
import { ensureUser, getProfile } from '../data/repositories/userRepo.js';
import { requireAuth, type AuthedRequest } from './middleware.js';

export const authRouter = Router();

authRouter.get('/nonce', (req, res) => {
  const wallet = String(req.query.wallet || '');
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });
  return res.json(issueNonce(wallet));
});

const VerifyBody = z.object({
  wallet: z.string().min(32),
  signature: z.string().min(1),
  message: z.string().min(1),
});

authRouter.post('/verify', (req, res) => {
  const parsed = VerifyBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dữ liệu không hợp lệ.' });
  const r = verifySignature(parsed.data);
  if (!r.ok) return res.status(401).json({ error: r.error });
  // Tạo user nếu chưa có; FE đọc field `token`.
  ensureUser(parsed.data.wallet, `Người chơi ${parsed.data.wallet.slice(0, 4)}`);
  return res.json({ token: r.accessToken, refreshToken: r.refreshToken, wallet: parsed.data.wallet });
});

authRouter.post('/refresh', (req, res) => {
  const rt = String(req.body?.refreshToken || '');
  const r = refresh(rt);
  if (!r.ok) return res.status(401).json({ error: r.error });
  return res.json({ accessToken: r.accessToken });
});

authRouter.post('/logout', (req, res) => {
  logout(String(req.body?.refreshToken || ''));
  return res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const user = getProfile(req.wallet!);
  return res.json({ wallet: req.wallet, user });
});
