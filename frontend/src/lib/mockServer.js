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
import { C2S, S2C, PHASE, ROLE, ROLE_LABEL, PLAYER_STATUS } from './contracts.js';
import * as agora from './agora.js';

// Avatar cyber-gothic (placeholder online; nếu offline sẽ là ô trống có viền).
const AVA = (seed) =>
  `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&backgroundColor=0a0a0b`;

const MOCK_ROOM_CODE = 'ABYSS1';

// Mỗi pha thảo luận/đêm kéo dài 30s (deadline để UI đếm ngược).
const PHASE_MS = 30_000;

// 8 người chơi demo (theme VOIR_ABYSS).
const PLAYERS = [
  { id: 'p1', name: 'Cipher', avatar: AVA('Cipher'), self: true },
  { id: 'p2', name: 'Null_01', avatar: AVA('Null') },
  { id: 'p3', name: 'Ghost', avatar: AVA('Ghost') },
  { id: 'p4', name: 'Wraith', avatar: AVA('Wraith') },
  { id: 'p5', name: 'Echo_X', avatar: AVA('Echo') },
  { id: 'p6', name: 'Synapse', avatar: AVA('Synapse') },
  { id: 'p7', name: 'Vortex', avatar: AVA('Vortex') },
  { id: 'p8', name: 'Raven', avatar: AVA('Raven') },
];

// ── 3 KỊCH BẢN "tour theo vai" (8 người: 2 Sói·1 Tiên tri·1 Bảo vệ·1 Phù thủy·3 Dân)
// Mỗi kịch bản đặt NGƯỜI CHƠI (p1, self) vào một vai khác để xem UI đêm của vai đó.
const W = ROLE.WEREWOLF, S = ROLE.SEER, G = ROLE.GUARD, T = ROLE.WITCH, V = ROLE.VILLAGER;
const SCENARIO_ROLES = {
  // Bạn là SÓI — có đồng bọn p2, thấy kênh Sói (vòng tròn + mic + chat riêng).
  WOLF:  { p1: W, p2: W, p3: S, p4: G, p5: T, p6: V, p7: V, p8: V },
  // Bạn là TIÊN TRI — mỗi đêm soi một người (Sói là p2 & p7, bot).
  SEER:  { p1: S, p2: W, p7: W, p4: G, p8: T, p3: V, p5: V, p6: V },
  // Bạn là PHÙ THỦY — bình cứu/bình độc (Sói là p2 & p7, bot).
  WITCH: { p1: T, p2: W, p7: W, p3: S, p5: G, p4: V, p6: V, p8: V },
};
const SCENARIO_LABEL = { WOLF: 'Sói', SEER: 'Tiên tri', WITCH: 'Phù thủy' };
const DEFAULT_SCENARIO = 'SEER';

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
  let scenario = DEFAULT_SCENARIO; // 'WOLF' | 'SEER' | 'WITCH' (DEV chọn)

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
      case 'dev:set_scenario':
        // DEV: chọn kịch bản theo vai (WOLF/SEER/WITCH) trước khi vào ván.
        if (SCENARIO_ROLES[payload?.scenario]) scenario = payload.scenario;
        break;
      default:
        break;
    }
  }

  /** DEV: thêm bot vào phòng cho đủ `count` người (tối đa 18). */
  function fillBots(count) {
    const target = Math.min(18, Math.max(players.length, count));
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

    // Vai theo KỊCH BẢN đã chọn (DEV). Người chơi (p1) đóng vai tương ứng.
    const roles = SCENARIO_ROLES[scenario] || SCENARIO_ROLES[DEFAULT_SCENARIO];
    players.forEach((p) => { p.role = roles[p.id] || ROLE.VILLAGER; });
    const selfRole = roles.p1;

    // Thời lượng mỗi loại pha (deadline gửi UI để đếm ngược ở tâm vòng).
    const ANNOUNCE_MS = 4500;   // sáng công bố người chết
    const DISCUSS_MS = 20_000;  // thảo luận ban ngày 20s
    const VOTE_MS = 15_000;     // bỏ phiếu 15s
    const NIGHT_MS = 30_000;    // đêm 30s (mỗi vai quyết định, chốt sớm thì pass)

    // Đánh dấu 1 người chết + phát sự kiện (vệt máu/X do UI tự vẽ theo status).
    const kill = (id, cause) => {
      const p = players.find((x) => x.id === id);
      if (!p || p.status === PLAYER_STATUS.DEAD) return;
      p.status = PLAYER_STATUS.DEAD;
      emitToClient(S2C.PLAYER_DIED, { playerId: id, name: p.name, cause });
    };
    const nameOf = (id) => players.find((x) => x.id === id)?.name || id;

    // Chia vai cho client: self qua ROLE_ASSIGNED; nếu self là SÓI thì lộ
    // luôn đồng bọn (UI đêm vẽ "kênh Sói"). phát qua room:state (mock-only).
    function revealRoles() {
      emitToClient(S2C.ROLE_ASSIGNED, { playerId: 'p1', role: selfRole });
      if (selfRole === ROLE.WEREWOLF) {
        // Lộ role cho 2 con sói để client biết đồng đội (mergePlayers giữ field role).
        const wolves = players.filter((p) => roles[p.id] === ROLE.WEREWOLF);
        emitToClient(S2C.ROOM_STATE, {
          code: MOCK_ROOM_CODE,
          players: players.map((p) => ({
            id: p.id,
            role: roles[p.id] === ROLE.WEREWOLF ? ROLE.WEREWOLF : undefined,
          })),
        });
        void wolves;
      }
    }

    // Pha đêm: phát NIGHT_PROMPT cho vai của self để UI bật panel hành động.
    const nightPrompt = (action) =>
      emitToClient(S2C.NIGHT_PROMPT, { action, role: selfRole, cycle });

    // Chọn đúng timeline theo kịch bản.
    const steps =
      scenario === 'WOLF'
        ? buildWolfSteps()
        : scenario === 'WITCH'
          ? buildWitchSteps()
          : buildSeerSteps();

    // Kịch bản 8 người — Dân thắng sau 4 ngày 3 đêm:
    //  Sống đầu: p1..p8 (8)
    //  N1 Sói cắn Wraith(p4)        → 7
    //  D1 làng vote nhầm Ghost(p3)  → 6  (sai: Ghost là Dân)
    //  N2 Sói cắn Synapse(p6)       → 5
    //  D2 Tiên tri lật Null_01(p2)  → 4  (đúng: treo Sói)
    //  N3 Sói cuối cắn Echo_X(p5)   → 3
    //  D3 làng treo Vortex(p7)      → 2  (Sói cuối cùng)
    //  D4 GAME OVER — Dân (Tiên tri + Phù thủy) thắng.
    const steps = [
      // ── Chia vai ──────────────────────────────────────────
      { gap: 300, run: () => {
        phase(PHASE.ASSIGN_ROLES);
        emitToClient(S2C.ROLE_ASSIGNED, { playerId: 'p1', role: roles.p1 });
        gm('Vai trò đã được phân định cho 8 người chơi. Hãy ghi nhớ thân phận của ngươi.');
      } },

      // ── ĐÊM 1 ─────────────────────────────────────────────
      { gap: 1500, run: () => {
        cycle = 1;
        phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
        gm('Đêm 1 buông xuống. Lưới điện ngắt. Phe Sói thức giấc...', { tone: 'night' });
        after(600, () => chat('p2', 'Hai ta khởi đầu. Đừng để lộ.', 'WOLF'));
        after(1200, () => chat('p7', 'Hạ Wraith trước — gã hay soi mói.', 'WOLF'));
        after(1800, () => chat('p2', 'Chốt. Wraith đêm nay.', 'WOLF'));
        // Tiên tri (bạn) soi Null_01 → là Sói.
        after(2400, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p2', isWerewolf: true }));
      } },
      // ── NGÀY 1 ────────────────────────────────────────────
      { gap: NIGHT_MS, run: () => {
        kill('p4', 'WEREWOLF');
        phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
        gm('Bình minh Ngày 1. Làng tỉnh giấc...', { tone: 'day' });
        gm(`Mất tín hiệu từ [${nameOf('p4')}]. Sinh hiệu: âm tính.`, { tone: 'alert' });
      } },
      { gap: ANNOUNCE_MS, run: () => {
        phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
        runSpeaking();
        chat('p3', 'Wraith chết rồi. Ai khả nghi nhất?');
        after(1100, () => chat('p7', 'Tôi nghi Ghost — nãy giờ né tránh.'));
        after(2200, () => chat('p2', 'Đồng ý, Ghost rất đáng ngờ.'));
        after(3300, () => chat('p6', 'Chưa có bằng chứng mà... nhưng thôi.'));
      } },
      { gap: DISCUSS_MS, run: () => {
        phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
        gm('Đã đến lúc phán xét. Bỏ phiếu loại một kẻ tình nghi.');
        emitToClient(S2C.VOTE_UPDATE, { tally: { p3: 3, p6: 1 }, youVoted: null });
      } },
      { gap: VOTE_MS, run: () => {
        emitToClient(S2C.VOTE_UPDATE, { tally: { p3: 5, p6: 1 }, youVoted: 'p3' });
        kill('p3', 'VOTE');
        gm(`Làng đã quyết. [${nameOf('p3')}] bị trục xuất... nhưng hắn chỉ là DÂN. Một sai lầm.`, { tone: 'alert' });
      } },

      // ── ĐÊM 2 ─────────────────────────────────────────────
      { gap: 2000, run: () => {
        stopSpeaking();
        cycle = 2;
        phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
        gm('Đêm 2. Bầy Sói lại đi săn...', { tone: 'night' });
        after(700, () => chat('p7', 'Làng đang loạn. Hạ Synapse cho chắc.', 'WOLF'));
        after(1400, () => chat('p2', 'Ừ. Phù thủy chắc đã dùng thuốc rồi.', 'WOLF'));
        // Tiên tri soi tiếp Vortex → cũng là Sói.
        after(2100, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p7', isWerewolf: true }));
      } },
      // ── NGÀY 2 ────────────────────────────────────────────
      { gap: NIGHT_MS, run: () => {
        kill('p6', 'WEREWOLF');
        phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
        gm('Bình minh Ngày 2.', { tone: 'day' });
        gm(`Mất tín hiệu từ [${nameOf('p6')}]. Sinh hiệu: âm tính.`, { tone: 'alert' });
      } },
      { gap: ANNOUNCE_MS, run: () => {
        phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
        runSpeaking();
        chat('p1', 'Tôi là Tiên tri. Tôi đã soi: Null_01 LÀ Sói. Đừng nghi oan nữa.');
        after(1200, () => chat('p2', 'Vu khống! Hắn giả Tiên tri để gài tôi.'));
        after(2400, () => chat('p8', 'Tôi là Phù thủy — tôi tin Tiên tri. Dồn phiếu Null_01.'));
        after(3500, () => chat('p7', '...', 'GLOBAL'));
      } },
      { gap: DISCUSS_MS, run: () => {
        phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
        gm('Bỏ phiếu lần hai. Niềm tin đặt vào Tiên tri.');
        emitToClient(S2C.VOTE_UPDATE, { tally: { p2: 3 }, youVoted: null });
      } },
      { gap: VOTE_MS, run: () => {
        emitToClient(S2C.VOTE_UPDATE, { tally: { p2: 4, p1: 1 }, youVoted: 'p2' });
        kill('p2', 'VOTE');
        gm(`[${nameOf('p2')}] bị trục xuất. Hắn ĐÚNG là SÓI. Làng gỡ lại một bàn.`, { tone: 'alert' });
      } },

      // ── ĐÊM 3 ─────────────────────────────────────────────
      { gap: 2000, run: () => {
        stopSpeaking();
        cycle = 3;
        phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
        gm('Đêm 3. Con Sói cuối cùng tuyệt vọng dồn đòn...', { tone: 'night' });
        after(900, () => chat('p7', 'Một mình rồi. Phải hạ Echo_X — gã Bảo vệ.', 'WOLF'));
      } },
      // ── NGÀY 3 ────────────────────────────────────────────
      { gap: NIGHT_MS, run: () => {
        kill('p5', 'WEREWOLF');
        phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
        gm('Bình minh Ngày 3.', { tone: 'day' });
        gm(`Mất tín hiệu từ [${nameOf('p5')}]. Sinh hiệu: âm tính.`, { tone: 'alert' });
      } },
      { gap: ANNOUNCE_MS, run: () => {
        phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
        runSpeaking();
        chat('p1', 'Đêm 2 tôi đã soi Vortex — hắn cũng LÀ Sói. Hắn là tên cuối!');
        after(1300, () => chat('p8', 'Khớp hết. Treo Vortex là xong.'));
      } },
      { gap: DISCUSS_MS, run: () => {
        phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
        gm('Phán xét cuối cùng.');
        emitToClient(S2C.VOTE_UPDATE, { tally: { p7: 2 }, youVoted: null });
      } },
      { gap: VOTE_MS, run: () => {
        emitToClient(S2C.VOTE_UPDATE, { tally: { p7: 2 }, youVoted: 'p7' });
        kill('p7', 'VOTE');
        gm(`[${nameOf('p7')}] bị trục xuất. Hắn là con SÓI cuối cùng.`, { tone: 'alert' });
      } },

      // ── NGÀY 4: kết thúc ──────────────────────────────────
      { gap: 2000, run: () => {
        stopSpeaking();
        cycle = 4;
        phase(PHASE.GAME_OVER, { cycle });
        emitToClient(S2C.GAME_OVER, { winner: 'VILLAGE' });
        gm('Ngày 4 — Phe Dân Làng chiến thắng. Tiên tri và Phù thủy sống sót. Vực Thẳm yên giấc.', { tone: 'day' });
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
