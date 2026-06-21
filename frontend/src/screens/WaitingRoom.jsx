import { useEffect, useMemo, useState } from 'react';
import { getSocket, isMock, S2C } from '../lib/socket.js';
import AvatarCircle from '../components/AvatarCircle.jsx';
import DevPanel from '../components/DevPanel.jsx';
import { PLAYER_STATUS } from '../lib/contracts.js';
import {
  ROLE_PACKAGES, ROLE_META, ALL_ROLES, TEAM_COLOR, TEAM_LABEL, balanceTone, roleBalanceScore,
} from '../lib/roleCatalog.js';
import RoleAddPicker from '../components/RoleAddPicker.jsx';
import RolePackagePicker from '../components/RolePackagePicker.jsx';

const SELF_ID = 'p1';

export default function WaitingRoom({ onStart, onLeave }) {
  const socket = useMemo(() => getSocket(), []);
  const [room, setRoom] = useState(() => socket._lastRoomState || null);
  const [roleCounts, setRoleCounts] = useState(() => ({ ...ROLE_PACKAGES[0].counts }));
  const [activePackage, setActivePackage] = useState(ROLE_PACKAGES[0].id);
  const [isCreated, setICreated] = useState(() => socket._isCreated || false);
  const [copied, setCopied] = useState(false);

  const [pkgOpen, setPkgOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    function onRoomState(state) {
      setRoom((cur) => ({ ...(cur || {}), ...state }));
    }
    function onCreated(state) {
      setICreated(true);
      setRoom((cur) => ({ ...(cur || {}), ...state }));
    }
    socket.on(S2C.ROOM_STATE, onRoomState);
    socket.on(S2C.ROOM_CREATED, onCreated);
    if (isMock()) socket._bootstrapLobby?.();
    return () => {
      socket.off(S2C.ROOM_STATE, onRoomState);
      socket.off(S2C.ROOM_CREATED, onCreated);
    };
  }, [socket]);

  const seats = (room?.players || []).map((p, i) => ({
    id: p.id || `seat-${p.seat ?? i + 1}`,
    seat: p.seat ?? i + 1,
    name: p.name || `Player_${i + 1}`,
    avatar: p.avatar,
    wallet: p.wallet,
    self: p.id ? (isMock() ? p.id === SELF_ID : p.id === socket.id) : p.seat === room?.selfSeat,
    status: PLAYER_STATUS.ALIVE,
  }));

  const code = room?.roomCode || room?.code || (isMock() ? 'ABYSS1' : '------');
  const hostSeat = room?.hostSeat ?? 1;
  const isHost = isMock() ? (room?.hostId || SELF_ID) === SELF_ID : isCreated;

  const inviteLink = `http://localhost:3000/?room=${code}`;
  const totalRoles = Object.values(roleCounts).reduce((a, b) => a + b, 0);
  const balanced = totalRoles === seats.length || seats.length === 0;
  const balanceScore = roleBalanceScore(roleCounts);

  const chosen = Object.entries(roleCounts)
    .filter(([, n]) => n > 0)
    .map(([key, n]) => ({ key, n, meta: ROLE_META[key] }))
    .filter((r) => r.meta);

  function copyInvite() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1800); };
    try {
      const p = navigator.clipboard?.writeText(inviteLink);
      if (p?.then) p.then(done, done); else done();
    } catch { done(); }
  }

  function bump(role, delta) {
    if (!isHost) return;
    setActivePackage(null);
    setRoleCounts((prev) => {
      const next = { ...prev, [role]: Math.max(0, (prev[role] || 0) + delta) };
      if (next[role] === 0) delete next[role];
      return next;
    });
  }

  function applyPackage(pkg) {
    if (!isHost) return;
    setActivePackage(pkg.id);
    setRoleCounts({ ...pkg.counts });
    setPkgOpen(false);
  }

  function handleAddRoles(keys) {
    if (!isHost) return;
    setActivePackage(null);
    setRoleCounts((prev) => {
      const next = { ...prev };
      for (const k of keys) {
        next[k] = (next[k] || 0) + 1;
      }
      return next;
    });
    setAddOpen(false);
  }

  function start() {
    onStart?.({ code, roles: roleCounts, players: seats });
  }

  return (
    <div className="min-h-screen w-full text-on-surface relative overflow-hidden">
      <div className="forest-bg" />
      <div className="forest-overlay-night" />
      <div className="scanlines opacity-30" />

      <header className="relative z-10 w-full max-w-[1700px] mx-auto flex justify-between items-center px-margin-mobile md:px-margin-desktop pt-8 md:pt-10">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-button text-button uppercase tracking-widest z-20"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden md:inline">Rời phòng</span>
        </button>
        
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <h1 className="font-display-lg text-[24px] md:text-[40px] text-surface-tint uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(0,219,231,0.5)] whitespace-nowrap">
            Echoes of the Lycan
          </h1>
          <span className="font-label-sm text-[12px] text-on-surface-variant uppercase tracking-[0.3em] mt-1">
            Phòng Chờ
          </span>
        </div>

        <div className="font-label-sm text-[12px] text-on-surface-variant uppercase tracking-widest z-20">
          {isMock() ? 'MODE: MOCK' : isHost ? 'CHỦ PHÒNG' : 'WAITING ROOM'}
        </div>
      </header>

      <main className="relative z-10 w-full max-w-[1700px] mx-auto px-margin-mobile md:px-margin-desktop mt-8 md:mt-12 pb-stack-lg flex flex-col xl:flex-row gap-gutter">
        <aside className="w-full xl:w-64 flex flex-col justify-center gap-gutter shrink-0">
          <div className="glass-panel rounded-xl px-4 py-5 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-surface-tint">tag</span>
              <div>
                <div className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                  Mã phòng
                </div>
                <div className="font-headline-md font-mono text-[22px] text-primary tracking-[0.2em] -mr-[0.2em]">
                  {code}
                </div>
              </div>
            </div>
            <button
              onClick={copyInvite}
              className="flex items-center justify-center gap-2 border border-surface-tint text-surface-tint font-button text-button px-4 py-2 rounded uppercase tracking-widest hover:bg-surface-tint/10 transition-colors w-full"
            >
              <span className="material-symbols-outlined text-[18px]">{copied ? 'check' : 'link'}</span>
              {copied ? 'Đã copy' : 'Copy link mời'}
            </button>
          </div>
        </aside>

        <section className="flex-1 relative flex items-center justify-center min-h-[600px] pt-8 md:pt-12 xl:pl-24">
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

        <aside className="w-full xl:w-[450px] shrink-0 flex flex-col gap-gutter">
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
              {seats.length === 0 && (
                <li className="font-label-sm text-[11px] text-on-surface-variant text-center py-4 uppercase tracking-widest">
                  Chưa có người chơi
                </li>
              )}
              {seats.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 p-2 rounded border border-outline-variant/20 bg-void/40">
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-surface-tint/40 shrink-0">
                    {p.avatar
                      ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-surface-container-high" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-body-md text-on-surface truncate text-[14px]">
                      {p.name}{p.self ? ' (Bạn)' : ''}
                    </div>
                  </div>
                  <span className={`font-label-sm text-[10px] uppercase tracking-widest ${p.seat === hostSeat ? 'text-primary' : 'text-on-surface-variant'}`}>
                    {p.seat === hostSeat ? 'Chủ phòng' : `P${i + 1}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint">badge</span>
                <h3 className="font-headline-md text-[20px] text-on-surface">Vai trò</h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`font-label-sm text-label-sm tracking-widest ${balanced ? 'text-surface-tint' : 'text-error'}`}>
                  {seats.length} / {totalRoles || '—'}
                </span>
                <span className={`font-label-sm text-[10px] uppercase tracking-widest ${balanceTone(balanceScore)}`}>
                  Điểm: {balanceScore > 0 ? `+${balanceScore}` : balanceScore}
                </span>
              </div>
            </div>

            {!isHost && (
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                Chỉ chủ phòng chỉnh được số lượng vai.
              </p>
            )}

            <button
              disabled={!isHost}
              onClick={() => setPkgOpen(true)}
              className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/30 bg-void/30 hover:border-surface-tint/50 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2 text-on-surface">
                <span className="material-symbols-outlined text-[18px]">inventory_2</span>
                <span className="font-button text-button normal-case">Gói đề xuất</span>
              </span>
              <span className="font-label-sm text-[10px] uppercase tracking-widest opacity-80">
                {activePackage ? (ROLE_PACKAGES.find((p) => p.id === activePackage)?.name || 'tuỳ chỉnh') : 'tuỳ chỉnh'}
              </span>
            </button>

            <ul className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
              {chosen.length === 0 && (
                <li className="font-label-sm text-[11px] text-on-surface-variant text-center py-4 uppercase tracking-widest">
                  Chưa có vai — chọn gói hoặc bấm (+)
                </li>
              )}
              {chosen.map(({ key, n, meta }) => (
                <li key={key} className="flex items-center justify-between gap-2 p-2 rounded border border-outline-variant/20 bg-void/30 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <span className={`material-symbols-outlined text-[18px] mt-0.5 ${TEAM_COLOR[meta.team]?.split(' ')[0] || 'text-surface-tint'}`}>
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="font-body-md text-[14px] text-on-surface flex items-center gap-1">
                        {meta.name}
                        {meta.wip && (
                          <span className="font-label-sm text-[8px] px-1 rounded bg-on-tertiary-container/30 text-on-tertiary-container uppercase">beta</span>
                        )}
                      </div>
                      <div className="font-label-sm text-[10px] text-on-surface-variant leading-tight truncate">
                        {TEAM_LABEL[meta.team]} · {(meta.points ?? 0) > 0 ? `+${meta.points}` : meta.points ?? 0} điểm
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button disabled={!isHost} onClick={() => bump(key, -1)}
                      className="w-7 h-7 rounded border border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>
                    <span className="w-5 text-center font-label-sm text-surface-tint tabular-nums">{n}</span>
                    <button disabled={!isHost} onClick={() => bump(key, +1)}
                      className="w-7 h-7 rounded border border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <button disabled={!isHost} onClick={() => setAddOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded border border-dashed border-outline-variant/50 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span className="font-button text-button normal-case">Thêm vai ({ALL_ROLES.length})</span>
                </button>
              </li>
            </ul>
          </div>

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
              <span className="material-symbols-outlined text-[18px] animate-pulse">hourglass_empty</span>
              Chờ chủ phòng bắt đầu…
            </div>
          )}
        </aside>
      </main>

      <RolePackagePicker
        open={pkgOpen}
        packages={ROLE_PACKAGES}
        activeId={activePackage}
        onPick={applyPackage}
        onClose={() => setPkgOpen(false)}
      />
      <RoleAddPicker
        open={addOpen}
        allRoles={ALL_ROLES}
        teamColor={TEAM_COLOR}
        teamLabel={TEAM_LABEL}
        onAdd={handleAddRoles}
        onClose={() => setAddOpen(false)}
      />

      <DevPanel context="waiting" />
    </div>
  );
}
