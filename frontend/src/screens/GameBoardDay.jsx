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
import PhaseIndicator from '../components/PhaseIndicator.jsx';
import GMNarrator from '../components/GMNarrator.jsx';
import GMSpeechBubble from '../components/GMSpeechBubble.jsx';
import Countdown from '../components/Countdown.jsx';
import { ROLE_LABEL, PHASE, PLAYER_STATUS } from '../lib/contracts.js';
import * as agora from '../lib/agora.js';
import VoteTally from '../components/VoteTally.jsx';

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
  const inDiscuss = phase === PHASE.DAY_DISCUSS;
  // Vote chỉ khả dụng khi đang thảo luận (kêu gọi) hoặc đang ở pha bỏ phiếu.
  // Pha công bố sáng (DAY_ANNOUNCE) / chuyển cảnh → nút vote bị khoá.
  const voteEnabled = inVotePhase || inDiscuss;

  function toggleVoting() {
    if (!voteEnabled) return;
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
    <div className="h-screen w-full flex flex-col xl:flex-row antialiased relative overflow-hidden">
      {/* Nền rừng cố định + phủ NHẸ (ban ngày) */}
      <div className="forest-bg" />
      <div className="forest-overlay-day" />

      {/* LEFT: Arena — ban ngày để trong suốt cho nền sáng lọt qua, các pha khác dùng nền abyss tối */}
      <section className="w-full xl:w-7/12 h-full relative z-10 flex flex-col border-b xl:border-b-0 xl:border-r border-outline-variant/30 overflow-hidden">
        {/* HUD trên-trái: pha + ngày/sống + ĐỒNG HỒ + nút Thoát (gom 1 cụm) */}
        <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
          <PhaseIndicator phase={phase} cycle={cycle} alive={alive.length} total={players.length} />
          <div className="flex items-center gap-3 flex-wrap">
            {deadline && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-surface-tint/40 bg-surface-tint/10">
                <Countdown deadline={deadline} />
              </span>
            )}
            {role && (
              <span className="font-label-sm text-label-sm text-surface-tint uppercase tracking-widest">
                Vai: {ROLE_LABEL[role] || role}
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

        {/* Vòng avatar + bảng kiểm phiếu (khi VOTE) */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 relative">
          <AvatarCircle
            players={players}
            sizeClass="w-[min(52vh,440px)]"
            selectable={voting || inVotePhase}
            selectedId={selectedId}
            speakingId={speakingId}
            onSelect={onSelect}
            center={
              gmSpeech ? (
                <GMSpeechBubble text={gmSpeech.text} tone={gmSpeech.tone} />
              ) : (
                <GMNarrator />
              )
            }
          />
          {/* VoteTally nổi góc phải dưới khi pha VOTE */}
          {inVotePhase && Object.keys(vote.tally).length > 0 && (
            <div className="absolute bottom-4 right-4 z-10">
              <VoteTally players={players} tally={vote.tally} youVoted={vote.youVoted} />
            </div>
          )}
        </div>

        {/* Bottom bar: mic (thoại) ở giữa; nút VOTE/Kêu gọi theo pha */}
        <div className="shrink-0 p-4 glass-panel border-x-0 border-b-0 border-t border-outline-variant/30 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={toggleMic}
            title={micOn ? 'Tắt mic' : 'Bật mic'}
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
              micOn
                ? 'border-surface-tint text-surface-tint glow-cyan'
                : 'border-outline-variant/50 text-on-surface-variant opacity-70'
            }`}
          >
            <span className="material-symbols-outlined fill">{micOn ? 'mic' : 'mic_off'}</span>
          </button>

          {voting || inVotePhase ? (
            <button
              type="button"
              onClick={toggleVoting}
              className="bg-primary text-on-primary font-button text-button px-6 py-3 rounded uppercase tracking-widest hover:shadow-[0_0_20px_rgba(0,242,255,0.6)] transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">how_to_vote</span>
              {selectedId ? 'Chốt phiếu' : 'Chọn mục tiêu'}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleVoting}
              disabled={!voteEnabled}
              title={voteEnabled ? '' : 'Chưa tới lúc bỏ phiếu'}
              className="px-5 py-3 rounded border border-outline-variant/40 text-on-surface-variant font-button text-button uppercase tracking-widest hover:text-surface-tint hover:border-surface-tint/50 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-on-surface-variant disabled:hover:border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[18px]">campaign</span>
              Kêu gọi vote
            </button>
          )}
        </div>
      </section>

      {/* RIGHT: Chronicle */}
      <section className="w-full xl:w-5/12 h-full p-3 xl:p-gutter z-10 flex flex-col overflow-hidden">
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
