/**
 * src/components/WorldChannel.jsx
 * ─────────────────────────────────────────────────────────────
 * "Kênh Thế Giới" — modal danh sách phòng CÔNG KHAI ĐANG CHỜ người.
 * Chỉ hiện phòng còn nhận người (status WAITING & chưa đầy); phòng đang chơi
 * (PLAYING) được ẩn vì game cần đủ người mới chạy và không cho vào giữa chừng.
 * Hover 1 phòng để xem cấu hình vai. Bấm "Vào" để tham gia phòng đó.
 *
 * Lấy phòng THẬT từ GET /rooms/public; nếu lỗi mạng → fallback DATA CỨNG.
 */
import { useEffect, useState } from 'react';
import { ROLE_META } from '../lib/roleCatalog.js';
import { BACKEND_URL } from '../lib/api.js';

// ── Fallback data cứng (khi backend lỗi) — vài phòng đang chờ ──
const FALLBACK_ROOMS = [
  { code: 'ABYS', status: 'WAITING', phase: 'LOBBY', playerCount: 4, maxPlayers: 8,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, VILLAGER: 4 } },
  { code: 'MOON', status: 'WAITING', phase: 'LOBBY', playerCount: 2, maxPlayers: 6,
    roles: { WEREWOLF: 1, SEER: 1, VILLAGER: 4 } },
  { code: 'HOWL', status: 'WAITING', phase: 'LOBBY', playerCount: 6, maxPlayers: 10,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, WITCH: 1, VILLAGER: 5 } },
  { code: 'CURS', status: 'WAITING', phase: 'LOBBY', playerCount: 1, maxPlayers: 8,
    roles: { WEREWOLF: 2, SEER: 1, GUARD: 1, VILLAGER: 4 } },
];

/** Chỉ giữ phòng còn nhận người: đang chờ và chưa đầy. */
function joinable(rooms) {
  return (rooms || []).filter(
    (r) => r.status === 'WAITING' && (r.playerCount ?? 0) < (r.maxPlayers ?? 0),
  );
}

export default function WorldChannel({ open, onClose, onJoin }) {
  const [hover, setHover] = useState(null);
  const [rooms, setRooms] = useState(FALLBACK_ROOMS);

  // Mỗi lần mở modal → tải phòng thật. Lỗi thì giữ fallback.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms/public`);
        if (!res.ok) return;
        const j = await res.json();
        if (alive && Array.isArray(j?.rooms) && j.rooms.length) setRooms(j.rooms);
      } catch {
        /* giữ fallback */
      }
    })();
    return () => { alive = false; };
  }, [open]);

  if (!open) return null;

  const list = joinable(rooms);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] glass-panel rounded-xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-surface-tint text-[26px]">public</span>
            <div>
              <h2 className="font-display-lg text-[24px] text-surface-tint tracking-tight">Kênh Thế Giới</h2>
              <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
                {list.length} phòng đang chờ · di chuột để xem vai
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>

        {/* List */}
        <div className="overflow-y-auto p-4 flex flex-col gap-2">
          {list.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-[40px] opacity-40">nights_stay</span>
              <p className="font-label-sm text-[12px] uppercase tracking-widest">
                Chưa có phòng nào đang chờ — hãy tạo phòng mới.
              </p>
            </div>
          )}
          {list.map((r) => {
            const cnt = r.playerCount ?? 0;
            const max = r.maxPlayers ?? 0;
            const almostFull = max > 0 && cnt >= max - 1;
            const roleCount = r.roles ? Object.values(r.roles).reduce((a, b) => a + b, 0) : 0;
            return (
              <button
                key={r.code}
                type="button"
                onClick={() => onJoin?.(r.code, r)}
                onMouseEnter={() => setHover(r.code)}
                onMouseLeave={() => setHover(null)}
                className="relative flex items-center gap-4 p-3 rounded-lg border border-outline-variant/20 bg-void/40 hover:border-surface-tint/60 hover:bg-surface-tint/5 transition-colors text-left cursor-pointer"
              >
                {/* Mã phòng */}
                <div className="flex flex-col items-center justify-center w-16 shrink-0">
                  <span className="font-headline-md text-[20px] text-surface-tint tracking-[0.2em]">{r.code}</span>
                </div>

                {/* Trạng thái + người */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-label-sm uppercase tracking-widest text-surface-tint border-surface-tint/40 bg-surface-tint/5">
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-tint" />
                      Đang chờ
                    </span>
                    {almostFull && (
                      <span className="px-2 py-0.5 rounded-full border text-[10px] font-label-sm uppercase tracking-widest text-error border-error/40 bg-error/5">
                        Sắp đầy
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-label-sm text-label-sm text-on-surface-variant">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">group</span>
                      {cnt}/{max}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">badge</span>
                      {roleCount} vai
                    </span>
                  </div>

                  {/* Tooltip chi tiết role khi hover */}
                  {hover === r.code && r.roles && (
                    <div className="absolute left-20 top-full mt-1 z-20 w-64 glass-panel rounded-lg p-3 border border-surface-tint/30 shadow-[0_0_20px_rgba(0,219,231,0.25)]">
                      <p className="font-label-sm text-[10px] text-surface-tint uppercase tracking-widest mb-2">Cấu hình vai</p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(r.roles).map(([key, n]) => (
                          <div key={key} className="flex items-center justify-between text-[12px]">
                            <span className="flex items-center gap-1.5 text-on-surface">
                              <span className="material-symbols-outlined text-[14px] text-surface-tint">
                                {ROLE_META[key]?.icon || 'person'}
                              </span>
                              {ROLE_META[key]?.name || key}
                            </span>
                            <span className="text-surface-tint tabular-nums">×{n}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Vào */}
                <span className="shrink-0 border border-surface-tint text-surface-tint font-button text-button px-4 py-2 rounded uppercase tracking-widest group-hover:bg-surface-tint/10 transition-colors pointer-events-none">
                  Vào
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
