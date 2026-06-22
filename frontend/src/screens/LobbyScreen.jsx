/**
 * src/screens/LobbyScreen.jsx
 * ─────────────────────────────────────────────────────────────
 * Sảnh chính (kiểu Liên Quân): chỉ có 2 hành động lớn —
 *   - TẠO PHÒNG  → emit C2S.ROOM_CREATE → nhận S2C.ROOM_CREATED → vào WaitingRoom.
 *   - THAM GIA   → nhập mã → emit C2S.ROOM_JOIN → nhận S2C.ROOM_STATE → vào WaitingRoom.
 * Việc xếp người + chỉnh role + bắt đầu nằm ở WaitingRoom.
 *
 * Theme VOIR_ABYSS + nền rừng forest.png (phủ nhẹ). Dùng socket wrapper
 * (mock hoặc thật).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSocket, C2S, S2C } from '../lib/socket.js';
import { useAuth } from '../lib/auth.jsx';
import { WalletButton } from '../components/WalletButton.jsx';
import WorldChannel from '../components/WorldChannel.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';
import { useUserTheme } from '../lib/theme.js';
import { usePWAInstall } from '../lib/usePWAInstall.js';

export default function LobbyScreen({ onEnterWaiting, onOpenProfile }) {
  const { wallet, user } = useAuth();
  const { isInstallable, promptInstall } = usePWAInstall();
  const { isDay } = useUserTheme();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null); // 'create' | 'join' | null
  const [worldOpen, setWorldOpen] = useState(false);
  const navigated = useRef(false);

  const socket = useMemo(() => getSocket(), []);

  // Nếu mở bằng link mời (?room=MÃ) → điền sẵn mã để tham gia nhanh.
  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('room');
      if (fromUrl) setCode(fromUrl.toUpperCase());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    function go() {
      if (navigated.current) return;
      navigated.current = true;
      setPending(null);
      onEnterWaiting?.();
    }
    function onCreated(state) {
      socket._isCreated = true;
      if (state) socket._lastRoomState = { ...(socket._lastRoomState || {}), ...state };
      go(); // TẠO PHÒNG xong → vào phòng chờ.
    }
    function onRoomState(state) {
      if (state) socket._lastRoomState = { ...(socket._lastRoomState || {}), ...state };
      // THAM GIA: nhận room:state sau khi bấm Join → vào phòng chờ.
      if (pending === 'join') go();
    }
    function onError(e) {
      setPending(null);
      setError(e?.error || e?.message || 'Lỗi không xác định');
    }
    socket.on(S2C.ROOM_CREATED, onCreated);
    socket.on(S2C.ROOM_STATE, onRoomState);
    socket.on(S2C.ERROR, onError);

    return () => {
      socket.off(S2C.ROOM_CREATED, onCreated);
      socket.off(S2C.ROOM_STATE, onRoomState);
      socket.off(S2C.ERROR, onError);
    };
  }, [socket, pending, onEnterWaiting]);

  function createRoom() {
    setError(null);
    setPending('create');
    socket.emit(C2S.ROOM_CREATE, { wallet });
  }
  function joinRoom() {
    const c = code.trim().toUpperCase();
    if (!c) return setError('Nhập mã phòng trước đã.');
    setError(null);
    setPending('join');
    socket.emit(C2S.ROOM_JOIN, { code: c, wallet });
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center relative overflow-hidden">
      {/* Nền rừng cố định + phủ theo theme NGƯỜI DÙNG chọn (sáng/tối) */}
      <div className="forest-bg" />
      <div className={isDay ? 'forest-overlay-day' : 'forest-overlay-night'} />
      <div className="scanlines opacity-20" />

      <div className="relative z-10 w-full flex flex-col items-center p-margin-mobile md:px-margin-desktop md:py-stack-lg min-h-screen">
        {/* Top bar */}
        <header className="w-full max-w-container-max flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-surface-tint text-[28px] drop-shadow-[0_0_8px_rgba(0,219,231,0.6)]">
              dark_mode
            </span>
            <span className="font-display-lg text-[22px] text-surface-tint tracking-tighter uppercase hidden sm:inline">
              Echoes of the Lycan
            </span>
          </div>
          <div className="flex items-center gap-stack-md">
            {/* Toggle sáng/tối — chỉ áp cho NGOÀI game (theo người dùng) */}
            <ThemeToggle />
            {/* Nút Profile — hiện tên tài khoản (ví rút gọn) hoặc Guest */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-outline-variant/40 bg-surface-container/40 text-on-surface hover:border-surface-tint/60 transition-colors"
            >
              <span className="material-symbols-outlined text-surface-tint text-[20px]">account_circle</span>
              <span className="font-button text-button normal-case">
                {user?.name ? user.name : (wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : 'Guest')}
              </span>
            </button>
            <WalletButton>{user?.name}</WalletButton>
          </div>
        </header>

        {/* HERO — tên game lớn + tagline */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-stack-lg">
          <h1
            className={`font-display-lg text-[15vw] md:text-[110px] leading-[0.9] tracking-tighter uppercase ${
              isDay
                ? 'text-[#06414b] drop-shadow-[0_2px_10px_rgba(255,255,255,0.45)]'
                : 'text-surface-tint drop-shadow-[0_0_30px_rgba(0,219,231,0.45)]'
            }`}
          >
            Echoes
            <span
              className={`block text-[8vw] md:text-[56px] tracking-[0.2em] mt-1 ${
                isDay ? 'text-[#08323a]' : 'text-on-surface'
              }`}
            >
              of the Lycan
            </span>
          </h1>
          <p className="mt-6 max-w-xl font-body-md text-body-md text-on-surface-variant">
            Trò chơi Ma Sói thời gian thực — giọng nói qua{' '}
            <span className="text-surface-tint">Agora</span>, danh tính &amp; phần thưởng on-chain qua{' '}
            <span className="text-surface-tint">Solana</span>. Quản trò là AI điều phối từng đêm.
          </p>

          {/* Hàng "tính năng" nhỏ cho đẹp */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {[
              { icon: 'mic', label: 'Voice realtime' },
              { icon: 'smart_toy', label: 'AI Quản trò' },
              { icon: 'account_balance_wallet', label: 'Login bằng ví' },
              { icon: 'military_tech', label: 'NFT & ELO' },
            ].map((f) => (
              <span
                key={f.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-outline-variant/30 bg-surface-container/30 font-label-sm text-label-sm text-on-surface-variant"
              >
                <span className="material-symbols-outlined text-surface-tint text-[16px]">{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* PANEL Tạo / Tham gia */}
        <main className="w-full max-w-4xl xl:max-w-5xl px-4 md:px-0 flex flex-col gap-4">
          
          {isInstallable && (
            <div className="glass-panel p-4 rounded-xl flex items-center justify-between border-surface-tint/40 glow-cyan">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-surface-tint text-3xl">download</span>
                <div>
                  <h3 className="font-button text-on-surface text-[16px]">Cài đặt App</h3>
                  <p className="font-body-md text-on-surface-variant text-sm hidden md:block">
                    Cài đặt Echoes of the Lycan vào màn hình chính để chơi toàn màn hình mượt mà hơn.
                  </p>
                </div>
              </div>
              <button
                onClick={promptInstall}
                className="bg-surface-tint text-void font-button px-5 py-2.5 rounded hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                Cài đặt ngay
              </button>
            </div>
          )}

          <section className="glass-panel rounded-xl p-6 md:p-8 grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Tạo phòng */}
            <div className="flex flex-col gap-4">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint">add_circle</span>
                Tạo phòng
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant flex-1">
                Mở phòng mới, nhận mã và mời đồng đội vào.
              </p>
              <button
                onClick={createRoom}
                disabled={pending === 'create'}
                className="w-full bg-primary text-on-primary font-button text-button py-4 rounded uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait"
              >
                {pending === 'create' ? 'Đang tạo…' : 'Tạo phòng'}
              </button>
            </div>

            {/* Tham gia */}
            <div className="flex flex-col gap-4 md:border-l border-outline-variant/30 md:pl-8">
              <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint">login</span>
                Tham gia
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant flex-1">
                Nhập mã phòng được mời để vào.
              </p>
              {/* input + nút: input co giãn, nút giữ kích thước (shrink-0) → không bị tràn */}
              <div className="flex gap-2 w-full">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && code.trim() && joinRoom()}
                  placeholder="ABYSS1"
                  maxLength={8}
                  className="min-w-0 flex-1 bg-surface-container/50 border border-outline-variant/50 rounded px-4 py-3 text-on-surface font-label-sm tracking-[0.3em] uppercase placeholder:text-outline-variant/50 focus:ring-0 focus:border-surface-tint/60 outline-none"
                />
                <button
                  onClick={joinRoom}
                  disabled={pending === 'join' || !code.trim()}
                  className="shrink-0 border border-surface-tint text-surface-tint font-button text-button px-5 rounded uppercase tracking-widest hover:bg-surface-tint/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  {pending === 'join' ? '…' : 'Tham gia'}
                </button>
              </div>

              {/* Kênh Thế Giới — duyệt phòng công khai đang chờ người */}
              <button
                onClick={() => setWorldOpen(true)}
                className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2.5 rounded border border-dashed border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors"
              >
                <span className="material-symbols-outlined text-surface-tint text-[18px]">public</span>
                <span className="font-button text-button normal-case">Duyệt Kênh Thế Giới</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </section>

          {error && (
            <p className="font-label-sm text-label-sm text-error text-center">{error}</p>
          )}

          <footer className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 rounded-full bg-surface-tint animate-pulse" />
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
              NODE: SECURE / CLUSTER: DEVNET
            </span>
          </footer>
        </main>
      </div>

      {/* Modal Kênh Thế Giới — list phòng công khai (data cứng) */}
      <WorldChannel
        open={worldOpen}
        onClose={() => setWorldOpen(false)}
        onJoin={(roomCode) => {
          setWorldOpen(false);
          setCode(roomCode);
          setPending('join');
          socket.emit(C2S.ROOM_JOIN, { code: roomCode, wallet });
        }}
      />
    </div>
  );
}
