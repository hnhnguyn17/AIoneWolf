/**
 * src/lib/api.js
 * ─────────────────────────────────────────────────────────────
 * Client REST tới backend (contracts/api.md). Base URL mặc định
 * http://localhost:4000, đổi được qua VITE_BACKEND_URL.
 */
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'http://localhost:3636';

async function fetchBackend(path, options) {
  const url = `${BACKEND_URL}${path}`;
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new Error(
      `Khong ket noi duoc backend tai ${BACKEND_URL}. Hay chay backend hoac kiem tra VITE_BACKEND_URL.`,
    );
  }
}

async function asJson(res) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text };
  }
  if (!res.ok) {
    const msg = body?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

/**
 * GET /auth/nonce?wallet=<base58>
 * → { nonce, message } — client phải ký đúng `message` này.
 */
export async function getNonce(wallet) {
  const res = await fetchBackend(`/auth/nonce?wallet=${encodeURIComponent(wallet)}`);
  return asJson(res); // { nonce, message }
}

/**
 * POST /auth/verify  { wallet, signature(base58), message }
 * → { token, wallet }
 */
export async function verifySignature({ wallet, signature, message }) {
  const res = await fetchBackend('/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wallet, signature, message }),
  });
  return asJson(res); // { token, wallet }
}

/**
 * GET /auth/me  (Bearer JWT) → { wallet, user } — hồ sơ user (elo, wins…).
 * Trả null nếu chưa đăng nhập / lỗi mạng (UI tự fallback data cứng).
 */
export async function getMe(token) {
  if (!token) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json(); // { wallet, user }
  } catch {
    return null;
  }
}

/**
 * GET /rooms/history?wallet= → { attendance, matches } cho mục lịch sử.
 * Lỗi → null (UI fallback).
 */
export async function getHistory(wallet) {
  if (!wallet) return null;
  try {
    const res = await fetch(
      `${BACKEND_URL}/rooms/history?wallet=${encodeURIComponent(wallet)}`,
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Giá SOL/USD realtime từ CoinGecko free (không cần key).
 * Trả { usd, usd_24h_change } hoặc null nếu lỗi (UI dùng giá cứng).
 */
export async function getSolPrice() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true',
    );
    if (!res.ok) return null;
    const j = await res.json();
    const s = j?.solana;
    if (!s) return null;
    return { usd: s.usd, change24h: s.usd_24h_change };
  } catch {
    return null;
  }
}

/**
 * Số dư ví (SOL) qua Solana RPC devnet free (getBalance, lamports→SOL).
 * Trả số SOL (number) hoặc null nếu lỗi/ví không hợp lệ.
 */
export async function getSolBalance(wallet, rpc = 'https://api.devnet.solana.com') {
  if (!wallet) return null;
  try {
    const res = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [wallet],
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const lamports = j?.result?.value;
    if (typeof lamports !== 'number') return null;
    return lamports / 1e9; // 1 SOL = 1e9 lamports
  } catch {
    return null;
  }
}
