/**
 * src/lib/auth.jsx
 * ─────────────────────────────────────────────────────────────
 * Đăng nhập bằng ví Solana theo luồng challenge–response (chống replay):
 *   1. Ví Phantom (extension web) đã connect → có publicKey.
 *   2. GET /auth/nonce?wallet=...   → nhận { message }.
 *   3. Ký `message` bằng ví (signMessage của Wallet Standard).
 *   4. POST /auth/verify { wallet, signature(base58), message } → { token }.
 *   5. Lưu { token, wallet } vào context + localStorage cho phiên sau.
 *
 * JWT dùng cho Socket.io handshake (auth.token) và header Authorization.
 *
 * Lưu ý WEB: signMessage là API của Phantom extension qua Wallet Standard —
 * mở popup extension để người dùng duyệt. Không có deeplink mobile ở đây.
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { useWallet } from './wallet.jsx';
import { getNonce, loginWithEmail, registerWithEmail, verifySignature } from './api.js';
import { encodeBase58 } from './base58.js';
import { disconnectSocket } from './socket.js';

const STORAGE_KEY = 'aionewolf.auth';

const AuthContext = createContext(null);

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const { publicKey, signMessage, disconnect } = useWallet();
  const [auth, setAuth] = useState(loadStored); // { token, wallet } | null
  const [status, setStatus] = useState('idle'); // idle | signing | error
  const [error, setError] = useState(null);

  const persistAuth = useCallback((result) => {
    const next = {
      token: result.token || result.accessToken,
      refreshToken: result.refreshToken || null,
      wallet: result.wallet || null,
      email: result.email || null,
      authType: result.authType || (result.email ? 'email' : 'wallet'),
      user: result.user || null,
    };
    setAuth(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setStatus('idle');
    return next;
  }, []);

  /**
   * login() — chạy full challenge–response. Yêu cầu ví đã connect.
   * Ví extension sẽ bật popup yêu cầu ký message.
   */
  const login = useCallback(async () => {
    if (!publicKey) {
      throw new Error('Chưa kết nối ví — hãy bấm Connect trước.');
    }
    if (!signMessage) {
      throw new Error('Ví không hỗ trợ signMessage (cần Phantom extension).');
    }
    setStatus('signing');
    setError(null);
    try {
      const wallet = publicKey.toBase58();

      // 2. Lấy message cần ký từ backend.
      const { message } = await getNonce(wallet);

      // 3. Ký bằng ví (Uint8Array → base58).
      const encoded = new TextEncoder().encode(message);
      const sigBytes = await signMessage(encoded);
      const signature = encodeBase58(sigBytes);

      // 4. Gửi verify, nhận JWT.
      const result = await verifySignature({ wallet, signature, message });

      return persistAuth({ ...result, wallet: result.wallet || wallet, authType: 'wallet' });
    } catch (err) {
      setStatus('error');
      setError(err.message || String(err));
      throw err;
    }
  }, [persistAuth, publicKey, signMessage]);

  const loginPassword = useCallback(async ({ email, password }) => {
    setStatus('signing');
    setError(null);
    try {
      return persistAuth(await loginWithEmail({ email, password }));
    } catch (err) {
      setStatus('error');
      setError(err.message || String(err));
      throw err;
    }
  }, [persistAuth]);

  const registerPassword = useCallback(async ({ email, password, name }) => {
    setStatus('signing');
    setError(null);
    try {
      return persistAuth(await registerWithEmail({ email, password, name }));
    } catch (err) {
      setStatus('error');
      setError(err.message || String(err));
      throw err;
    }
  }, [persistAuth]);

  /** logout() — xoá session + ngắt ví. */
  const logout = useCallback(async () => {
    setAuth(null);
    setStatus('idle');
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
    disconnectSocket();
    try {
      await disconnect?.();
    } catch {
      /* ignore */
    }
  }, [disconnect]);

  const value = {
    auth,
    token: auth?.token || null,
    wallet: auth?.wallet || null,
    email: auth?.email || null,
    authType: auth?.authType || null,
    user: auth?.user || null,
    isAuthed: !!auth?.token,
    status,
    error,
    login,
    loginPassword,
    registerPassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong <AuthProvider>.');
  return ctx;
}
