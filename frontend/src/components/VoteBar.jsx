/**
 * src/components/VoteBar.jsx
 * ─────────────────────────────────────────────────────────────
 * Thanh hành động vote (mockup Night ~656, Day action bar ~3122).
 * Nút "Initiate Vote Sequence" + đếm mục tiêu còn lại + timer.
 */
export default function VoteBar({
  label = 'Initiate Vote Sequence',
  targetsRemaining,
  timer,
  disabled = false,
  onVote,
}) {
  return (
    <div className="p-gutter glass-panel border-x-0 border-b-0 border-t border-outline-variant/30">
      <button
        type="button"
        onClick={onVote}
        disabled={disabled}
        className="w-full bg-primary text-on-primary font-button text-button py-4 rounded uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] transition-all duration-300 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="relative z-10">{label}</span>
        <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500 skew-x-12" />
      </button>
      {(targetsRemaining != null || timer) && (
        <div className="mt-4 flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
          {targetsRemaining != null && <span>Targets remaining: {targetsRemaining}</span>}
          {timer && (
            <span className="text-surface-tint animate-pulse flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
              {timer}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
