/**
 * src/screens/WaitingRoom.jsx
 * ─────────────────────────────────────────────────────────────
 * Phòng chờ kiểu Liên Quân (lobby trước trận):
 *   - VÒNG TRÒN avatar người chơi (AvatarCircle) quanh tâm "Vực Thẳm".
 *   - Mã phòng + nút copy LINK MỜI (http://localhost:3000/?room=MÃ) và nút
 *     "Mời kênh Thế Giới" (giả lập).
 *   - Danh sách người chơi (host được đánh dấu).
 *   - Ô chỉnh SỐ LƯỢNG từng ROLE — mặc định theo ROLE_PRESETS theo số người;
 *     CHỦ PHÒNG sửa được (+/-), người thường chỉ xem.
 *   - Nút "BẮT ĐẦU" CHỈ chủ phòng thấy → emit C2S.GAME_START.
 *
 * Nghe S2C.ROOM_STATE / ROOM_CREATED để cập nhật danh sách + xác định host.
 * Ở chế độ MOCK, mockServer phát room:created → room:state nên vào là thấy ngay.
 */
import { useEffect, useMemo, useState } from 'react';
import { getSocket, isMock, C2S, S2C } from '../lib/socket.js';
import AvatarCircle from '../components/AvatarCircle.jsx';
import DevPanel from '../components/DevPanel.jsx';
import { ROLE, ROLE_LABEL, ROLE_PRESETS, PLAYER_STATUS } from '../lib/contracts.js';
import { ROLE_CATALOG, ROLE_PACKAGES, ROLE_META, TEAM_COLOR } from '../lib/roleCatalog.js';

const SELF_ID = 'p1'; // ở mock, "self" là p1 (khớp mockServer).
const ALL_ROLES = [ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.WITCH, ROLE.VILLAGER];

/** Đếm số lượng mỗi role từ preset theo số người chơi (clamp 4..8). */
function presetCounts(playerCount) {
  const keys = Object.keys(ROLE_PRESETS).map(Number);
  const min = Math.min(...keys);
  const max = Math.max(...keys);
  const n = Math.max(min, Math.min(max, playerCount || 6));
  const preset = ROLE_PRESETS[n] || ROLE_PRESETS[6];
  const counts = {};
  for (const r of ALL_ROLES) counts[r] = 0;
  for (const r of preset) counts[r] = (counts[r] || 0) + 1;
  return counts;
}

export default function WaitingRoom({ onStart, onLeave }) {
  const socket = useMemo(() => getSocket(), []);
  const [room, setRoom] = useState(null); // { code, players, hostId }
  const [roleCounts, setRoleCounts] = useState(() => presetCounts(6));
  const [touchedRoles, setTouchedRoles] = useState(false);
  const [copied, setCopied] = useState(false);
  const [worldInvited, setWorldInvited] = useState(false);
  const [roleTab, setRoleTab] = useState('basic'); // 'basic' | 'advanced'
  const [activePackage, setActivePackage] = useState(null);

  useEffect(() => {
    function onRoomState(state) {
      setRoom(state);
      // Khi chủ phòng CHƯA chỉnh tay → đồng bộ role theo số người hiện tại.
      if (!touchedRoles && Array.isArray(state?.players)) {
        setRoleCounts(presetCounts(state.players.length));
      }
    }
    function onCreated(state) {
      // room:created — đảm bảo có room ngay cả khi room:state tới sau.
      setRoom((cur) => ({ ...(cur || {}), ...state }));
    }
    socket.on(S2C.ROOM_STATE, onRoomState);
    socket.on(S2C.ROOM_CREATED, onCreated);

    // Mock: bơm lobby state để vào là thấy người chơi.
    if (isMock()) socket._bootstrapLobby?.();

    return () => {
      socket.off(S2C.ROOM_STATE, onRoomState);
      socket.off(S2C.ROOM_CREATED, onCreated);
    };
  }, [socket, touchedRoles]);

  const seats = (room?.players || []).map((p) => ({
    ...p,
    status: PLAYER_STATUS.ALIVE,
  }));
  const code = room?.code || (isMock() ? 'ABYSS1' : '------');
  const hostId = room?.hostId || SELF_ID;
  const isHost = hostId === SELF_ID;

  const inviteLink = `http://localhost:3000/?room=${code}`;
  const totalRoles = Object.values(roleCounts).reduce((a, b) => a + b, 0);

  function copyInvite() {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    try {
      const p = navigator.clipboard?.writeText(inviteLink);
      if (p?.then) p.then(done, done);
      else done();
    } catch {
      done();
    }
  }

  function inviteWorld() {
    // Giả lập: gọi kênh thế giới (sau này nối backend / chat global).
    setWorldInvited(true);
    setTimeout(() => setWorldInvited(false), 2200);
    // eslint-disable-next-line no-console
    console.log('%c[world-invite]', 'color:#7318ff', inviteLink);
  }

  function bump(role, delta) {
    if (!isHost) return;
    setTouchedRoles(true);
    setActivePackage(null); // chỉnh tay → bỏ đánh dấu gói
    setRoleCounts((prev) => ({
      ...prev,
      [role]: Math.max(0, (prev[role] || 0) + delta),
    }));
  }

  /** Áp 1 gói đề xuất → set thẳng roleCounts. */
  function applyPackage(pkg) {
    if (!isHost) return;
    setTouchedRoles(true);
    setActivePackage(pkg.id);
    setRoleCounts({ ...pkg.counts });
  }

  function start() {
    // Gửi cấu hình role kèm theo (backend thật có thể dùng); mock chỉ cần event.
    socket.emit(C2S.GAME_START, { code, roles: roleCounts });
    onStart?.();
  }

  return (
    <div className="min-h-screen w-full text-on-surface relative overflow-hidden">
      {/* Nền rừng cố định + phủ tối */}
      <div className="forest-bg" />
      <div className="forest-overlay-night" />
      <div className="scanlines opacity-30" />

      {/* Top bar */}
      <header className="relative z-10 w-full max-w-container-max mx-auto flex justify-between items-center p-margin-mobile md:px-margin-desktop md:py-stack-lg">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-button text-button uppercase tracking-widest"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden md:inline">Rời phòng</span>
        </button>
        <h1 className="font-display-lg-mobile text-primary uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(0,219,231,0.5)]">
          VOIR_ABYSS
        </h1>
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
          {isMock() ? 'MODE: MOCK' : 'WAITING ROOM'}
        </div>
      </header>

      <main className="relative z-10 w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-stack-lg flex flex-col xl:flex-row gap-gutter">
        {/* LEFT: Vòng tròn avatar */}
        <section className="flex-1 flex flex-col items-center">
          {/* Mã phòng + mời */}
          <div className="glass-panel rounded-xl px-6 py-4 mb-6 flex flex-col sm:flex-row items-center gap-4 w-full max-w-xl">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-surface-tint">tag</span>
              <div>
                <div className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Mã phòng
                </div>
                <div className="font-headline-md text-[26px] text-primary tracking-[0.3em]">
                  {code}
                </div>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                onClick={copyInvite}
                className="flex items-center gap-2 border border-surface-tint text-surface-tint font-button text-button px-4 py-2 rounded uppercase tracking-widest hover:bg-surface-tint/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {copied ? 'check' : 'link'}
                </span>
                {copied ? 'Đã copy' : 'Copy link mời'}
              </button>
              <button
                onClick={inviteWorld}
                className="flex items-center gap-2 border border-on-tertiary-container/60 text-on-tertiary-container font-button text-button px-4 py-2 rounded uppercase tracking-widest hover:bg-on-tertiary-container/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">public</span>
                {worldInvited ? 'Đã gửi' : 'Kênh thế giới'}
              </button>
            </div>
          </div>

          {/* Vòng tròn — tổng ghế = số role cấu hình (totalRoles); ghế dư = chờ người */}
          <AvatarCircle
            players={seats}
            seats={totalRoles}
            center={
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="material-symbols-outlined text-surface-tint text-4xl animate-pulse">
                  hourglass_top
                </span>
                <span className="font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
                  Chờ người chơi
                </span>
                <span className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                  {seats.length} / {totalRoles}
                </span>
              </div>
            }
          />
        </section>

        {/* RIGHT: danh sách + role config + start */}
        <aside className="w-full xl:w-96 flex flex-col gap-gutter">
          {/* Danh sách người chơi */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint">group</span>
                <h3 className="font-headline-md text-[20px] text-on-surface">Người chơi</h3>
              </div>
              <span className="font-label-sm text-label-sm text-surface-tint tracking-widest">
                {seats.length} ONLINE
              </span>
            </div>
            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
              {seats.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-2 rounded border border-outline-variant/20 bg-void/40"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-surface-tint/40 shrink-0">
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-surface-container-high" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body-md text-on-surface truncate text-[14px]">
                      {p.name}
                      {p.self ? ' (Bạn)' : ''}
                    </div>
                  </div>
                  <span
                    className={`font-label-sm text-[10px] uppercase tracking-widest ${
                      hostId === p.id ? 'text-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    {hostId === p.id ? 'Chủ phòng' : `P${i + 1}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Cấu hình role */}
          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint">badge</span>
                <h3 className="font-headline-md text-[20px] text-on-surface">Vai trò</h3>
              </div>
              <span
                className={`font-label-sm text-label-sm tracking-widest ${
                  totalRoles === seats.length || seats.length === 0
                    ? 'text-surface-tint'
                    : 'text-error'
                }`}
              >
                {totalRoles} / {seats.length || '—'}
              </span>
            </div>
            {!isHost && (
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                Chỉ chủ phòng chỉnh được số lượng vai.
              </p>
            )}

            {/* GÓI ĐỀ XUẤT — chọn nhanh */}
            <div>
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">
                Gói đề xuất
              </p>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    disabled={!isHost}
                    onClick={() => applyPackage(pkg)}
                    title={pkg.desc}
                    className={`text-left p-2 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      activePackage === pkg.id
                        ? 'border-surface-tint bg-surface-tint/10 text-surface-tint'
                        : 'border-outline-variant/30 bg-void/30 text-on-surface-variant hover:border-surface-tint/50'
                    }`}
                  >
                    <div className="font-body-md text-[13px] text-on-surface">{pkg.name}</div>
                    <div className="font-label-sm text-[10px] opacity-80 leading-tight mt-0.5">
                      {pkg.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* TABS: Cơ bản / Nâng cao */}
            <div className="flex gap-1 border-b border-outline-variant/30 mt-1">
              {[
                { id: 'basic', label: 'Cơ bản' },
                { id: 'advanced', label: 'Nâng cao' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRoleTab(t.id)}
                  className={`px-3 py-1.5 font-label-sm text-label-sm uppercase tracking-widest border-b-2 -mb-px transition-colors ${
                    roleTab === t.id
                      ? 'border-surface-tint text-surface-tint'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* DANH SÁCH ROLE theo tab */}
            <ul className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
              {ROLE_CATALOG[roleTab].map((r) => (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-2 p-2 rounded border border-outline-variant/20 bg-void/30"
                >
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${TEAM_COLOR[r.team]?.split(' ')[0] || 'text-surface-tint'}`}>
                      {r.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-body-md text-[14px] text-on-surface flex items-center gap-1">
                        {r.name}
                        {r.wip && (
                          <span className="font-label-sm text-[8px] px-1 rounded bg-on-tertiary-container/30 text-on-tertiary-container uppercase">
                            beta
                          </span>
                        )}
                      </div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant leading-tight">
                        {r.desc}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      disabled={!isHost}
                      onClick={() => bump(r.key, -1)}
                      className="w-7 h-7 rounded border border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-5 text-center font-label-sm text-surface-tint tabular-nums">
                      {roleCounts[r.key] || 0}
                    </span>
                    <button
                      disabled={!isHost}
                      onClick={() => bump(r.key, +1)}
                      className="w-7 h-7 rounded border border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Bắt đầu — CHỈ chủ phòng */}
          {isHost ? (
            <button
              onClick={start}
              className="w-full bg-primary text-on-primary font-button text-button py-4 rounded uppercase tracking-[0.2em] hover:shadow-[0_0_25px_rgba(0,242,255,0.7)] transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined fill">bolt</span>
              Bắt đầu
            </button>
          ) : (
            <div className="w-full py-4 rounded border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest text-center flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px] animate-pulse">
                hourglass_empty
              </span>
              Chờ chủ phòng bắt đầu…
            </div>
          )}
        </aside>
      </main>

      {/* DEV: fill bots + skip (chỉ hiện ở môi trường dev) */}
      <DevPanel context="waiting" />
    </div>
  );
}
