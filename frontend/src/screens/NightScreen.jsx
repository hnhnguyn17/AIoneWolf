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
import MicIndicator from '../components/MicIndicator.jsx';
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
    <div className="min-h-screen w-full flex flex-col xl:flex-row antialiased relative">
      {/* Nền rừng cố định + phủ TỐI ĐẬM ám xanh (ban đêm) */}
      <div className="forest-bg" />
      <div className="forest-overlay-night" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,219,231,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="scanlines opacity-40" />

      {/* Exit */}
      <div className="fixed top-gutter right-gutter z-50">
        <button
          onClick={onExit}
          className="flex items-center gap-2 px-4 py-2 rounded border border-primary/50 text-primary font-button text-button uppercase tracking-wider hover:bg-primary/10 transition-all glow-active"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="hidden sm:inline">Abort Link</span>
        </button>
      </div>

      {/* LEFT: The Void */}
      <section className="w-full xl:w-7/12 relative z-10 flex flex-col border-b xl:border-b-0 xl:border-r border-outline-variant/30">
        <div className="absolute top-8 left-8 z-20">
          <PhaseIndicator phase={phase} cycle={cycle} />
          {role && (
            <p className="mt-2 font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
              Your role: {ROLE_LABEL[role] || role}
              {isWolf ? ' · Comms open (WOLF)' : ''}
            </p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center p-8 pt-28">
          <AvatarCircle
            players={players}
            speakingId={speakingId}
            anonymous={anonymousFor}
            center={
              gmSpeech ? (
                <GMSpeechBubble text={gmSpeech.text} tone={gmSpeech.tone || 'night'} />
              ) : (
                <MicIndicator active={false} label="Sensory Inputs Restricted" />
              )
            }
          />
        </div>

        {/* Bottom restricted bar */}
        <div className="p-gutter glass-panel border-x-0 border-b-0 border-t border-outline-variant/30 flex items-center justify-between">
          <span className="font-label-sm text-label-sm text-outline-variant uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Night phase — actions resolved by the Abyss
          </span>
          {deadline ? (
            <Countdown deadline={deadline} />
          ) : (
            <span className="text-surface-tint animate-pulse flex items-center gap-1 font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
              --:--
            </span>
          )}
        </div>
      </section>

      {/* RIGHT: Chronicle (locked unless wolf) */}
      <section className="w-full xl:w-5/12 h-[60vh] xl:h-screen p-4 xl:p-gutter z-10 flex flex-col">
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
