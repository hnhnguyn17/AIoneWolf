/**
 * src/components/NightActionBar.jsx
 * ─────────────────────────────────────────────────────────────
 * Bottom bar ban đêm theo VAI của người chơi:
 *   - Sói   : "Kênh Sói" → mở panel overlay (vòng tròn bầy sói + mic riêng + nhắc chat).
 *   - Tiên tri: "Soi một người" → bật chế độ chọn mục tiêu trên vòng.
 *   - Phù thủy: "Cứu" / "Độc" → bật chế độ chọn mục tiêu.
 * Bấm nút hành động → onToggleSelect(actionKey). Đang chọn + có target → onConfirm.
 */
import { ROLE } from '../lib/contracts.js';

const ROLE_UI = {
  [ROLE.WEREWOLF]: { icon: 'pets',       label: 'Kênh Sói',    color: 'red-400',    hint: 'Vòng tròn bầy sói + mic riêng' },
  [ROLE.SEER]:     { icon: 'visibility', label: 'Soi người',   color: 'cyan-400',   hint: 'Chọn mục tiêu để soi thân phận' },
  [ROLE.WITCH]:    { icon: 'science',    label: 'Dùng thuốc',  color: 'purple-400', hint: 'Bình cứu / bình độc' },
  [ROLE.GUARD]:    { icon: 'shield',     label: 'Bảo vệ',      color: 'cyan-400',   hint: 'Chắn 1 người khỏi Sói' },
};

// Map action từ NIGHT_PROMPT → label nút tuỳ pha
const ACTION_LABEL = {
  KILL:   'Chọn con mồi',
  CHECK:  'Soi thân phận',
  SAVE:   'Cứu nạn nhân',
  POISON: 'Đầu độc',
  PROTECT:'Bảo vệ',
};

export default function NightActionBar({
  role, action, selecting, selectedId, onToggleSelect, onConfirm, disabled,
}) {
  const ui = ROLE_UI[role];

  // Vai không có hành động đêm (Dân) hoặc chưa tới lượt → chỉ hiện thông báo.
  if (!ui || !action) {
    return (
      <div className="shrink-0 p-4 glass-panel border-x-0 border-b-0 border-t border-outline-variant/30 flex items-center justify-center">
        <span className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest flex items-center gap-2 text-center">
          <span className="material-symbols-outlined text-[16px]">bedtime</span>
          Bạn đang ngủ — chờ các vai hành động xong
        </span>
      </div>
    );
  }

  const actionLabel = ACTION_LABEL[action] || ui.label;

  return (
    <div className="shrink-0 p-4 glass-panel border-x-0 border-b-0 border-t border-outline-variant/30 flex items-center justify-center gap-3 flex-wrap">
      {selecting ? (
        <>
          <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-widest">
            {selectedId ? 'Đã chọn mục tiêu — bấm Xác nhận' : 'Chạm một avatar để chọn mục tiêu'}
          </span>
          <button
            type="button"
            disabled={!selectedId}
            onClick={onConfirm}
            className="bg-primary text-on-primary font-button text-button px-6 py-3 rounded uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">check</span>
            Xác nhận
          </button>
          <button
            type="button"
            onClick={() => onToggleSelect(null)}
            className="px-4 py-3 rounded border border-outline-variant/40 text-on-surface-variant font-button text-button uppercase tracking-widest hover:text-error transition-colors"
          >
            Huỷ
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggleSelect(action)}
          className={`border font-button text-button px-6 py-3 rounded uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            role === 'WEREWOLF'
              ? 'bg-red-500/15 border-red-500/50 text-red-400 hover:bg-red-500/25 hover:shadow-[0_0_16px_rgba(239,68,68,0.4)]'
              : role === 'WITCH'
                ? 'bg-purple-500/15 border-purple-500/50 text-purple-400 hover:bg-purple-500/25'
                : 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/25'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{ui.icon}</span>
          {actionLabel}
          <span className="font-label-sm text-[10px] normal-case opacity-70 hidden sm:inline">· {ui.hint}</span>
        </button>
      )}
    </div>
  );
}
