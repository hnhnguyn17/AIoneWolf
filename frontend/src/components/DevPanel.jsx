/**
 * src/components/DevPanel.jsx
 * ─────────────────────────────────────────────────────────────
 * Bảng công cụ DEV để KIỂM CHỨNG giao diện/thao tác — CHỈ hiện ở môi
 * trường dev (import.meta.env.DEV). Production KHÔNG render.
 *
 * Chức năng:
 *   - Fill bots: điền đủ bot vào phòng chờ để test nhanh (không cần đủ người thật).
 *   - Skip phase: bỏ qua 30s đếm ngược, nhảy ngay pha kế (đêm→ngày→vote...).
 *   - Auto-skip: tự động pass pha sau mỗi vài giây để "tua" cả ván.
 *
 * Gửi lệnh qua socket bằng các event dev (mockServer xử lý): 'dev:fill_bots',
 * 'dev:skip_phase'. Ở backend thật các event này bị bỏ qua (vô hại).
 */
import { useEffect, useRef, useState } from 'react';
import { getSocket } from '../lib/socket.js';

export default function DevPanel({ context = 'game' }) {
  // GUARD CỨNG: production tuyệt đối không render.
  if (!import.meta.env.DEV) return null;

  const socket = getSocket();
  const [open, setOpen] = useState(true);
  const [auto, setAuto] = useState(false);
  const autoRef = useRef(null);

  // Auto-skip: cứ 3.5s pass 1 pha để tua nhanh cả ván test.
  useEffect(() => {
    if (auto) {
      autoRef.current = setInterval(() => socket.emit('dev:skip_phase'), 3500);
    }
    return () => clearInterval(autoRef.current);
  }, [auto, socket]);

  const fillBots = () => socket.emit('dev:fill_bots', { count: 8 });
  const skip = () => socket.emit('dev:skip_phase');

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 left-3 z-[100] bg-on-tertiary-container/90 text-white text-[11px] font-data-mono px-2 py-1 rounded uppercase tracking-widest"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[100] w-60 bg-[#0a0a0b]/95 border border-on-tertiary-container/60 rounded-lg p-3 backdrop-blur-md shadow-[0_0_20px_rgba(115,24,255,0.3)] font-data-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-on-tertiary-container uppercase tracking-widest flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">bug_report</span>
          Dev Tools
        </span>
        <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error">
          ✕
        </button>
      </div>

      <p className="text-outline-variant mb-2 leading-snug">
        Chỉ hiện ở DEV. Quy trình test giao diện — không phải chơi thật.
      </p>

      {context === 'waiting' && (
        <button
          onClick={fillBots}
          className="w-full mb-2 bg-surface-tint/15 border border-surface-tint/50 text-surface-tint py-1.5 rounded uppercase tracking-widest hover:bg-surface-tint/25 transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">smart_toy</span>
          Fill bots (đủ người)
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={skip}
          className="flex-1 bg-primary/15 border border-primary/50 text-primary py-1.5 rounded uppercase tracking-widest hover:bg-primary/25 transition-colors flex items-center justify-center gap-1"
        >
          <span className="material-symbols-outlined text-[14px]">skip_next</span>
          Skip 30s
        </button>
        <button
          onClick={() => setAuto((a) => !a)}
          className={`flex-1 py-1.5 rounded uppercase tracking-widest border transition-colors flex items-center justify-center gap-1 ${
            auto
              ? 'bg-error/20 border-error/60 text-error'
              : 'bg-surface-container/40 border-outline-variant/50 text-on-surface-variant hover:text-surface-tint'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {auto ? 'stop_circle' : 'play_circle'}
          </span>
          {auto ? 'Stop' : 'Auto'}
        </button>
      </div>
    </div>
  );
}
