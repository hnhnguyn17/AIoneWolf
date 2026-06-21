/**
 * src/lib/useGameSession.js
 * ─────────────────────────────────────────────────────────────
 * Hook gom toàn bộ state 1 ván từ socket (mock hoặc thật):
 *   - players (kèm status sống/chết), phase, cycle
 *   - chronicle: mảng message hợp nhất (system/alert/gm/chat)
 *   - gmSpeech: câu GM mới nhất (hiển thị bong bóng giữa bàn)
 *   - role: vai của chính mình (sau ROLE_ASSIGNED)
 *   - vote tally
 * và expose action: sendChat(text), castVote(targetId), startGame().
 *
 * Lắng nghe đúng S2C trong contracts.js; emit đúng C2S.
 */
import { useEffect, useRef, useState } from 'react';
import { getSocket, isMock, C2S, S2C } from './socket.js';
import * as agora from './agora.js';
import { PHASE, PLAYER_STATUS } from './contracts.js';
import { MOCK } from './mockServer.js';

let _mid = 0;
const mid = () => `c${Date.now()}_${_mid++}`;

export function useGameSession() {
  const socket = useRef(getSocket()).current;
  const [players, setPlayers] = useState(isMock() ? seedPlayers() : []);
  const [phase, setPhase] = useState(PHASE.LOBBY);
  const [cycle, setCycle] = useState(1);
  const [deadline, setDeadline] = useState(null); // epoch ms cho đếm ngược pha
  const [chronicle, setChronicle] = useState([]);
  const [gmSpeech, setGmSpeech] = useState(null); // { text, tone }
  const [role, setRole] = useState(null);
  const [vote, setVote] = useState({ tally: {}, youVoted: null });

  // seat (index) đang nói — nghe từ agora.onSpeaking (mock phát qua setSpeaking).
  const [speakingSeat, setSpeakingSeat] = useState(null);
  useEffect(() => {
    const unsub = agora.onSpeaking((seat, speaking) => {
      setSpeakingSeat((cur) => {
        if (speaking) return seat;
        // chỉ tắt nếu đúng ghế đang sáng
        return cur === seat ? null : cur;
      });
    });
    return unsub;
  }, []);

  useEffect(() => {
    const add = (m) => setChronicle((prev) => [...prev, { id: mid(), ...m }]);

    function onRoomState(state) {
      if (Array.isArray(state?.players)) {
        setPlayers((prev) => mergePlayers(prev, state.players));
      }
      if (state?.phase) setPhase(state.phase);
    }
    function onPhase({ phase: p, cycle: c, deadline: d }) {
      if (p) setPhase(p);
      if (c != null) setCycle(c);
      setDeadline(d ?? null);
      // Night: khoá comms của người khác qua agora stub.
      if (p === PHASE.NIGHT) {
        agora.muteAll(true);
      } else {
        agora.muteAll(false);
        // Thảo luận ban ngày → mở mic tất cả (open-floor) qua agora stub.
        if (p === PHASE.DAY_DISCUSS || p === PHASE.VOTE) agora.setMic(true);
      }
    }
    function onRole({ role: r }) {
      if (r) {
        setRole(r);
        setPlayers((prev) => prev.map((pl) => (pl.self ? { ...pl, role: r } : pl)));
      }
    }
    function onGm({ text, tone, ts }) {
      setGmSpeech({ text, tone });
      add({ kind: 'gm', text, ts: ts || Date.now() });
    }
    function onChat(msg) {
      add({
        kind: 'chat',
        name: msg.name,
        self: msg.self,
        text: msg.text,
        scope: msg.scope,
        avatar: lookupAvatar(msg.playerId),
        ts: msg.ts || Date.now(),
      });
    }
    function onDied({ playerId, name, cause }) {
      setPlayers((prev) =>
        prev.map((pl) => (pl.id === playerId ? { ...pl, status: PLAYER_STATUS.DEAD } : pl)),
      );
      add({
        kind: 'alert',
        text: `Mất tín hiệu từ [${name || playerId}]. ${
          cause === 'VOTE' ? 'Bị làng trục xuất.' : 'Sinh hiệu: âm tính.'
        }`,
        ts: Date.now(),
      });
    }
    function onVote(payload) {
      setVote({ tally: payload?.tally || {}, youVoted: payload?.youVoted ?? null });
    }
    function onSeer({ targetId, isWerewolf }) {
      add({
        kind: 'system',
        text: `Soi: ${lookupName(targetId)} ${isWerewolf ? 'LÀ Sói.' : 'KHÔNG phải Sói.'}`,
        ts: Date.now(),
      });
    }

    function lookupName(id) {
      const p = (isMock() ? MOCK.players : players).find((x) => x.id === id);
      return p?.name || id;
    }
    function lookupAvatar(id) {
      const p = (isMock() ? MOCK.players : players).find((x) => x.id === id);
      return p?.avatar || null;
    }

    socket.on(S2C.ROOM_STATE, onRoomState);
    socket.on(S2C.PHASE_CHANGED, onPhase);
    socket.on(S2C.ROLE_ASSIGNED, onRole);
    socket.on(S2C.GM_SPEAK, onGm);
    socket.on(S2C.CHAT_MSG, onChat);
    socket.on(S2C.PLAYER_DIED, onDied);
    socket.on(S2C.VOTE_UPDATE, onVote);
    socket.on(S2C.SEER_RESULT, onSeer);

    return () => {
      socket.off(S2C.ROOM_STATE, onRoomState);
      socket.off(S2C.PHASE_CHANGED, onPhase);
      socket.off(S2C.ROLE_ASSIGNED, onRole);
      socket.off(S2C.GM_SPEAK, onGm);
      socket.off(S2C.CHAT_MSG, onChat);
      socket.off(S2C.PLAYER_DIED, onDied);
      socket.off(S2C.VOTE_UPDATE, onVote);
      socket.off(S2C.SEER_RESULT, onSeer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  function sendChat(text, scope = 'GLOBAL') {
    socket.emit(C2S.CHAT_SEND, { text, scope });
  }
  function castVote(targetId) {
    socket.emit(C2S.VOTE_CAST, { targetId });
  }
  function startGame() {
    socket.emit(C2S.GAME_START, {});
  }

  // id người chơi đang nói (đổi từ seat index → id để UI so khớp).
  const speakingId =
    speakingSeat != null && players[speakingSeat] ? players[speakingSeat].id : null;

  return {
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
    startGame,
  };
}

// ── helpers ───────────────────────────────────────────────
function seedPlayers() {
  return MOCK.players.map((p) => ({ ...p, status: PLAYER_STATUS.ALIVE, role: null }));
}
function mergePlayers(prev, incoming) {
  return incoming.map((p) => {
    const old = prev.find((x) => x.id === p.id);
    return { status: PLAYER_STATUS.ALIVE, ...old, ...p };
  });
}

export default useGameSession;
