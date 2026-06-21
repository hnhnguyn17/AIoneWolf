/**
 * src/components/RoleAddPicker.jsx
 * ─────────────────────────────────────────────────────────────
 * Box multi-select THÊM VAI. Bấm dấu (+) dưới list vai → mở box này:
 *   - Thanh tìm kiếm lọc theo tên (substring, bỏ dấu tiếng Việt).
 *   - Multi-click toggle nhiều vai; hiện check khi chọn.
 *   - Lấy danh sách từ allRoles (ALL_ROLES — mảng phẳng mọi vai).
 *   - Hiện icon + name + màu team (TEAM_COLOR) + badge beta nếu wip.
 *   - Nút "Thêm" → onAdd(keys[]) (cha +1 mỗi vai).
 *
 * Props:
 *   open       : boolean
 *   allRoles   : [{ key, name, team, icon, wip, desc }]
 *   teamColor  : TEAM_COLOR map (team -> "text-... border-...")
 *   teamLabel  : TEAM_LABEL map (team -> tên VN) — optional
 *   onAdd(keys)
 *   onClose()
 */
import { useMemo, useState } from 'react';

/** Bỏ dấu tiếng Việt + lowercase để search dễ chịu hơn. */
function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');
}

export default function RoleAddPicker({
  open,
  allRoles = [],
  teamColor = {},
  teamLabel = {},
  onAdd,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(() => new Set());

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return allRoles;
    return allRoles.filter((r) => norm(r.name).includes(q) || norm(r.key).includes(q));
  }, [allRoles, query]);

  if (!open) return null;

  function toggle(key) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function confirm() {
    const keys = Array.from(picked);
    if (keys.length) onAdd?.(keys);
    setPicked(new Set());
    setQuery('');
    onClose?.();
  }

  function close() {
    setPicked(new Set());
    setQuery('');
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={close}>
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />
      <div
        className="glass-panel relative z-10 w-full max-w-6xl rounded-2xl p-6 flex flex-col gap-4 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-surface-tint text-[28px]">add_circle</span>
            <h3 className="font-headline-md text-[28px] text-on-surface">Thêm vai</h3>
          </div>
          <button
            onClick={close}
            className="w-10 h-10 rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[24px]">close</span>
          </button>
        </div>

        {/* Thanh tìm kiếm */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-outline-variant/30 bg-void/40">
          <span className="material-symbols-outlined text-[24px] text-on-surface-variant">search</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm vai theo tên…"
            className="flex-1 bg-transparent outline-none font-body-md text-[18px] text-on-surface placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="material-symbols-outlined text-[20px] text-on-surface-variant hover:text-surface-tint"
            >
              close
            </button>
          )}
        </div>

        {/* List vai (multi-select) */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-2 min-h-[120px] content-start">
          {filtered.length === 0 && (
            <li className="font-label-sm text-[13px] text-on-surface-variant text-center py-6 uppercase tracking-widest">
              Không tìm thấy vai phù hợp
            </li>
          )}
          {filtered.map((r) => {
            const on = picked.has(r.key);
            const color = (teamColor[r.team] || '').split(' ')[0] || 'text-surface-tint';
            return (
              <li key={r.key}>
                <button
                  onClick={() => toggle(r.key)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    on
                      ? 'border-surface-tint bg-surface-tint/10'
                      : 'border-outline-variant/20 bg-void/30 hover:border-surface-tint/40'
                  }`}
                >
                  <span
                    className={`w-7 h-7 shrink-0 rounded border flex items-center justify-center ${
                      on ? 'border-surface-tint bg-surface-tint/20' : 'border-outline-variant/50'
                    }`}
                  >
                    {on && (
                      <span className="material-symbols-outlined text-[20px] text-surface-tint">check</span>
                    )}
                  </span>
                  <span className={`material-symbols-outlined text-[28px] ${color}`}>{r.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-body-md text-[18px] text-on-surface flex items-center gap-2">
                      {r.name}
                      {r.wip && (
                        <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-on-tertiary-container/30 text-on-tertiary-container uppercase">
                          beta
                        </span>
                      )}
                    </div>
                    {(teamLabel[r.team] || r.desc) && (
                      <div className="font-label-sm text-[14px] text-on-surface-variant leading-tight mt-1 truncate">
                        {teamLabel[r.team] ? `${teamLabel[r.team]} · ` : ''}
                        {r.desc}
                      </div>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-3">
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest">
            Đã chọn {picked.size}
          </span>
          <button
            onClick={confirm}
            disabled={picked.size === 0}
            className="bg-primary text-on-primary font-button text-button px-5 py-2 rounded uppercase tracking-widest hover:shadow-[0_0_18px_rgba(0,242,255,0.6)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Thêm
          </button>
        </div>
      </div>
    </div>
  );
}
