/**
 * src/components/AvatarCircle.jsx
 * ─────────────────────────────────────────────────────────────
 * Vòng tròn avatar quanh "Vực Thẳm" (Digital Cathedral mockup ~1667).
 * Tự tính vị trí mỗi ghế theo góc đồng hồ, đặt PlayerAvatar lên viền
 * tròn. Có element trung tâm (slot) cho mic / GM speech.
 */
import PlayerAvatar from './PlayerAvatar.jsx';

export default function AvatarCircle({
  players = [],
  center = null,
  selectable = false,
  selectedId = null,
  speakingId = null,
  // anonymous: hoặc boolean (áp cho tất cả), hoặc (player)=>boolean để
  // ẩn danh có chọn lọc (đêm: ẩn người khác, lộ đồng đội Sói + chính mình).
  anonymous = false,
  // seats: tổng số GHẾ của bàn (= số role cấu hình). Nếu > số người thật,
  // các ghế dư hiển thị là "ghế trống đang chờ". Mặc định = số người.
  seats = 0,
  // sizeClass: lớp Tailwind cho đường kính vòng. Cho phép màn game thu nhỏ
  // (vd 'w-[min(56vh,460px)]') để vừa 1 màn không scroll.
  sizeClass = 'w-[min(82vw,600px)]',
  onSelect,
}) {
  const isAnon = (p) => (typeof anonymous === 'function' ? anonymous(p) : anonymous);

  // Tổng ghế quanh vòng = max(số người, số ghế cấu hình, tối thiểu 1).
  // → 1 người vào: 1 bóng. Thêm người/role: thêm bóng, CHIA ĐỀU (đa giác đều).
  const total = Math.max(players.length, seats, 1);

  // Dựng danh sách "slot": có người thật thì render PlayerAvatar, không thì ghế trống.
  const slots = Array.from({ length: total }, (_, i) => players[i] || null);

  // Bán kính co theo số ghế để avatar không chồng nhau khi đông.
  const radius = total > 10 ? 47 : 50;

  return (
    <div className={`relative ${sizeClass} aspect-square rounded-full border border-surface-tint/10 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] bg-surface-container-highest/5 backdrop-blur-sm flex items-center justify-center`}>
      {/* Tâm vòng tròn (mic / GM) */}
      <div className="z-20 flex items-center justify-center">{center}</div>

      {/* Ghế quanh viền — chia đều theo đa giác đều */}
      {slots.map((p, i) => {
        // -90deg để ghế đầu tiên ở 12 giờ; toạ độ trên đường tròn.
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
        const top = 50 + radius * Math.sin(angle);
        const left = 50 + radius * Math.cos(angle);
        return (
          <div
            key={p ? p.id : `empty-${i}`}
            className="absolute"
            style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
          >
            {p ? (
              <PlayerAvatar
                player={p}
                index={i}
                selectable={selectable}
                selected={selectedId === p.id}
                isSpeaking={speakingId === p.id}
                anonymous={isAnon(p)}
                onSelect={onSelect}
              />
            ) : (
              // Ghế trống đang chờ người vào.
              <div className="flex flex-col items-center gap-1 opacity-50">
                <div className="w-14 h-14 rounded-full border border-dashed border-outline-variant/50 flex items-center justify-center bg-surface-container/20">
                  <span className="material-symbols-outlined text-outline-variant text-[20px]">
                    person_add
                  </span>
                </div>
                <span className="font-label-sm text-[9px] text-outline-variant uppercase tracking-widest">
                  Ghế {i + 1}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
