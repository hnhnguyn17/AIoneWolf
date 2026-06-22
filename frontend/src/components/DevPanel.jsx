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
import { getSocket, isMock } from '../lib/socket.js';

/**
 * @param {string}   context   'waiting' | 'game' — đổi nút hiển thị theo màn.
 * @param {number}   fillCount số ghế cần điền bot (= tổng vai đã chọn). Mặc định 8.
 * @param {()=>void} onRunTest callback "chạy thử quy trình": fill bot xong → bắt
 *                             đầu ván & vào màn game (WaitingRoom truyền start()).
 */
export default function DevPanel({ context = 'game', fillCount = 8, onRunTest, onPickScenario }) {
  // GUARD CỨNG: production tuyệt đối không render.
  if (!import.meta.env.DEV) return null;

  const socket = getSocket();
  const mock = isMock();
  // Mặc định THU GỌN (chỉ nút DEV nhỏ) cho gọn màn hình — bấm mới bung panel.
  const [open, setOpen] = useState(false);
  const [auto, setAuto] = useState(false);
  const [confirmRun, setConfirmRun] = useState(false); // nút xanh xác nhận chạy thử
  const autoRef = useRef(null);

  // Auto-skip: cứ 3.5s pass 1 pha để tua nhanh cả ván test.
  useEffect(() => {
    if (auto) {
      autoRef.current = setInterval(() => socket.emit('dev:skip_phase'), 3500);
    }
    return () => clearInterval(autoRef.current);
  }, [auto, socket]);

  const fillBots = () => socket.emit('dev:fill_bots', { count: fillCount });
  const skip = () => socket.emit('dev:skip_phase');

  // Chạy thử quy trình: điền đủ bot rồi bắt đầu ván (vào màn game tự diễn).
  function runTest() {
    socket.emit('dev:fill_bots', { count: fillCount });
    setTimeout(() => onRunTest?.(), 250); // chờ room:state cập nhật bot rồi start
    setConfirmRun(false);
  }

  // Chọn kịch bản theo vai → set scenario, fill bots, rồi vào ván.
  function pickScenario(key) {
    socket.emit('dev:set_scenario', { scenario: key });
    socket.emit('dev:fill_bots', { count: fillCount });
    setTimeout(() => (onPickScenario ? onPickScenario(key) : onRunTest?.()), 250);
  }

  if (!open) {
    return (
      <div className="fixed bottom-3 left-3 z-[100] flex items-center gap-2">
        <button
          onClick={() => setOpen(true)}
          className="bg-on-tertiary-container/90 text-white text-[11px] font-data-mono px-2 py-1 rounded uppercase tracking-widest"
        >
          DEV
        </button>
        {mock && (
          <span className="bg-green-500/90 text-black text-[11px] font-data-mono px-2 py-1 rounded uppercase tracking-widest">
            MOCK
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-3 left-3 z-[100] w-60 bg-[#0a0a0b]/95 border border-on-tertiary-container/60 rounded-lg p-3 backdrop-blur-md shadow-[0_0_20px_rgba(115,24,255,0.3)] font-data-mono text-[11px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-on-tertiary-container uppercase tracking-widest flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">bug_report</span>
          Dev Tools
          {mock && (
            <span className="ml-1 bg-green-500/90 text-black px-1.5 rounded text-[10px]">MOCK</span>
          )}
        </span>
        <button onClick={() => setOpen(false)} className="text-on-surface-variant hover:text-error">
          ✕
        </button>
      </div>

      <p className="text-outline-variant mb-2 leading-snug">
        Chỉ hiện ở DEV. Quy trình test giao diện — không phải chơi thật.
      </p>

      {context === 'waiting' && (
        <>
          <button
            onClick={fillBots}
            className="w-full mb-2 bg-surface-tint/15 border border-surface-tint/50 text-surface-tint py-1.5 rounded uppercase tracking-widest hover:bg-surface-tint/25 transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">smart_toy</span>
            Fill bots ({fillCount})
          </button>

          {/* Nút xanh lá: xác nhận "chạy thử quy trình" — fill + start + tự diễn */}
          {confirmRun ? (
            <div className="mb-2 p-2 rounded border border-green-400/60 bg-green-400/10 flex flex-col gap-2">
              <span className="text-green-300 leading-snug">
                Chạy thử quy trình ván demo (4 ngày 3 đêm)?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={runTest}
                  className="flex-1 bg-green-400/20 border border-green-400/70 text-green-300 py-1.5 rounded uppercase tracking-widest hover:bg-green-400/30 transition-colors flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                  Có
                </button>
                <button
                  onClick={() => setConfirmRun(false)}
                  className="flex-1 border border-outline-variant/50 text-on-surface-variant py-1.5 rounded uppercase tracking-widest hover:text-error transition-colors"
                >
                  Huỷ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmRun(true)}
              className="w-full mb-2 bg-green-400/15 border border-green-400/60 text-green-300 py-1.5 rounded uppercase tracking-widest hover:bg-green-400/25 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">rocket_launch</span>
              Chạy thử quy trình
            </button>
          )}

          {/* 3 nút kịch bản theo vai — chỉ hiện ở chế độ MOCK */}
          {mock && (
            <div className="mb-2 pt-2 border-t border-outline-variant/30">
              <p className="text-outline-variant mb-1.5 leading-snug">
                Kịch bản theo vai (8 người · 4N3Đ):
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => pickScenario('WOLF')}
                  className="bg-red-500/15 border border-red-500/50 text-red-400 py-1.5 rounded uppercase tracking-tight text-[10px] hover:bg-red-500/25 transition-colors flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">pets</span>
                  Sói
                </button>
                <button
                  onClick={() => pickScenario('SEER')}
                  className="bg-cyan-500/15 border border-cyan-500/50 text-cyan-400 py-1.5 rounded uppercase tracking-tight text-[10px] hover:bg-cyan-500/25 transition-colors flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Tiên tri
                </button>
                <button
                  onClick={() => pickScenario('WITCH')}
                  className="bg-purple-500/15 border border-purple-500/50 text-purple-400 py-1.5 rounded uppercase tracking-tight text-[10px] hover:bg-purple-500/25 transition-colors flex flex-col items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-[16px]">science</span>
                  Phù thủy
                </button>
              </div>
              <p className="text-outline-variant/60 text-[9px] mt-1 text-center">F5 để đổi kịch bản</p>
            </div>
          )}
        </>
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
