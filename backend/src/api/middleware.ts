/**
 * api/middleware.ts — requireAuth (JWT) + errorHandler (cuối chuỗi).
 */
import type { Request, Response, NextFunction } from 'express';
import { verifyAccess } from '../services/solana/walletAuth.js';

export interface AuthedRequest extends Request {
  wallet?: string;
}

/** Bắt buộc Bearer JWT hợp lệ; gắn req.wallet. */
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const wallet = token ? verifyAccess(token) : null;
  if (!wallet) {
    res.status(401).json({ error: 'Cần đăng nhập.' });
    return;
  }
  req.wallet = wallet;
  next();
}

/** Bắt lỗi async không để treo response. Đặt CUỐI chuỗi middleware. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const msg = err instanceof Error ? err.message : 'Lỗi máy chủ.';
  console.error('[error]', msg);
  if (!res.headersSent) res.status(500).json({ error: msg });
}
