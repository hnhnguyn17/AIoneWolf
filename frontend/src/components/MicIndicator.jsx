/**
 * src/components/MicIndicator.jsx
 * ─────────────────────────────────────────────────────────────
 * Element trung tâm vòng tròn: trạng thái mic / spatial audio
 * (mockup ~1669 "Spatial Audio Active", animate-pulse-ring).
 * Bấm để bật/tắt mic (gọi qua agora stub ở screen cha).
 */
export default function MicIndicator({ active = true, label = 'Spatial Audio Active', onToggle }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={onToggle}
        className={`relative w-24 h-24 rounded-full glass-panel flex items-center justify-center border-surface-tint/50 mb-4 transition-all ${
          active ? 'glow-cyan animate-pulse-ring' : 'opacity-60'
        }`}
      >
        <span
          className="material-symbols-outlined text-4xl text-surface-tint fill"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {active ? 'mic' : 'mic_off'}
        </span>
      </button>
      <span className="font-label-sm text-label-sm text-surface-tint tracking-widest uppercase bg-surface-container-lowest/80 px-4 py-1 rounded-full border border-surface-tint/30 text-center">
        {label}
      </span>
    </div>
  );
}
