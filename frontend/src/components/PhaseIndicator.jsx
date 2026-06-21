/**
 * src/components/PhaseIndicator.jsx
 * ─────────────────────────────────────────────────────────────
 * Nhãn pha hiện tại (mockup Night ~592 "The Void / System Active",
 * Day header ~3026 "Village Square / Day 3").
 */
import { PHASE } from '../lib/contracts.js';

const META = {
  [PHASE.LOBBY]: { title: 'The Lobby', icon: 'meeting_room', tone: 'cyan' },
  [PHASE.ASSIGN_ROLES]: { title: 'Role Assignment', icon: 'badge', tone: 'cyan' },
  [PHASE.NIGHT]: { title: 'The Void', icon: 'dark_mode', tone: 'cyan' },
  [PHASE.DAY_ANNOUNCE]: { title: 'Daybreak', icon: 'wb_sunny', tone: 'day' },
  [PHASE.DAY_DISCUSS]: { title: 'Village Square', icon: 'forum', tone: 'day' },
  [PHASE.VOTE]: { title: 'The Reckoning', icon: 'how_to_vote', tone: 'alert' },
  [PHASE.CHECK_WIN]: { title: 'Resolving', icon: 'balance', tone: 'cyan' },
  [PHASE.GAME_OVER]: { title: 'Game Over', icon: 'flag', tone: 'alert' },
};

export default function PhaseIndicator({ phase, cycle }) {
  const meta = META[phase] || { title: phase, icon: 'circle', tone: 'cyan' };
  return (
    <div>
      <h2 className="font-headline-md text-headline-md text-on-surface opacity-60 tracking-widest uppercase flex items-center gap-2">
        <span className="material-symbols-outlined text-surface-tint">{meta.icon}</span>
        {meta.title}
      </h2>
      <p className="font-label-sm text-label-sm text-surface-tint flex items-center gap-2 mt-1 uppercase tracking-widest">
        <span className="w-2 h-2 rounded-full bg-surface-tint animate-pulse shadow-[0_0_8px_rgba(0,242,255,0.8)]" />
        {cycle != null ? `Cycle ${String(cycle).padStart(2, '0')}` : 'System Active'}
      </p>
    </div>
  );
}
