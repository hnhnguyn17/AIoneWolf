/**
 * src/screens/NightScreen.jsx
 * ─────────────────────────────────────────────────────────────
 * "Night Phase" (mockup ~361 và ~1790). Tối, chat khoá (comms
 * encrypted), phe Sói có thể thấy nhau / whisper. Bố cục giống
 * GameBoard nhưng:
 *   - nền tối hơn, Chronicle subtitle "Night Cycle Active"
 *   - ô nhập Chronicle bị KHOÁ (lock) cho người không phải Sói
 *   - GM nói qua bong bóng giữa bàn
 *
 * Sói (role WEREWOLF) được mở chat (whisper) trong đêm.
 */
import { useEffect, useMemo } from 'react';
import AvatarCircle from '../components/AvatarCircle.jsx';
import ChronicleLog from '../components/ChronicleLog.jsx';
import PhaseIndicator from '../components/PhaseIndicator.jsx';
import GMNarrator from '../components/GMNarrator.jsx';
import GMSpeechBubble from '../components/GMSpeechBubble.jsx';
import Countdown from '../components/Countdown.jsx';
import { ROLE, ROLE_LABEL, PLAYER_STATUS } from '../lib/contracts.js';
import * as agora from '../lib/agora.js';

export default function NightScreen({ session, onExit }) {
  const {
    players, phase, cycle, deadline, speakingId, chronicle, gmSpeech, role, sendChat,
  } = session;
  const isWolf = role === ROLE.WEREWOLF;

  // ẨN DANH BAN ĐÊM: ẩn mặt + tên mọi người, TRỪ:
  //  - chính mình (p.self)
  //  - đồng đội cùng phe Sói (chỉ khi MÌNH là Sói và người kia cũng là Sói)
  // → trả true = ẩn danh (silhouette + tên mã).
  const anonymousFor = useMemo(
    () => (p) => {
      if (p.self) return false;                      // luôn thấy chính mình
      if (isWolf && p.role === ROLE.WEREWOLF) return false; // Sói thấy đồng bọn
      return true;                                   // còn lại: ẩn danh
    },
    [isWolf],
  );

  // Night: tắt tiếng mọi người (stub), không join mic chủ động.
  useEffect(() => {
    agora.joinChannel({ channel: 'night-board' });
    agora.muteAll(true);
    return () => agora.leave();
  }, []);

  const alive = useMemo(
    () => players.filter((p) => p.status !== PLAYER_STATUS.DEAD),
    [players],
  );
  void alive;

  return (
    <div className="h-screen w-full flex flex-col xl:flex-row antialiased relative overflow-hidden">
      {/* Nền rừng cố định + phủ TỐI ĐẬM ám xanh (ban đêm) */}
      <div className="forest-bg" />
      <div className="forest-overlay-night" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,219,231,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="scanlines opacity-40" />

      {/* LEFT: The Void */}
      <section className="w-full xl:w-7/12 h-full relative z-10 flex flex-col border-b xl:border-b-0 xl:border-r border-outline-variant/30 overflow-hidden">
        {/* HUD trên-trái: pha + ĐỒNG HỒ + vai + nút Thoát */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
          <PhaseIndicator phase={phase} cycle={cycle} />
          <div className="flex items-center gap-3 flex-wrap">
            {deadline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-surface-tint/40 bg-surface-tint/10">
                <Countdown deadline={deadline} />
              </span>
            )}
            {role && (
              <span className="font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
                Vai: {ROLE_LABEL[role] || role}{isWolf ? ' · WOLF' : ''}
              </span>
            )}
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-3 py-1 rounded border border-error/50 text-error font-button text-button uppercase tracking-wider hover:bg-error/10 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Thoát</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <AvatarCircle
            players={players}
            sizeClass="w-[min(52vh,440px)]"
            speakingId={speakingId}
            anonymous={anonymousFor}
            center={
              gmSpeech ? (
                <GMSpeechBubble text={gmSpeech.text} tone={gmSpeech.tone || 'night'} />
              ) : (
                <GMNarrator label="AI Quản trò" />
              )
            }
          />
        </div>

        {/* Bottom restricted bar */}
        <div className="shrink-0 p-4 glass-panel border-x-0 border-b-0 border-t border-outline-variant/30 flex items-center justify-center">
          <span className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest flex items-center gap-2 text-center">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Đêm — mỗi vai âm thầm quyết định trong Vực Thẳm
          </span>
        </div>
      </section>

      {/* RIGHT: Chronicle (locked unless wolf) */}
      <section className="w-full xl:w-5/12 h-full p-3 xl:p-gutter z-10 flex flex-col overflow-hidden">
        <ChronicleLog
          title="Chronicle"
          subtitle="Night Cycle Active"
          cycle={cycle}
          messages={chronicle}
          locked={!isWolf}
          lockedHint="Comms encrypted during Night Phase..."
          onSend={(t) => sendChat(t, 'WOLF')}
        />
      </section>
    </div>
  );
}
