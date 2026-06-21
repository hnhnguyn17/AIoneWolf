/**
 * src/components/GMSpeechBubble.jsx
 * ─────────────────────────────────────────────────────────────
 * Bong bóng lời "Game Master" (Quản trò AI) hiển thị nổi ở tâm bàn
 * khi có S2C.GM_SPEAK. Không có sẵn trong mockup nên thiết kế khớp
 * theme: glass-panel + glow cyan, mono label, biến thể theo `tone`.
 */
const TONE = {
  night: 'border-surface-tint/40 text-on-surface',
  day: 'border-primary-fixed/40 text-on-surface',
  alert: 'border-error/50 text-on-error-container shadow-[0_0_20px_rgba(255,180,171,0.2)]',
  default: 'border-surface-tint/40 text-on-surface',
};

export default function GMSpeechBubble({ text, tone = 'default' }) {
  if (!text) return null;
  return (
    <div
      className={`glass-panel rounded-xl px-5 py-4 max-w-xs text-center border ${
        TONE[tone] || TONE.default
      } glow-cyan animate-[pulse_3s_ease-in-out_infinite]`}
    >
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="material-symbols-outlined text-surface-tint text-[18px]">smart_toy</span>
        <span className="font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
          Game Master
        </span>
      </div>
      <p className="font-body-md text-body-md italic leading-snug">{text}</p>
    </div>
  );
}
