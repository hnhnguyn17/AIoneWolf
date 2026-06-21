/**
 * src/components/CenterCountdown.jsx
 * ─────────────────────────────────────────────────────────────
 * Đồng hồ đếm ngược LỚN đặt ở TÂM vòng avatar (thay mic khi đang đếm pha).
 * Nhận `deadline` (epoch ms) + nhãn pha; tự tick mỗi giây, hiển thị số giây
 * to + vòng tiến độ. 10s cuối chuyển đỏ nhấp nháy.
 *
 * Dùng deadline tuyệt đối (không đếm số) để không lệch khi re-render.
 */
import { useEffect, useState } from 'react';

export default function CenterCountdown({ deadline, label = '', total }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;

  const remainMs = Math.max(0, deadline - now);
  const secs = Math.ceil(remainMs / 1000);
  const urgent = remainMs <= 10_000;
  // Vòng tiến độ: nếu biết tổng thời lượng thì vẽ theo %, không thì đầy.
  const pct = total ? Math.max(0, Math.min(1, remainMs / total)) : 1;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center justify-center text-center select-none">
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60" cy="60" r={R} fill="none" strokeWidth="4"
            className="stroke-outline-variant/25"
          />
          <circle
            cx="60" cy="60" r={R} fill="none" strokeWidth="4" strokeLinecap="round"
            className={urgent ? 'stroke-error' : 'stroke-surface-tint'}
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.3s linear' }}
          />
        </svg>
        <span
          className={`font-display-lg tabular-nums text-[44px] leading-none ${
            urgent ? 'text-error animate-pulse' : 'text-surface-tint'
          }`}
          style={{ textShadow: '0 0 18px rgba(0,242,255,0.55)' }}
        >
          {secs}
        </span>
      </div>
      {label && (
        <span className="mt-2 font-label-sm text-[11px] text-on-surface-variant uppercase tracking-[0.25em]">
          {label}
        </span>
      )}
    </div>
  );
}
