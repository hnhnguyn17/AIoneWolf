/**
 * src/components/GMNarrator.jsx
 * ─────────────────────────────────────────────────────────────
 * Lõi "AI Quản trò" đặt ở TÂM vòng avatar (thay cho mic cũ). Đây là
 * người dẫn ván — không phải nút mic của người chơi. Khi GM đang nói
 * (gmSpeech) thì hiện bong bóng lời; lúc rảnh hiện lõi AI nhịp sáng.
 */
export default function GMNarrator({ label = 'AI Quản trò' }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-24 h-24 rounded-full glass-panel flex items-center justify-center border-surface-tint/50 mb-4 glow-cyan animate-pulse-ring">
        <span
          className="material-symbols-outlined text-4xl text-surface-tint"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          smart_toy
        </span>
      </div>
      <span className="font-label-sm text-label-sm text-surface-tint tracking-widest uppercase bg-surface-container-lowest/80 px-4 py-1 rounded-full border border-surface-tint/30 text-center">
        {label}
      </span>
    </div>
  );
}
