/**
 * src/screens/GameBoardDay.jsx
 * ─────────────────────────────────────────────────────────────
 * "Main Game Board" / Digital Cathedral — pha BAN NGÀY.
 * Mockup: vòng tròn avatar quanh "Vực Thẳm" (~1307/1667), Chronicle
 * chat bên phải (~3139), bottom action bar Vote / Ability / Whisper
 * (~1765). Tâm bàn hiển thị MicIndicator + GMSpeechBubble khi GM nói.
 *
 * Khi vào pha đêm sẽ chuyển sang NightScreen (do App route theo phase).
 */
import { useEffect, useMemo, useState } from 'react';
import AvatarCircle from '../components/AvatarCircle.jsx';
import ChronicleLog from '../components/ChronicleLog.jsx';
import VoteBar from '../components/VoteBar.jsx';
import PhaseIndicator from '../components/PhaseIndicator.jsx';
import MicIndicator from '../components/MicIndicator.jsx';
import GMSpeechBubble from '../components/GMSpeechBubble.jsx';
import Countdown from '../components/Countdown.jsx';
import { ROLE_LABEL, PHASE, PLAYER_STATUS } from '../lib/contracts.js';
import * as agora from '../lib/agora.js';

export default function GameBoardDay({ session, onExit }) {
  const {
    players,
    phase,
    cycle,
    deadline,
    speakingId,
    chronicle,
    gmSpeech,
    role,
    vote,
    sendChat,
    castVote,
  } = session;
  const [voting, setVoting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [micOn, setMicOn] = useState(true);

  // Spatial audio stub: vào màn → join channel.
  useEffect(() => {
    agora.joinChannel({ channel: 'day-board' });
    return () => agora.leave();
  }, []);

  const alive = useMemo(
    () => players.filter((p) => p.status !== PLAYER_STATUS.DEAD),
    [players],
  );
  const inVotePhase = phase === PHASE.VOTE;

  function toggleVoting() {
    if (!inVotePhase && !voting) {
      // Cho phép "khởi tạo" vote thủ công (demo): bật chọn mục tiêu.
      setVoting(true);
      return;
    }
    if (selectedId) {
      castVote(selectedId);
      setVoting(false);
    } else {
      setVoting((v) => !v);
    }
  }

  function onSelect(p) {
    if (!voting && !inVotePhase) return;
    setSelectedId(p.id);
  }

  function toggleMic() {
    setMicOn((on) => {
      agora.setMic(!on);
      return !on;
    });
  }

  return (
    <div className="min-h-screen w-full flex flex-col xl:flex-row antialiased relative">
      {/* Nền rừng cố định + phủ NHẸ (ban ngày) */}
      <div className="forest-bg" />
      <div className="forest-overlay-day" />

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

      {/* LEFT: Arena — ban ngày để trong suốt cho nền sáng lọt qua, các pha khác dùng nền abyss tối */}
      <section className="w-full xl:w-7/12 relative z-10 flex flex-col border-b xl:border-b-0 xl:border-r border-outline-variant/30">
        <div className="absolute top-8 left-8 z-20">
          <PhaseIndicator phase={phase} cycle={cycle} alive={alive.length} total={players.length} />
          <div className="mt-2 flex items-center gap-3">
            {role && (
              <p className="font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
                Your role: {ROLE_LABEL[role] || role}
              </p>
            )}
            {deadline && <Countdown deadline={deadline} />}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 pt-28">
          <AvatarCircle
            players={players}
            selectable={voting || inVotePhase}
            selectedId={selectedId}
            speakingId={speakingId}
            onSelect={onSelect}
            center={
              gmSpeech ? (
                <GMSpeechBubble text={gmSpeech.text} tone={gmSpeech.tone} />
              ) : (
                <MicIndicator active={micOn} onToggle={toggleMic} />
              )
            }
          />
        </div>

        <VoteBar
          label={
            voting || inVotePhase
              ? selectedId
                ? 'Confirm Vote'
                : 'Select a Target'
              : 'Initiate Vote Sequence'
          }
          targetsRemaining={alive.length}
          onVote={toggleVoting}
        />
      </section>

      {/* RIGHT: Chronicle */}
      <section className="w-full xl:w-5/12 h-[60vh] xl:h-screen p-4 xl:p-gutter z-10 flex flex-col">
        <ChronicleLog
          title="Chronicle"
          subtitle="Day Cycle Active"
          cycle={cycle}
          messages={chronicle}
          locked={false}
          onSend={(t) => sendChat(t, 'GLOBAL')}
        />
      </section>
    </div>
  );
}
