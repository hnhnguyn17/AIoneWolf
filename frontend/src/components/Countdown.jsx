/**
 * src/components/Countdown.jsx
 * ─────────────────────────────────────────────────────────────
 * Đồng hồ đếm ngược cho mỗi pha. Nhận `deadline` (epoch ms) và tự
 * tick mỗi giây, hiển thị MM:SS. Khi hết giờ dừng ở 00:00.
 *
 * Dùng deadline (mốc thời gian tuyệt đối) thay vì đếm số giây, để
 * không bị lệch khi React re-render / đổi màn ngày↔đêm.
 */
import { useEffect, useState } from 'react';

function fmt(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Countdown({ deadline, className = '', icon = true }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline) return null;
  const remain = deadline - now;
  const urgent = remain <= 10_000;

  return (
    <span
      className={`flex items-center gap-1 font-label-sm text-label-sm tabular-nums ${
        urgent ? 'text-error animate-pulse' : 'text-surface-tint'
      } ${className}`}
    >
      {icon && (
        <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
      )}
      {fmt(remain)}
    </span>
  );
}
