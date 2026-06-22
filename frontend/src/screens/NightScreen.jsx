/**
 * src/screens/NightScreen.jsx
 * ─────────────────────────────────────────────────────────────
 * "Night Phase" — ban đêm. Tối, chat khoá (comms encrypted), phe Sói thấy nhau.
 * Bố cục giống GameBoard nhưng nền tối hơn.
 *
 * Thêm Task #18:
 *   - NightActionBar bottom bar theo VAI: Sói mở kênh Sói, Tiên tri soi, Phù thủy cứu/độc.
 *   - Panel overlay "Kênh Sói" trượt lên khi bấm nút Sói.
 *   - Chọn mục tiêu trực tiếp trên vòng → emit nightAction.
 */
import { useEffect, useMemo, useState } from 'react';
import AvatarCircle from '../components/AvatarCircle.jsx';
import ChronicleLog from '../components/ChronicleLog.jsx';
import PhaseIndicator from '../components/PhaseIndicator.jsx';
import GMNarrator from '../components/GMNarrator.jsx';
import GMSpeechBubble from '../components/GMSpeechBubble.jsx';
import Countdown from '../components/Countdown.jsx';
import MicIndicator from '../components/MicIndicator.jsx';
import NightActionBar from '../components/NightActionBar.jsx';
import { ROLE, ROLE_LABEL, PLAYER_STATUS } from '../lib/contracts.js';
import * as agora from '../lib/agora.js';

export default function NightScreen({ session, onExit }) {
  const {
    players, phase, cycle, deadline, speakingId, chronicle, gmSpeech, role,
    sendChat, nightPrompt, nightAction,
  } = session;
  const isWolf = role === ROLE.WEREWOLF;

  // ── Hành động đêm theo vai ──────────────────────────────
  const [selecting, setSelecting]   = useState(null);   // action key đang chọn mục tiêu
  const [selectedId, setSelectedId] = useState(null);   // mục tiêu đã chọn
  const [wolfPanel, setWolfPanel]   = useState(false);  // overlay "Kênh Sói"
  const [wolfMic, setWolfMic]       = useState(true);

  // Danh sách Sói (để vẽ vòng tròn riêng trong panel).
  const wolves = useMemo(
    () => players.filter((p) => p.role === ROLE.WEREWOLF),
    [players],
  );

  // ẨN DANH BAN ĐÊM: ẩn mặt + tên mọi người, TRỪ:
  //  - chính mình (p.self)
  //  - đồng đội cùng phe Sói (chỉ khi MÌNH là Sói và người kia cũng là Sói)
  const anonymousFor = useMemo(
    () => (p) => {
      if (p.self) return false;                           // luôn thấy chính mình
      if (isWolf && p.role === ROLE.WEREWOLF) return false; // Sói thấy đồng bọn
      return true;                                        // còn lại: ẩn danh
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

  // ── Handlers chọn mục tiêu ──────────────────────────────
  function toggleSelect(action) {
    if (!action) { setSelecting(null); setSelectedId(null); return; }
    // Sói mở panel riêng thay vì chọn trực tiếp trên vòng chính
    if (role === ROLE.WEREWOLF) { setWolfPanel(true); return; }
    setSelecting(action);
    setSelectedId(null);
  }
  function onPickTarget(p) {
    if (!selecting) return;
    if (p.status === PLAYER_STATUS.DEAD) return;
    if (p.self) return; // không tự chọn mình
    setSelectedId(p.id);
  }
  function confirmAction() {
    if (selectedId) nightAction?.(selectedId);
    setSelecting(null);
    setSelectedId(null);
  }

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
            selectable={!!selecting}
            selectedId={selectedId}
            onSelect={onPickTarget}
            center={
              gmSpeech ? (
                <GMSpeechBubble text={gmSpeech.text} tone={gmSpeech.tone || 'night'} />
              ) : (
                <GMNarrator label="AI Quản trò" />
              )
            }
          />
        </div>

        {/* Bottom bar theo vai */}
        <NightActionBar
          role={role}
          action={nightPrompt?.action}
          selecting={selecting}
          selectedId={selectedId}
          onToggleSelect={toggleSelect}
          onConfirm={confirmAction}
        />
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

      {/* Panel overlay KÊNH SÓI — vòng tròn bầy sói + mic riêng + nhắc chat */}
      {wolfPanel && isWolf && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setWolfPanel(false)} />
          <div className="relative z-10 w-full sm:max-w-lg glass-panel rounded-t-2xl sm:rounded-2xl border border-red-500/40 p-5 flex flex-col gap-4 animate-[slideUp_.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-red-500/30 pb-3">
              <div className="flex items-center gap-2 text-red-400">
                <span className="material-symbols-outlined">pets</span>
                <h3 className="font-headline-md text-[20px]">Kênh Sói</h3>
              </div>
              <button onClick={() => setWolfPanel(false)} className="text-on-surface-variant hover:text-red-400 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Vòng tròn riêng chỉ gồm các Sói */}
            <div className="flex items-center justify-center py-2">
              <AvatarCircle
                players={wolves}
                sizeClass="w-[min(46vw,240px)]"
                center={
                  <MicIndicator
                    active={wolfMic}
                    onToggle={() => {
                      setWolfMic((m) => !m);
                      agora.setMic(!wolfMic);
                    }}
                    label="Mic Sói"
                  />
                }
              />
            </div>

            <p className="font-label-sm text-[11px] text-on-surface-variant text-center uppercase tracking-widest">
              Trò chuyện với bầy ở tab <span className="text-red-400">"Theo vai"</span> bên Chronicle.
            </p>

            {/* Chọn con mồi từ trong panel → về vòng chính */}
            <button
              onClick={() => { setWolfPanel(false); setSelecting('KILL'); setSelectedId(null); }}
              className="w-full bg-red-500/20 border border-red-500/60 text-red-400 font-button text-button py-3 rounded uppercase tracking-widest hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">my_location</span>
              Chọn con mồi trên vòng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
