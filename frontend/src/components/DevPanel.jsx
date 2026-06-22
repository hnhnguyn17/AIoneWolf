/**
 * src/components/DevPanel.jsx
 * Công cụ DEV — CHỈ hiện ở import.meta.env.DEV. Production không render.
 * Chỉ giữ Fill Bots + Fill+Start (chạy backend thật). Đã bỏ mock-only features.
 */
import { useState } from 'react';
import { getSocket } from '../lib/socket.js';

export default function DevPanel({ context = 'game', fillCount = 8, onRunTest }) {
  if (!import.meta.env.DEV) return null;

  const socket = getSocket();
  const [open, setOpen] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false);

  const fillBots = () => socket.emit('dev:fill_bots', { count: fillCount });

  function runTest() {
    socket.emit('dev:fill_bots', { count: fillCount });
    setTimeout(() => onRunTest?.(), 300);
    setConfirmRun(false);
  }

  if (!open) {
    return (
      <div className="fixed bottom-3 left-3 z-[100]">
        <button
          onClick={() => setOpen(true)}
          className="bg-on-tertiary-container/90 text-white text-[11px] font-data-mono px-2 py-1 rounded uppercase tracking-widest"
        >
          DEV
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[100] w-60 bg-[#0a0a0b]/95 border border-on-tertiary-container/60 rounded-lg p-3 backdrop-blur-md shadow-[0_0_20px_rgba(115,24,255,0.3)] font-data-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-on-tertiary-container uppercase tracking-widest flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">bug_report</span>
          Dev Tools
        </span>
        <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error">✕</button>
      </div>

      <p className="text-outline-variant mb-2 leading-snug">Chỉ hiện ở DEV. Thao tác với backend thật.</p>

      {context === 'waiting' && (
        <>
          <button
            onClick={fillBots}
            className="w-full mb-2 bg-surface-tint/15 border border-surface-tint/50 text-surface-tint py-1.5 rounded uppercase tracking-widest hover:bg-surface-tint/25 flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
            Fill bots ({fillCount})
          </button>

          {confirmRun ? (
            <div className="mb-1 p-2 rounded border border-green-400/60 bg-green-400/10 flex flex-col gap-2">
              <span className="text-green-300 leading-snug">Fill bot đủ {fillCount} người rồi bắt đầu ván thật?</span>
              <div className="flex gap-2">
                <button onClick={runTest} className="flex-1 bg-green-400/20 border border-green-400/70 text-green-300 py-1.5 rounded uppercase tracking-widest hover:bg-green-400/30 flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>Có
                </button>
                <button onClick={() => setConfirmRun(false)} className="flex-1 border border-outline-variant/50 text-on-surface-variant py-1.5 rounded uppercase tracking-widest hover:text-error">Huỷ</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRun(true)}
              className="w-full bg-green-400/15 border border-green-400/60 text-green-300 py-1.5 rounded uppercase tracking-widest hover:bg-green-400/25 flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
              Fill + Bắt đầu ván
            </button>
          )}
        </>
      )}
    </div>
  );
}
