/**
 * services/solana/walletAuth.ts
 * ─────────────────────────────────────────────────────────────
 * Đăng nhập bằng ví Solana (không mật khẩu):
 *   GET nonce → người dùng KÝ message → verify chữ ký ed25519 → cấp JWT.
 *
 * Bảo mật: nonce dùng crypto.randomBytes (KHÔNG Math.random); nonce dùng 1 lần,
 * TTL 5 phút, giữ trong RAM (đủ cho 1 process). jti refresh = randomUUID.
 */
import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import jwt from 'jsonwebtoken';
import bs58 from 'bs58';
import { env } from '../../config/env.js';
import { createSession, isValid, revoke } from '../../data/repositories/sessionRepo.js';

const NONCE_TTL_MS = 5 * 60_000;
const ACCESS_TTL = '1h';
const REFRESH_TTL_DAYS = 7;

/** wallet -> { nonce, message, exp }. RAM, 1 process. */
const _nonces = new Map<string, { message: string; exp: number }>();

export function issueAuthTokens(wallet: string): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign({ wallet }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86_400_000).toISOString();
  createSession({ jti, wallet, expiresAt });
  const refreshToken = jwt.sign({ wallet, jti }, env.REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  return { accessToken, refreshToken };
}

export function issueNonce(wallet: string): { nonce: string; message: string } {
  const nonce = crypto.randomBytes(16).toString('hex');
  const message = `Echoes of the Lycan — đăng nhập\nVí: ${wallet}\nNonce: ${nonce}`;
  _nonces.set(wallet, { message, exp: Date.now() + NONCE_TTL_MS });
  return { nonce, message };
}

/** Verify chữ ký với message đã cấp. Đúng → cấp access + refresh token. */
export function verifySignature(opts: { wallet: string; signature: string; message: string }):
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; error: string } {
  const rec = _nonces.get(opts.wallet);
  if (!rec || rec.exp < Date.now()) return { ok: false, error: 'Nonce hết hạn, thử lại.' };
  if (rec.message !== opts.message) return { ok: false, error: 'Message không khớp.' };

  let valid = false;
  try {
    valid = nacl.sign.detached.verify(
      new TextEncoder().encode(opts.message),
      bs58.decode(opts.signature),
      bs58.decode(opts.wallet),
    );
  } catch {
    return { ok: false, error: 'Chữ ký không hợp lệ.' };
  }
  if (!valid) return { ok: false, error: 'Chữ ký sai.' };

  _nonces.delete(opts.wallet); // dùng 1 lần

  return { ok: true, ...issueAuthTokens(opts.wallet) };
}

/** Xác thực access token → wallet, hoặc null. */
export function verifyAccess(token: string): string | null {
  try {
    const p = jwt.verify(token, env.JWT_SECRET) as { wallet: string };
    return p.wallet;
  } catch {
    return null;
  }
}

/** Đổi refresh token lấy access token mới (kiểm tra jti chưa thu hồi). */
export function refresh(refreshToken: string): { ok: true; accessToken: string } | { ok: false; error: string } {
  try {
    const p = jwt.verify(refreshToken, env.REFRESH_SECRET) as { wallet: string; jti: string };
    if (!isValid(p.jti)) return { ok: false, error: 'Phiên đã thu hồi.' };
    const accessToken = jwt.sign({ wallet: p.wallet }, env.JWT_SECRET, { expiresIn: ACCESS_TTL });
    return { ok: true, accessToken };
  } catch {
    return { ok: false, error: 'Refresh token không hợp lệ.' };
  }
}

export function logout(refreshToken: string): void {
  try {
    const p = jwt.verify(refreshToken, env.REFRESH_SECRET) as { jti: string };
    revoke(p.jti);
  } catch {
    /* ignore */
  }
}
