/**
 * src/screens/LoginScreen.jsx
 * ─────────────────────────────────────────────────────────────
 * Màn "Enter the Abyss" (theme VOIR_ABYSS). Đăng nhập bằng ví Phantom
 * **extension web** qua Wallet Standard (@solana/wallet-adapter).
 *
 * Luồng WEB:
 *   - Chưa connect ví → nút "Connect Phantom Wallet" mở modal wallet-adapter
 *     (useWalletModal). Phantom extension xuất hiện trong modal; bấm chọn →
 *     extension bật popup xin quyền connect.
 *   - Đã connect (có publicKey) → nút đổi thành "Sign in" → gọi login()
 *     (challenge–response: lấy nonce, ký message bằng extension, verify).
 *
 * KHÔNG dùng deeplink mobile. Đây là extension trên trình duyệt desktop,
 * cluster devnet.
 */
import { useEffect, useState } from 'react';
import { useWallet, useWalletModal } from '../lib/wallet.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function LoginScreen({ onAuthed }) {
  const { publicKey, connecting, connected, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const {
    login,
    loginPassword,
    registerPassword,
    status,
    error,
    isAuthed,
  } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Khi đã có JWT → báo lên App để chuyển màn.
  useEffect(() => {
    if (isAuthed) onAuthed?.();
  }, [isAuthed, onAuthed]);

  const signing = status === 'signing';
  const shortAddr = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
    : null;

  async function handlePrimary() {
    if (!connected) {
      // Mở modal chọn ví (Phantom extension web).
      setVisible(true);
      return;
    }
    // Đã connect → ký đăng nhập.
    try {
      await login();
    } catch {
      /* lỗi đã được hiển thị qua `error` */
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        email,
        password,
        name: authMode === 'register' ? name : undefined,
      };
      if (authMode === 'register') await registerPassword(payload);
      else await loginPassword(payload);
    } catch {
      /* lỗi đã được hiển thị qua `error` */
    }
  }

  const primaryLabel = !connected
    ? 'Connect Phantom Wallet'
    : signing
      ? 'Awaiting signature…'
      : 'Sign in to the Abyss';

  return (
    <div className="bg-[#0A0A0B] text-on-surface font-body-md min-h-screen flex items-center justify-center relative overflow-x-hidden overflow-y-auto">
      {/* Nền rừng forest.png full-screen + PHỦ ĐEN ĐẬM cho card nổi */}
      <div className="forest-bg" />
      <div className="forest-overlay-login" />

      {/* Scanline overlay */}
      <div className="scanlines" />

      <main className="relative z-20 w-full max-w-md px-margin-mobile py-8 md:px-0">
        {/* Branding */}
        <div className="text-center mb-12">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-surface-tint tracking-tighter drop-shadow-[0_0_15px_rgba(0,219,231,0.5)]">
            VOIR_ABYSS
          </h1>
        </div>

        {/* Glass login card */}
        <div className="glass-panel rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
            <div className="absolute top-2 right-2 font-label-sm text-label-sm text-surface-tint/50">
              SYS.ON
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-8">
            <div className="text-center space-y-2">
              <h2 className="font-headline-md text-headline-md text-surface-tint">
                Enter the Abyss
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Đăng nhập bằng email hoặc ví Phantom.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="w-full flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 rounded-DEFAULT border border-outline-variant/50 bg-surface-container/30 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`py-2 rounded font-button text-button transition-colors ${
                    authMode === 'login'
                      ? 'bg-surface-tint text-[#0A0A0B]'
                      : 'text-on-surface-variant hover:text-surface-tint'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`py-2 rounded font-button text-button transition-colors ${
                    authMode === 'register'
                      ? 'bg-surface-tint text-[#0A0A0B]'
                      : 'text-on-surface-variant hover:text-surface-tint'
                  }`}
                >
                  Đăng ký
                </button>
              </div>

              {authMode === 'register' && (
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tên hiển thị"
                  autoComplete="name"
                  className="w-full bg-surface-container/50 border border-outline-variant/50 rounded px-4 py-3 text-on-surface font-body-md placeholder:text-outline-variant/60 focus:ring-0 focus:border-surface-tint/60 outline-none"
                />
              )}

              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                type="email"
                autoComplete="email"
                required
                className="w-full bg-surface-container/50 border border-outline-variant/50 rounded px-4 py-3 text-on-surface font-body-md placeholder:text-outline-variant/60 focus:ring-0 focus:border-surface-tint/60 outline-none"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                type="password"
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                minLength={6}
                required
                className="w-full bg-surface-container/50 border border-outline-variant/50 rounded px-4 py-3 text-on-surface font-body-md placeholder:text-outline-variant/60 focus:ring-0 focus:border-surface-tint/60 outline-none"
              />

              <button
                type="submit"
                disabled={signing}
                className="w-full bg-surface-tint text-[#0A0A0B] font-button text-button py-4 px-6 rounded-DEFAULT flex items-center justify-center gap-3 glow-button disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[#0A0A0B]">
                  {authMode === 'register' ? 'person_add' : 'login'}
                </span>
                <span>
                  {signing
                    ? 'Đang xử lý…'
                    : authMode === 'register'
                      ? 'Tạo tài khoản'
                      : 'Đăng nhập'}
                </span>
              </button>
            </form>

            {/* Lỗi */}
            {error && (
              <p className="w-full -mt-4 text-center font-label-sm text-label-sm text-error">
                {error}
              </p>
            )}

            {/* Divider */}
            <div className="w-full flex items-center gap-4 py-2">
              <div className="flex-1 h-[1px] bg-outline-variant/50" />
              <span className="font-label-sm text-label-sm text-outline-variant">
                HOẶC
              </span>
              <div className="flex-1 h-[1px] bg-outline-variant/50" />
            </div>

            {/* Primary action: connect → sign */}
            <button
              onClick={handlePrimary}
              disabled={connecting || signing}
              className="w-full border border-surface-tint text-surface-tint font-button text-button py-3 px-6 rounded-DEFAULT flex items-center justify-center gap-3 hover:bg-surface-tint/10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined fill text-surface-tint">
                {connected ? 'verified_user' : 'account_balance_wallet'}
              </span>
              <span>{connecting ? 'Connecting…' : primaryLabel}</span>
            </button>

            {/* Trạng thái ví đã connect */}
            {connected && shortAddr && (
              <div className="w-full -mt-4 text-center font-label-sm text-label-sm text-on-surface-variant">
                {wallet?.adapter?.name ? `${wallet.adapter.name} · ` : ''}
                {shortAddr}
              </div>
            )}

            {/* Guest (chưa nối backend — demo) */}
            <button
              onClick={() => onAuthed?.({ guest: true })}
              className="w-full border border-surface-tint text-surface-tint font-button text-button py-3 px-6 rounded-DEFAULT flex items-center justify-center gap-3 hover:bg-surface-tint/10 transition-colors"
            >
              <span>Explore as Guest</span>
              <span className="material-symbols-outlined text-surface-tint">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {/* Footer status */}
        <div className="mt-8 text-center flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-surface-tint animate-pulse drop-shadow-[0_0_5px_rgba(0,219,231,0.8)]" />
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            NODE: SECURE / CLUSTER: DEVNET
          </span>
        </div>
      </main>
    </div>
  );
}
