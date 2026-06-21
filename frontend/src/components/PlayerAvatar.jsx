/**
 * src/components/PlayerAvatar.jsx
 * ─────────────────────────────────────────────────────────────
 * Avatar 1 người chơi quanh vòng tròn (Digital Cathedral / The Void).
 * Khớp mockup: viền glass-panel + glow cyan, badge số ghế, trạng thái
 * chết (đỏ + dấu X), trạng thái đang nói (speaking indicator kiểu Google
 * Meet: viền pulse + icon loa), người bị chọn (vote).
 *
 * Props:
 *   - isSpeaking (alias: speaking) → đang nói: viền xanh pulse + icon loa.
 *   - anonymous → ẩn danh (ban đêm): hiện silhouette + tên mã "Operative #n",
 *     KHÔNG lộ avatar/tên thật. Người cùng phe Sói được truyền anonymous=false
 *     để vẫn thấy nhau.
 */
export default function PlayerAvatar({
  player,
  index,
  selectable = false,
  selected = false,
  speaking = false,
  isSpeaking = false,
  anonymous = false,
  onSelect,
  size = 'md',
}) {
  const talking = speaking || isSpeaking;
  const dead = player?.status === 'DEAD';
  const dim = 'w-16 h-16';
  const small = 'w-14 h-14';
  const box = size === 'sm' ? small : dim;

  // Ẩn danh: tên mã theo ghế, không lộ tên/ảnh thật.
  const codeName = `Operative #${String((index ?? 0) + 1).padStart(2, '0')}`;
  const showName = anonymous ? codeName : `${player?.name || ''}${player?.self ? ' (You)' : ''}`;

  const ringClass = dead
    ? 'border-error/50 shadow-[0_0_15px_rgba(255,180,171,0.3)]'
    : selected
      ? 'border-2 border-error shadow-[0_0_20px_rgba(255,180,171,0.6)]'
      : talking
        ? 'speaking-ring border-2 border-surface-tint shadow-[0_0_25px_rgba(0,242,255,0.7)]'
        : player?.self && !anonymous
          ? 'glow-cyan-active border-surface-tint'
          : 'border-outline-variant opacity-70 hover:opacity-100';

  return (
    <button
      type="button"
      disabled={!selectable || dead}
      onClick={() => onSelect?.(player)}
      className={`flex flex-col items-center gap-2 group ${
        selectable && !dead ? 'cursor-pointer' : 'cursor-default'
      } ${dead ? 'opacity-40' : ''}`}
    >
      <div
        className={`relative ${box} rounded-full glass-panel p-1 transition-transform group-hover:scale-110 duration-300 ${ringClass}`}
      >
        {anonymous && !dead ? (
          // Silhouette ẩn danh — bóng đen + dấu hỏi.
          <div className="w-full h-full rounded-full bg-gradient-to-b from-surface-container-high to-void flex items-center justify-center border border-surface-tint/20">
            <span className="material-symbols-outlined text-surface-tint/60 text-[28px]">
              question_mark
            </span>
          </div>
        ) : (
          <img
            src={player?.avatar}
            alt={anonymous ? codeName : player?.name}
            className={`w-full h-full rounded-full object-cover ${dead ? 'grayscale' : ''}`}
          />
        )}
        {dead && (
          <div className="absolute inset-0 bg-error/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-error">close</span>
          </div>
        )}
        {/* Badge số ghế */}
        <div
          className={`absolute -bottom-2 -right-2 bg-surface-container text-[10px] font-label-sm px-1.5 rounded border ${
            dead
              ? 'border-error text-error'
              : talking || (player?.self && !anonymous)
                ? 'border-surface-tint text-surface-tint'
                : 'border-outline-variant text-on-surface-variant'
          }`}
        >
          P{(index ?? 0) + 1}
        </div>
        {/* Đang nói — icon loa + ping ring kiểu Google Meet */}
        {talking && !dead && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-surface-tint/60 animate-ping" />
            <span className="material-symbols-outlined absolute -top-7 left-1/2 -translate-x-1/2 text-surface-tint animate-pulse fill">
              volume_up
            </span>
          </>
        )}
      </div>
      <span
        className={`font-label-sm text-label-sm uppercase tracking-widest px-2 py-0.5 rounded ${
          dead
            ? 'text-error/70 line-through'
            : anonymous
              ? 'text-on-surface-variant/80'
              : player?.self
                ? 'text-surface-tint bg-surface-container-lowest/80'
                : 'text-on-surface-variant'
        }`}
      >
        {showName}
      </span>
    </button>
  );
}
