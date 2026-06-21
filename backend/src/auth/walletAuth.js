/**
 * backend/auth/walletAuth.js
 * ─────────────────────────────────────────────────────────────
 * Xác thực bằng ví Solana (Phantom web) — challenge/response:
 *   1. GET /auth/nonce?wallet=...  -> trả message chứa nonce.
 *   2. Client ký message bằng ví.
 *   3. POST /auth/verify { wallet, signature, message } -> verify ed25519 -> JWT.
 *
 * JWT chứa { wallet } dùng cho Socket.io handshake (auth.token) và REST.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const { verifySignature } = require('../services/solana/mintBadge');
const db = require('../db/store');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 phút
const ACCESS_TTL = '1h';            // access token sống 1 tiếng
const REFRESH_TTL_DAYS = 3;         // refresh token sống 3 ngày

// nonce in-memory: wallet -> { nonce, message, exp }
const nonceStore = new Map();

function randomNonce() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/** Cấp cặp token: access (1h) + refresh (3 ngày, có jti lưu DB để thu hồi). */
function issueTokens(wallet) {
  const accessToken = jwt.sign({ wallet, typ: 'access' }, JWT_SECRET, { expiresIn: ACCESS_TTL });
  const jti = randomNonce() + randomNonce();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000).toISOString();
  const refreshToken = jwt.sign({ wallet, typ: 'refresh', jti }, REFRESH_SECRET, {
    expiresIn: `${REFRESH_TTL_DAYS}d`,
  });
  db.createSession(jti, wallet, expiresAt);
  return { accessToken, refreshToken, expiresIn: 3600 };
}

function buildMessage(wallet, nonce) {
  return [
    'AIoneWolf login',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Time: ${new Date().toISOString()}`,
  ].join('\n');
}

const router = express.Router();

// GET /auth/nonce?wallet=<base58>
router.get('/nonce', (req, res) => {
  const wallet = (req.query.wallet || '').toString().trim();
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });

  const nonce = randomNonce();
  const message = buildMessage(wallet, nonce);
  nonceStore.set(wallet, { nonce, message, exp: Date.now() + NONCE_TTL_MS });
  return res.json({ nonce, message });
});

// POST /auth/verify { wallet, signature, message }
router.post('/verify', (req, res) => {
  const { wallet, signature, message } = req.body || {};
  if (!wallet || !signature || !message) {
    return res.status(400).json({ error: 'Thiếu wallet/signature/message.' });
  }

  const entry = nonceStore.get(wallet);
  if (!entry) return res.status(401).json({ error: 'Chưa xin nonce hoặc đã dùng.' });
  if (Date.now() > entry.exp) {
    nonceStore.delete(wallet);
    return res.status(401).json({ error: 'Nonce hết hạn.' });
  }
  if (message !== entry.message) {
    return res.status(401).json({ error: 'Message không khớp.' });
  }

  let ok = false;
  try {
    ok = verifySignature(message, signature, wallet);
  } catch (e) {
    return res.status(400).json({ error: `Chữ ký lỗi: ${e.message}` });
  }
  if (!ok) return res.status(401).json({ error: 'Chữ ký không hợp lệ.' });

  nonceStore.delete(wallet); // dùng 1 lần

  // Lưu/ cập nhật user vào DB (lần đầu khởi tạo ELO 1000)
  const user = db.upsertUser(wallet);

  const { accessToken, refreshToken, expiresIn } = issueTokens(wallet);
  // `token` giữ lại để tương thích code FE cũ (= accessToken)
  return res.json({ token: accessToken, accessToken, refreshToken, expiresIn, wallet, user });
});

// POST /auth/refresh { refreshToken } → cấp access token mới
// FE tự gọi khi access token còn ~10 phút.
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return res.status(400).json({ error: 'Thiếu refreshToken.' });

  let payload;
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch {
    return res.status(401).json({ error: 'Refresh token không hợp lệ hoặc hết hạn.' });
  }
  if (payload.typ !== 'refresh') return res.status(401).json({ error: 'Sai loại token.' });

  const sess = db.getSession(payload.jti);
  if (!sess || sess.revoked) return res.status(401).json({ error: 'Phiên đã bị thu hồi.' });

  const accessToken = jwt.sign({ wallet: payload.wallet, typ: 'access' }, JWT_SECRET, {
    expiresIn: ACCESS_TTL,
  });
  return res.json({ token: accessToken, accessToken, expiresIn: 3600, wallet: payload.wallet });
});

// POST /auth/logout { refreshToken } → thu hồi phiên
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) {
    try {
      const p = jwt.verify(refreshToken, REFRESH_SECRET);
      if (p.jti) db.revokeSession(p.jti);
    } catch { /* token rác — kệ */ }
  }
  return res.json({ ok: true });
});

// GET /auth/me  — trả hồ sơ user từ DB (cần Bearer JWT)
router.get('/me', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = verifyJwt(token);
  if (!payload) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  const user = db.getUser(payload.wallet);
  const rank = user ? db.getRank(user.elo) : null;
  const history = user ? db.matchHistory(payload.wallet, 10) : [];
  return res.json({ wallet: payload.wallet, user: user ? { ...user, rank } : null, history });
});

// GET /auth/leaderboard — bảng xếp hạng ELO (public)
router.get('/leaderboard', (_req, res) => {
  return res.json({ leaderboard: db.leaderboard() });
});

/** Verify JWT -> trả payload hoặc null. */
function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Socket.io middleware: đọc JWT từ handshake.auth.token.
 * KHÔNG bắt buộc đăng nhập để chơi thử (cho phép guest), nhưng nếu có token
 * thì gắn socket.wallet. Có thể siết lại bằng REQUIRE_AUTH=1.
 */
function socketAuthMiddleware(socket, next) {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (token) {
    const payload = verifyJwt(token);
    if (payload) socket.wallet = payload.wallet;
    else if (process.env.REQUIRE_AUTH === '1') return next(new Error('Token không hợp lệ.'));
  } else if (process.env.REQUIRE_AUTH === '1') {
    return next(new Error('Cần đăng nhập ví.'));
  }
  return next();
}

module.exports = { router, verifyJwt, socketAuthMiddleware };
