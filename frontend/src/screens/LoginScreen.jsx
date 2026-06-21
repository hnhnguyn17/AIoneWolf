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
import { useEffect } from 'react';
import { useWallet, useWalletModal } from '../lib/wallet.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function LoginScreen({ onAuthed }) {
  const { publicKey, connecting, connected, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { login, status, error, isAuthed } = useAuth();

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

  const primaryLabel = !connected
    ? 'Connect Phantom Wallet'
    : signing
      ? 'Awaiting signature…'
      : 'Sign in to the Abyss';

  return (
    <div className="bg-[#0A0A0B] text-on-surface font-body-md min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Nền rừng forest.png full-screen + PHỦ ĐEN ĐẬM cho card nổi */}
      <div className="forest-bg" />
      <div className="forest-overlay-login" />

      {/* Scanline overlay */}
      <div className="scanlines" />

      <main className="relative z-20 w-full max-w-md px-margin-mobile md:px-0">
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
                {connected
                  ? 'Wallet linked. Sign to authenticate.'
                  : 'Initialize connection sequence.'}
              </p>
            </div>

            {/* Primary action: connect → sign */}
            <button
              onClick={handlePrimary}
              disabled={connecting || signing}
              className="w-full bg-surface-tint text-[#0A0A0B] font-button text-button py-4 px-6 rounded-DEFAULT flex items-center justify-center gap-3 glow-button pulse-anim group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined fill text-[#0A0A0B]">
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
                OR
              </span>
              <div className="flex-1 h-[1px] bg-outline-variant/50" />
            </div>

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
