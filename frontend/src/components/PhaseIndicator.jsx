/**
 * src/components/PhaseIndicator.jsx
 * ─────────────────────────────────────────────────────────────
 * Nhãn pha hiện tại (mockup Night ~592 "The Void / System Active",
 * Day header ~3026 "Village Square / Day 3").
 */
import { PHASE } from '../lib/contracts.js';

// daytime: pha diễn ra ban NGÀY (để chọn icon mặt trời/mặt trăng + nhãn VN).
const META = {
  [PHASE.LOBBY]: { title: 'The Lobby', icon: 'meeting_room', daytime: true },
  [PHASE.ASSIGN_ROLES]: { title: 'Role Assignment', icon: 'badge', daytime: true },
  [PHASE.NIGHT]: { title: 'The Void', icon: 'dark_mode', daytime: false },
  [PHASE.DAY_ANNOUNCE]: { title: 'Daybreak', icon: 'wb_sunny', daytime: true },
  [PHASE.DAY_DISCUSS]: { title: 'Village Square', icon: 'forum', daytime: true },
  [PHASE.VOTE]: { title: 'The Reckoning', icon: 'how_to_vote', daytime: true },
  [PHASE.CHECK_WIN]: { title: 'Resolving', icon: 'balance', daytime: true },
  [PHASE.GAME_OVER]: { title: 'Game Over', icon: 'flag', daytime: true },
};

/**
 * @param {string} phase   pha hiện tại
 * @param {number} cycle   số đêm/ngày (1,2,3…)
 * @param {number} alive   số người còn sống (optional)
 * @param {number} total   tổng số người chơi (optional)
 */
export default function PhaseIndicator({ phase, cycle, alive, total }) {
  const meta = META[phase] || { title: phase, icon: 'circle', daytime: true };
  const isDay = meta.daytime;
  const dayNo = cycle != null ? Math.max(1, cycle) : null;

  return (
    <div>
      <h2 className="font-headline-md text-headline-md text-on-surface opacity-60 tracking-widest uppercase flex items-center gap-2">
        <span className="material-symbols-outlined text-surface-tint">{meta.icon}</span>
        {meta.title}
      </h2>

      {/* Hàng trạng thái: Sáng/Đêm + Ngày thứ mấy + Người còn sống */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        {/* Sáng / Đêm */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-label-sm text-label-sm uppercase tracking-widest ${
            isDay
              ? 'border-primary-fixed/50 text-primary-fixed bg-primary-fixed/10'
              : 'border-surface-tint/40 text-surface-tint bg-surface-tint/10'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {isDay ? 'light_mode' : 'bedtime'}
          </span>
          {isDay ? 'Ban ngày' : 'Ban đêm'}
        </span>

        {/* Ngày thứ mấy */}
        {dayNo != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
            {isDay ? `Ngày ${dayNo}` : `Đêm ${dayNo}`}
          </span>
        )}

        {/* Người còn sống */}
        {alive != null && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-outline-variant/40 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-widest tabular-nums">
            <span className="material-symbols-outlined text-[14px]">group</span>
            {alive}{total != null ? `/${total}` : ''} còn sống
          </span>
        )}
      </div>
    </div>
  );
}
