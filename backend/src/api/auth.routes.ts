/**
 * api/auth.routes.ts — đăng nhập ví + hồ sơ. Khớp frontend/src/lib/api.js.
 *   GET  /auth/nonce?wallet=   → { nonce, message }
 *   POST /auth/verify          → { token, wallet }   (FE đọc `token`)
 *   POST /auth/refresh         → { accessToken }
 *   POST /auth/logout          → { ok }
 *   GET  /auth/me  (Bearer)    → { wallet, user }
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { issueNonce, verifySignature, refresh, logout, issueAuthTokens } from '../services/solana/walletAuth.js';
import { ensureUser, getProfile } from '../data/repositories/userRepo.js';
import {
  createAuthAccount,
  getAuthAccountByEmail,
  touchAuthAccountLogin,
} from '../data/repositories/authAccountRepo.js';
import { requireAuth, type AuthedRequest } from './middleware.js';

export const authRouter = Router();

const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_ITERATIONS = 100_000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = 'sha256';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailWalletId(email: string): string {
  return `email:${email}`;
}

function hashPassword(password: string, salt = crypto.randomBytes(16).toString('base64')) {
  const passwordHash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
    .toString('base64');
  return { passwordHash, passwordSalt: salt };
}

function verifyPassword(password: string, account: { passwordHash: string; passwordSalt: string }): boolean {
  const { passwordHash } = hashPassword(password, account.passwordSalt);
  const expected = Buffer.from(account.passwordHash, 'base64');
  const actual = Buffer.from(passwordHash, 'base64');
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function userWithEmail(user: ReturnType<typeof ensureUser>, email: string) {
  return { ...user, email, authType: 'email' };
}

const EmailAuthBody = z.object({
  email: z.string().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  name: z.string().trim().min(1).max(40).optional(),
});

const EmailLoginBody = EmailAuthBody.pick({ email: true, password: true });

authRouter.get('/nonce', (req, res) => {
  const wallet = String(req.query.wallet || '');
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });
  return res.json(issueNonce(wallet));
});

authRouter.post('/register', (req, res) => {
  const parsed = EmailAuthBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email hoặc mật khẩu không hợp lệ.' });

  const email = normalizeEmail(parsed.data.email);
  if (getAuthAccountByEmail(email)) {
    return res.status(409).json({ error: 'Email này đã được đăng ký.' });
  }

  const wallet = emailWalletId(email);
  const { passwordHash, passwordSalt } = hashPassword(parsed.data.password);
  createAuthAccount({ email, wallet, passwordHash, passwordSalt });
  const user = ensureUser(wallet, parsed.data.name || email.split('@')[0]);
  const { accessToken, refreshToken } = issueAuthTokens(wallet);

  return res.status(201).json({
    token: accessToken,
    accessToken,
    refreshToken,
    wallet,
    email,
    authType: 'email',
    user: userWithEmail(user, email),
  });
});

authRouter.post('/login', (req, res) => {
  const parsed = EmailLoginBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Nhập email và mật khẩu.' });

  const email = normalizeEmail(parsed.data.email);
  const account = getAuthAccountByEmail(email);
  if (!account || !verifyPassword(parsed.data.password, account)) {
    return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  }

  touchAuthAccountLogin(email);
  const user = ensureUser(account.wallet, email.split('@')[0]);
  const { accessToken, refreshToken } = issueAuthTokens(account.wallet);

  return res.json({
    token: accessToken,
    accessToken,
    refreshToken,
    wallet: account.wallet,
    email,
    authType: 'email',
    user: userWithEmail(user, email),
  });
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
