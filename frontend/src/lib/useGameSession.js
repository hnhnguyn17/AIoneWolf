/**
 * src/lib/useGameSession.js
 * Hook gom toàn bộ state 1 ván từ socket THẬT (backend seat-based).
 * Backend dùng seat (number) làm định danh; UI dùng id (socket.id) để tìm "mình".
 * Hook tự dịch id↔seat qua seatOf().
 */
import { useEffect, useRef, useState } from 'react';
import { getSocket, C2S, S2C } from './socket.js';
import * as agora from './agora.js';
import { PHASE, PLAYER_STATUS } from './contracts.js';

let _mid = 0;
const mid = () => `c${Date.now()}_${_mid++}`;

export function useGameSession() {
  const socket = useRef(getSocket()).current;
  const [players, setPlayers] = useState(() => {
    const init = socket._lastRoomState?.players || [];
    return init.map((p) => ({ ...p, status: p.status || PLAYER_STATUS.ALIVE }));
  });
  const [phase, setPhase] = useState(PHASE.LOBBY);
  const [cycle, setCycle] = useState(1);
  const [deadline, setDeadline] = useState(null);
  const [chronicle, setChronicle] = useState([]);
  const [gmSpeech, setGmSpeech] = useState(null);
  const [role, setRole] = useState(null);
  const [mySeat, setMySeat] = useState(null);
  const [vote, setVote] = useState({ tally: {}, youVoted: null });
  const [nightPrompt, setNightPrompt] = useState(null);
  const [hostRoleMap, setHostRoleMap] = useState(null);

  // Ref để handlers luôn đọc players mới nhất không cần re-bind
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  const [speakingSeat, setSpeakingSeat] = useState(null);
  useEffect(() => {
    const unsub = agora.onSpeaking((seat, speaking) => {
      setSpeakingSeat((cur) => (speaking ? seat : cur === seat ? null : cur));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const add = (m) => setChronicle((prev) => [...prev, { id: mid(), ...m }]);
    const bySeat = (seat) => playersRef.current.find((p) => p.seat === seat);

    function onRoomState(state) {
      if (Array.isArray(state?.players)) {
        setPlayers((prev) => mergePlayers(prev, state.players, socket.id));
        const me = state.players.find((p) => p.id === socket.id);
        if (me) setMySeat(me.seat);
      }
      if (state?.phase) setPhase(state.phase);
    }

    function onPhase({ phase: p, cycle: c, deadline: d }) {
      if (p && p !== PHASE.NIGHT) setNightPrompt(null);
      if (p) setPhase(p);
      if (c != null) setCycle(c);
      setDeadline(d ?? null);
      if (p === PHASE.NIGHT) agora.muteAll(true);
      else {
        agora.muteAll(false);
        if (p === PHASE.DAY_DISCUSS || p === PHASE.VOTE) agora.setMic(true);
      }
    }

    function onRole({ role: r, seat }) {
      if (r) {
        setRole(r);
        if (seat != null) setMySeat(seat);
        setPlayers((prev) => prev.map((pl) => (pl.seat === seat ? { ...pl, role: r } : pl)));
      }
    }

    function onHostMap({ map }) { setHostRoleMap(map || null); }

    function onGm({ text, tone, ts }) {
      setGmSpeech({ text, tone });
      add({ kind: 'gm', text, ts: ts || Date.now() });
    }

    function onChat({ from, seat, text, ts }) {
      add({ kind: 'chat', name: from, self: seat === mySeat, text, ts: ts || Date.now() });
    }

    function onDied({ seat, cause }) {
      const p = bySeat(seat);
      setPlayers((prev) => prev.map((pl) => (pl.seat === seat ? { ...pl, status: PLAYER_STATUS.DEAD } : pl)));
      add({
        kind: 'alert',
        text: `Mất tín hiệu từ [${p?.name || `ghế ${seat}`}]. ${cause === 'LYNCH' ? 'Bị làng trục xuất.' : 'Sinh hiệu: âm tính.'}`,
        ts: Date.now(),
      });
    }

    function onVote({ tally, voter }) {
      setVote((cur) => ({ tally: tally || {}, youVoted: voter === mySeat ? cur.youVoted : cur.youVoted }));
    }

    function onSeer({ targetSeat, team }) {
      const p = bySeat(targetSeat);
      add({
        kind: 'system',
        text: `Soi: ${p?.name || `ghế ${targetSeat}`} ${team === 'WEREWOLF' ? 'LÀ Sói.' : 'KHÔNG phải Sói.'}`,
        ts: Date.now(),
      });
    }

    function onNightPrompt({ action, role: r }) { setNightPrompt({ action, role: r }); }

    socket.on(S2C.ROOM_STATE, onRoomState);
    socket.on(S2C.PHASE_CHANGED, onPhase);
    socket.on(S2C.ROLE_ASSIGNED, onRole);
    socket.on(S2C.HOST_ROLE_MAP, onHostMap);
    socket.on(S2C.GM_SPEAK, onGm);
    socket.on(S2C.CHAT_MSG, onChat);
    socket.on(S2C.PLAYER_DIED, onDied);
    socket.on(S2C.VOTE_UPDATE, onVote);
    socket.on(S2C.SEER_RESULT, onSeer);
    socket.on(S2C.NIGHT_PROMPT, onNightPrompt);

    return () => {
      socket.off(S2C.ROOM_STATE, onRoomState);
      socket.off(S2C.PHASE_CHANGED, onPhase);
      socket.off(S2C.ROLE_ASSIGNED, onRole);
      socket.off(S2C.HOST_ROLE_MAP, onHostMap);
      socket.off(S2C.GM_SPEAK, onGm);
      socket.off(S2C.CHAT_MSG, onChat);
      socket.off(S2C.PLAYER_DIED, onDied);
      socket.off(S2C.VOTE_UPDATE, onVote);
      socket.off(S2C.SEER_RESULT, onSeer);
      socket.off(S2C.NIGHT_PROMPT, onNightPrompt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, mySeat]);

  // seatOf: nhận id (socket.id) hoặc seat (number) → trả seat
  const seatOf = (targetId) => {
    if (targetId == null) return null;
    const p = playersRef.current.find((x) => x.id === targetId || x.seat === targetId);
    return p ? p.seat : (typeof targetId === 'number' ? targetId : null);
  };

  function sendChat(text) { socket.emit(C2S.CHAT_SEND, { text }); }
  function castVote(targetId) {
    const seat = seatOf(targetId);
    setVote((cur) => ({ ...cur, youVoted: seat }));
    socket.emit(C2S.VOTE_CAST, { targetSeat: seat });
  }
  function startGame(roleConfig) { socket.emit(C2S.GAME_START, roleConfig ? { roleConfig } : {}); }
  function nightAction(action, targetId) {
    socket.emit(C2S.NIGHT_ACTION, { action, targetSeat: seatOf(targetId) });
  }

  const speakingId = (() => {
    const p = speakingSeat != null ? playersRef.current.find((x) => x.seat === speakingSeat) : null;
    return p ? p.id : null;
  })();

  return {
    players, phase, cycle, deadline, speakingId,
    chronicle, gmSpeech, role, mySeat, vote, nightPrompt, hostRoleMap,
    sendChat, castVote, startGame, nightAction,
  };
}

function mergePlayers(prev, incoming, myId) {
  return incoming.map((p) => {
    const old = prev.find((x) => x.id === p.id || x.seat === p.seat);
    return { status: PLAYER_STATUS.ALIVE, ...old, ...p, self: p.id === myId };
  });
}

export default useGameSession;
