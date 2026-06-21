/**
 * src/lib/mockServer.js
 * ─────────────────────────────────────────────────────────────
 * "Server giả" cho chế độ MOCK (VITE_MOCK=1) — KHÔNG cần backend.
 *
 * Mô phỏng đúng giao diện socket.io tối thiểu mà FE dùng:
 *   - .on(event, handler) / .off(event, handler)
 *   - .emit(event, payload)   (C2S — ghi log + vài phản hồi đơn giản)
 *   - .connected
 *   - .disconnect()
 * và TỰ PHÁT (S2C) một ván demo theo timeline: tạo phòng → chia role →
 * đổi pha ngày/đêm (KÈM deadline 30s để UI đếm ngược) → vài câu GM_SPEAK
 * → người chết → vote. Trong DAY_DISCUSS/VOTE còn phát "ai đang nói" qua
 * agora.setSpeaking(seat,bool) để bật speaking indicator kiểu Google Meet.
 *
 * Dùng đúng tên event trong contracts.js (C2S / S2C).
 */
import { C2S, S2C, PHASE, ROLE, PLAYER_STATUS } from './contracts.js';
import * as agora from './agora.js';

// Avatar cyber-gothic (placeholder online; nếu offline sẽ là ô trống có viền).
const AVA = (seed) =>
  `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&backgroundColor=0a0a0b`;

const MOCK_ROOM_CODE = 'ABYSS1';

// Mỗi pha thảo luận/đêm kéo dài 30s (deadline để UI đếm ngược).
const PHASE_MS = 30_000;

// 6 người chơi demo (theme VOIR_ABYSS).
const PLAYERS = [
  { id: 'p1', name: 'Cipher', avatar: AVA('Cipher'), self: true },
  { id: 'p2', name: 'Null_01', avatar: AVA('Null') },
  { id: 'p3', name: 'Ghost', avatar: AVA('Ghost') },
  { id: 'p4', name: 'Wraith', avatar: AVA('Wraith') },
  { id: 'p5', name: 'Echo_X', avatar: AVA('Echo') },
  { id: 'p6', name: 'Synapse', avatar: AVA('Synapse') },
];

let _seq = 0;
const nextId = () => `m${Date.now()}_${_seq++}`;

/**
 * createMockSocket() — trả về 1 đối tượng giống socket.io-client.
 * Tự khởi động timeline sau khi connect.
 */
export function createMockSocket() {
  const handlers = new Map(); // event -> Set<fn>
  const timers = [];
  let connected = false;
  let started = false;
  let speakingTimer = null; // interval phát "ai đang nói"
  let skipFn = null;        // DEV: ép nhảy step kế (pass đếm ngược)

  // Trạng thái ván (mutate dần qua timeline).
  const players = PLAYERS.map((p) => ({
    ...p,
    status: PLAYER_STATUS.ALIVE,
    role: null,
  }));
  let cycle = 1;

  function on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, new Set());
    handlers.get(event).add(fn);
    return api;
  }
  function off(event, fn) {
    if (handlers.has(event)) handlers.get(event).delete(fn);
    return api;
  }
  function emitToClient(event, payload) {
    const set = handlers.get(event);
    if (set) for (const fn of set) fn(payload);
  }
  function after(ms, fn) {
    timers.push(setTimeout(fn, ms));
  }

  // ── C2S: FE gửi lên "server" giả ──────────────────────────
  function emit(event, payload) {
    // eslint-disable-next-line no-console
    console.log('%c[mock C2S]', 'color:#7318ff', event, payload);
    switch (event) {
      case C2S.ROOM_CREATE:
        // Tạo phòng → phát room:created (kèm hostId = self) rồi room:state.
        after(120, () => {
          emitToClient(S2C.ROOM_CREATED, { code: MOCK_ROOM_CODE, hostId: 'p1' });
          pushRoomState();
        });
        break;
      case C2S.ROOM_JOIN:
        after(120, () => pushRoomState());
        break;
      case C2S.GAME_START:
        startGame();
        break;
      case C2S.CHAT_SEND:
        // Vọng lại tin nhắn của người chơi (self) cho khớp UI.
        after(60, () =>
          emitToClient(S2C.CHAT_MSG, {
            id: nextId(),
            playerId: 'p1',
            name: 'Cipher',
            self: true,
            scope: payload?.scope || 'GLOBAL',
            text: payload?.text ?? '',
            ts: Date.now(),
          }),
        );
        break;
      case C2S.VOTE_CAST:
        after(80, () =>
          emitToClient(S2C.VOTE_UPDATE, {
            tally: { [payload?.targetId || 'p4']: 3, p5: 1 },
            youVoted: payload?.targetId || 'p4',
          }),
        );
        break;
      // ── DEV TOOLS (chỉ chế độ mock/dev) ──────────────────────
      case 'dev:fill_bots':
        // Điền đủ bot cho tới `count` ghế để test nhanh.
        fillBots(payload?.count || 8);
        after(80, () => pushRoomState());
        break;
      case 'dev:skip_phase':
        // Bỏ qua đếm ngược: nhảy ngay tới pha kế tiếp của timeline.
        skipPhase();
        break;
      default:
        break;
    }
  }

  /** DEV: thêm bot vào phòng cho đủ `count` người (tối đa 12). */
  function fillBots(count) {
    const target = Math.min(12, Math.max(players.length, count));
    const BOT_NAMES = ['Vex', 'Rune', 'Onyx', 'Spectre', 'Cinder', 'Drift', 'Hex', 'Pulse'];
    let bi = 0;
    while (players.length < target) {
      const n = players.length + 1;
      const name = `BOT_${BOT_NAMES[bi++ % BOT_NAMES.length]}`;
      players.push({
        id: `bot${n}`, name, avatar: AVA(name),
        status: PLAYER_STATUS.ALIVE, role: null, bot: true,
      });
    }
  }

  /** DEV: ép nhảy pha ngay (dùng để pass 30s đếm ngược khi test). */
  function skipPhase() {
    if (skipFn) skipFn();
  }

  function pushRoomState() {
    emitToClient(S2C.ROOM_STATE, {
      code: MOCK_ROOM_CODE,
      phase: PHASE.LOBBY,
      hostId: 'p1',
      players: players.map(({ role, ...rest }) => rest), // ẩn role ở lobby
    });
  }

  function gm(text, opts = {}) {
    emitToClient(S2C.GM_SPEAK, { id: nextId(), text, ts: Date.now(), ...opts });
  }
  function chat(playerId, text, scope = 'GLOBAL') {
    const p = players.find((x) => x.id === playerId);
    emitToClient(S2C.CHAT_MSG, {
      id: nextId(),
      playerId,
      name: p?.name || playerId,
      self: !!p?.self,
      scope,
      text,
      ts: Date.now(),
    });
  }
  /**
   * phase — phát PHASE_CHANGED. `duration` (ms) → kèm `deadline` (epoch ms)
   * để UI hiển thị đồng hồ đếm ngược.
   */
  function phase(next, { duration = 0, ...payload } = {}) {
    emitToClient(S2C.PHASE_CHANGED, {
      phase: next,
      cycle,
      deadline: duration ? Date.now() + duration : null,
      ...payload,
    });
  }

  /**
   * runSpeaking — mỗi pha thảo luận/vote: lần lượt cho từng người còn sống
   * "nói" ~1.2s (gọi agora.setSpeaking) để UI bật viền pulse + icon loa.
   * Trả về hàm dừng.
   */
  function runSpeaking() {
    stopSpeaking();
    let lastSeat = null;
    speakingTimer = setInterval(() => {
      const aliveSeats = players
        .map((p, i) => ({ seat: i, dead: p.status === PLAYER_STATUS.DEAD }))
        .filter((x) => !x.dead)
        .map((x) => x.seat);
      if (!aliveSeats.length) return;
      if (lastSeat != null) agora.setSpeaking(lastSeat, false);
      const seat = aliveSeats[Math.floor(Math.random() * aliveSeats.length)];
      agora.setSpeaking(seat, true);
      lastSeat = seat;
    }, 1400);
    timers.push(speakingTimer);
  }
  function stopSpeaking() {
    if (speakingTimer) {
      clearInterval(speakingTimer);
      speakingTimer = null;
    }
    // tắt mọi ghế đang sáng
    players.forEach((_, i) => agora.setSpeaking(i, false));
  }

  // ── Timeline ván demo (dạng STEP tuần tự để DEV skip được) ──
  // Mỗi step là 1 hàm; `gap` là thời gian chờ TRƯỚC khi chạy step kế.
  // skipPhase() = chạy ngay step kế (bỏ chờ) — dùng để pass 30s đếm ngược.
  function startGame() {
    if (started) return;
    started = true;

    const roles = {
      p1: ROLE.SEER, p2: ROLE.WEREWOLF, p3: ROLE.VILLAGER,
      p4: ROLE.VILLAGER, p5: ROLE.GUARD, p6: ROLE.WEREWOLF,
    };
    players.forEach((p) => { if (roles[p.id]) p.role = roles[p.id]; });

    const steps = [
      { gap: 300, run: () => {
        phase(PHASE.ASSIGN_ROLES);
        emitToClient(S2C.ROLE_ASSIGNED, { playerId: 'p1', role: roles.p1 });
        gm('Vai trò đã được phân định. Hãy ghi nhớ thân phận của ngươi.');
      } },
      { gap: 1500, run: () => {
        phase(PHASE.NIGHT, { cycle, duration: PHASE_MS });
        gm('Màn đêm buông xuống. Lưới điện ngắt. Phe Sói thức giấc...', { tone: 'night' });
        // Sói họp: hiện vài câu giữa các con sói (p2, p6)
        after(700, () => chat('p2', 'Tôi đánh hơi mục tiêu ở khu 4.', 'WOLF'));
        after(1400, () => chat('p6', 'Đồng ý. Hạ Wraith đêm nay.', 'WOLF'));
        after(2000, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p2', isWerewolf: true }));
      } },
      { gap: PHASE_MS, run: () => {
        const dead = players.find((p) => p.id === 'p4');
        if (dead) dead.status = PLAYER_STATUS.DEAD;
        phase(PHASE.DAY_ANNOUNCE, { cycle });
        gm('Bình minh ló dạng. Làng tỉnh giấc...', { tone: 'day' });
        emitToClient(S2C.PLAYER_DIED, { playerId: 'p4', name: 'Wraith', cause: 'WEREWOLF' });
        gm('Mất tín hiệu từ [Wraith]. Sinh hiệu: âm tính.', { tone: 'alert' });
      } },
      { gap: 1200, run: () => {
        phase(PHASE.DAY_DISCUSS, { cycle, duration: PHASE_MS });
        runSpeaking();
        chat('p3', 'Có ai nắm được gì không? P4 hôm qua khá im hơi.');
        after(900, () => chat('p5', 'Tôi thấy Null_01 vượt cổng an ninh trước khi mất điện.'));
      } },
      { gap: PHASE_MS, run: () => {
        phase(PHASE.VOTE, { cycle, duration: PHASE_MS });
        gm('Đã đến lúc phán xét. Hãy bỏ phiếu loại một kẻ tình nghi.');
        emitToClient(S2C.VOTE_UPDATE, { tally: { p2: 2, p5: 1 }, youVoted: null });
      } },
      { gap: PHASE_MS, run: () => {
        const dead = players.find((p) => p.id === 'p2');
        if (dead) dead.status = PLAYER_STATUS.DEAD;
        emitToClient(S2C.VOTE_UPDATE, { tally: { p2: 4, p5: 1 }, youVoted: 'p2' });
        emitToClient(S2C.PLAYER_DIED, { playerId: 'p2', name: 'Null_01', cause: 'VOTE' });
        gm('Dân làng đã quyết. [Null_01] bị trục xuất. Hắn là SÓI.', { tone: 'alert' });
      } },
      { gap: 1500, run: () => {
        stopSpeaking();
        phase(PHASE.GAME_OVER, { cycle });
        emitToClient(S2C.GAME_OVER, { winner: 'VILLAGE' });
        gm('Phe Dân Làng chiến thắng. Vực Thẳm tạm yên giấc.', { tone: 'day' });
      } },
    ];

    // Bộ chạy step: hẹn giờ step kế; skipFn ép chạy ngay (bỏ chờ).
    let idx = 0;
    let curTimer = null;
    function schedule() {
      if (idx >= steps.length) { skipFn = null; return; }
      const step = steps[idx++];
      curTimer = setTimeout(() => { step.run(); schedule(); }, step.gap);
      timers.push(curTimer);
    }
    skipFn = () => {
      if (curTimer) { clearTimeout(curTimer); curTimer = null; }
      if (idx < steps.length) {
        const step = steps[idx++];
        step.run();
        schedule();
      }
    };
    schedule();
  }

  // ── Vòng đời socket ───────────────────────────────────────
  const api = {
    get connected() {
      return connected;
    },
    on,
    off,
    emit,
    disconnect() {
      connected = false;
      stopSpeaking();
      timers.forEach(clearTimeout);
      timers.length = 0;
      emitToClient('disconnect', 'io client disconnect');
    },
    // tiện ích cho FE: ép gửi room state (vào lobby ngay).
    _bootstrapLobby: pushRoomState,
  };

  // Giả lập connect bất đồng bộ.
  setTimeout(() => {
    connected = true;
    emitToClient('connect');
    pushRoomState();
  }, 100);

  return api;
}

export const MOCK = {
  roomCode: MOCK_ROOM_CODE,
  players: PLAYERS,
};

export default createMockSocket;
