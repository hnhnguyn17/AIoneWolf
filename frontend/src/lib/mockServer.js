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
 * CƠ CHẾ PHÒNG (mới):
 *   - Vào phòng ban đầu CHỈ có MÌNH BẠN (p1). Bấm "Fill bots" mới thêm người.
 *   - ROOM_CREATE: sinh MÃ PHÒNG MỚI + reset số người + reset ván.
 *   - ROOM_JOIN (Kênh Thế Giới): vào với tư cách KHÁCH (host là bot, không sửa vai).
 *
 * Dùng đúng tên event trong contracts.js (C2S / S2C).
 */
import { C2S, S2C, PHASE, ROLE, ROLE_LABEL, PLAYER_STATUS } from './contracts.js';
import * as agora from './agora.js';

// Avatar cyber-gothic (placeholder online; nếu offline sẽ là ô trống có viền).
const AVA = (seed) =>
  `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&backgroundColor=0a0a0b`;

// Sinh mã phòng ngẫu nhiên (bỏ I/O/0/1 cho dễ đọc) — mỗi lần TẠO PHÒNG 1 mã mới.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function genRoomCode() {
  let c = '';
  for (let i = 0; i < 6; i += 1) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

// Giữ cả hằng MOCK_ROOM_CODE để tương thích với MOCK.roomCode (sẽ đồng bộ qua getter).
let _currentRoomCode = genRoomCode();

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

  // ── Trạng thái PHÒNG CHờ ─────────────────────────────
  let roomCode = _currentRoomCode;   // mã phòng hiện tại
  let hostId = 'p1';                  // p1 = bạn làm chủ; nếu là khách → bot làm chủ
  let joinedIds = ['p1'];             // ai đang trong phòng (khởi đầu chỉ mình bạn)

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
        // TẠO PHÒNG MỚI: mã mới, reset về 1 mình bạn, reset ván.
        resetRoom({ asHost: true });
        roomCode = genRoomCode();
        _currentRoomCode = roomCode;
        after(120, () => {
          emitToClient(S2C.ROOM_CREATED, { code: roomCode, roomCode, hostId: 'p1' });
          pushRoomState();
        });
        break;
      case C2S.ROOM_JOIN:
        // VÀO PHÒNG (Kênh Thế Giới) với tư cách KHÁCH.
        joinAsGuest(payload?.code || payload?.roomCode);
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

  /** DEV: thêm bot vào phòng cho đủ `count` người. */
  function fillBots(count) {
    const target = Math.min(PLAYERS.length, count || 8);
    for (const p of PLAYERS) {
      if (joinedIds.length >= target) break;
      if (!joinedIds.includes(p.id)) joinedIds.push(p.id);
    }
  }

  /** DEV: ép nhảy pha ngay (dùng để pass 30s đếm ngược khi test). */
  function skipPhase() {
    if (skipFn) skipFn();
  }

  /** Reset phòng về trạng thái sạch (1 mình bạn hoặc chuẩn bị join). */
  function resetRoom({ asHost = true } = {}) {
    started = false;
    cycle = 1;
    skipFn = null;
    stopSpeaking();
    timers.forEach(clearTimeout);
    timers.length = 0;
    players.forEach((p) => { p.status = PLAYER_STATUS.ALIVE; p.role = null; });
    hostId = asHost ? 'p1' : hostId;
    joinedIds = ['p1'];
  }

  /** VÀO PHÒNG KHÁCH: host là bot p2, có sẵn vài người, bạn (p1) là khách. */
  function joinAsGuest(code) {
    resetRoom({ asHost: false });
    if (code) roomCode = String(code).toUpperCase();
    hostId = 'p2';                  // chủ phòng là người khác → bạn KHÔNG sửa được vai
    joinedIds = ['p2', 'p3', 'p4', 'p1']; // vài người có sẵn + bạn vào sau
  }

  function pushRoomState() {
    // Chỉ gửi những người đang trong phòng (joinedIds).
    const inRoom = joinedIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean)
      .map(({ role, ...rest }) => rest); // ẩn role ở lobby
    emitToClient(S2C.ROOM_STATE, {
      code: roomCode,
      roomCode,
      phase: PHASE.LOBBY,
      hostId,
      players: inRoom,
      ts: Date.now(),
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

    // Đảm bảo đủ 8 người để kịch bản chạy (nếu chưa fill bot thì tự fill).
    fillBots(8);

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
          code: roomCode,
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

    // ── Helper: vote tăng dần trong pha VOTE để UI chạy số + countdown ──
    function rampVote(finalTally, youVoted) {
      after(VOTE_MS * 0.3, () => {
        const half = {};
        for (const k in finalTally) half[k] = Math.max(1, Math.ceil(finalTally[k] / 2));
        emitToClient(S2C.VOTE_UPDATE, { tally: half, youVoted: null });
      });
      after(VOTE_MS * 0.7, () =>
        emitToClient(S2C.VOTE_UPDATE, { tally: finalTally, youVoted: youVoted ?? null }),
      );
    }

    // ── KỊCH BẢN SÓI: bạn (p1) là Sói cùng p2 ──────────────────
    function buildWolfSteps() {
      return [
        { gap: 300, run: () => {
          phase(PHASE.ASSIGN_ROLES); revealRoles();
          gm('Vai trò đã phân định. Ngươi là SÓI — cùng đồng bọn săn mồi.');
        } },
        { gap: 1200, run: () => {
          cycle = 1; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 1. Phe Sói thức giấc. Hãy chọn con mồi.', { tone: 'night' });
          nightPrompt('KILL');
          after(700, () => chat('p2', 'Đồng bọn, đêm nay hạ ai?', 'WOLF'));
          after(1600, () => chat('p2', 'Tôi nghiêng về Wraith — gã lắm lời.', 'WOLF'));
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p4', 'WEREWOLF');
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 1.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p4')}]. Sinh hiệu: âm tính.`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p3', 'Wraith chết rồi. Phải tìm ra Sói.');
          after(1500, () => chat('p5', 'Cẩn thận, đừng treo nhầm dân.'));
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Bỏ phiếu treo cổ một kẻ tình nghi.');
          rampVote({ p3: 4, p6: 2 }, null);
        } },
        { gap: VOTE_MS, run: () => {
          kill('p3', 'VOTE');
          gm(`[${nameOf('p3')}] bị trục xuất — chỉ là DÂN. Sói vẫn ẩn mình.`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 2; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 2. Tiếp tục đi săn.', { tone: 'night' });
          nightPrompt('KILL');
          after(800, () => chat('p2', 'Hạ Synapse cho chắc.', 'WOLF'));
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p6', 'WEREWOLF');
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 2.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p6')}].`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p3', 'Tôi là Tiên tri! Tôi soi ra Null_01 là Sói!');
          after(1500, () => chat('p2', 'Hắn nói dối! Tôi mới là dân.'));
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Làng nghi ngờ Null_01...');
          rampVote({ p2: 3, p1: 1 }, null);
        } },
        { gap: VOTE_MS, run: () => {
          kill('p2', 'VOTE');
          gm(`[${nameOf('p2')}] bị treo — đồng bọn của ngươi đã ngã xuống.`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 3; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 3. Ngươi là Sói cuối cùng. Hạ kẻ nguy hiểm nhất.', { tone: 'night' });
          nightPrompt('KILL');
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p5', 'WEREWOLF');
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 3.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p5')}] — Bảo vệ đã chết.`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p5', 'Mất Tiên tri rồi... ai là Sói cuối?');
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Phán xét.');
          rampVote({ p8: 2, p1: 1 }, null);
        } },
        { gap: VOTE_MS, run: () => {
          kill('p8', 'VOTE');
          gm(`[${nameOf('p8')}] bị treo nhầm. Phe Sói áp đảo!`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 4; phase(PHASE.GAME_OVER, { cycle });
          emitToClient(S2C.GAME_OVER, { winner: 'WEREWOLF' });
          gm('Ngày 4 — Phe Sói thắng. Làng không thể cản đàn Sói trong bóng tối.', { tone: 'night' });
        } },
      ];
    }

    // ── KỊCH BẢN TIÊN TRI: bạn (p1) soi mỗi đêm ────────────────
    function buildSeerSteps() {
      return [
        { gap: 300, run: () => {
          phase(PHASE.ASSIGN_ROLES); revealRoles();
          gm('Vai trò đã phân định. Ngươi là TIÊN TRI — mỗi đêm soi một người.');
        } },
        { gap: 1200, run: () => {
          cycle = 1; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 1. Hãy chọn một người để soi tỏ thân phận.', { tone: 'night' });
          nightPrompt('CHECK');
          after(2200, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p2', isWerewolf: true }));
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p3', 'WEREWOLF');
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 1.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p3')}].`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p1', 'Tôi đã soi Null_01 — hắn LÀ Sói.', 'GLOBAL');
          after(1200, () => chat('p8', 'Tin Tiên tri! Dồn phiếu Null_01.'));
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Bỏ phiếu.');
          rampVote({ p2: 4, p1: 1 }, 'p2');
        } },
        { gap: VOTE_MS, run: () => {
          kill('p2', 'VOTE');
          gm(`[${nameOf('p2')}] bị treo — ĐÚNG là Sói. Lời Tiên tri ứng nghiệm.`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 2; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 2. Soi tiếp một kẻ khả nghi.', { tone: 'night' });
          nightPrompt('CHECK');
          after(2200, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p7', isWerewolf: true }));
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p4', 'WEREWOLF');
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 2.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p4')}].`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p1', 'Vortex cũng là Sói — tôi đã soi đêm qua!', 'GLOBAL');
          after(1500, () => chat('p8', 'Tin Tiên tri! Dồn phiếu Vortex.'));
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Phán xét Vortex.');
          rampVote({ p7: 4 }, 'p7');
        } },
        { gap: VOTE_MS, run: () => {
          kill('p7', 'VOTE');
          gm(`[${nameOf('p7')}] bị treo — Sói cuối cùng!`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 3; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 3. Bầy Sói đã tan, nhưng hãy cứ canh chừng.', { tone: 'night' });
          nightPrompt('CHECK');
          after(2200, () => emitToClient(S2C.SEER_RESULT, { targetId: 'p5', isWerewolf: false }));
        } },
        { gap: NIGHT_MS, run: () => {
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 3. Đêm qua bình yên — không ai chết.', { tone: 'day' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p8', 'Hết Sói rồi! Tiên tri công lớn.');
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Không còn ai để nghi — làng bỏ phiếu trắng.');
          rampVote({}, null);
        } },
        { gap: VOTE_MS, run: () => {
          stopSpeaking(); cycle = 4; phase(PHASE.GAME_OVER, { cycle });
          emitToClient(S2C.GAME_OVER, { winner: 'VILLAGE' });
          gm('Ngày 4 — Phe Dân thắng. Tiên tri đã dẫn làng tới chiến thắng.', { tone: 'day' });
        } },
      ];
    }

    // ── KỊCH BẢN PHÙ THỦY: bạn (p1) có bình cứu + bình độc ──────
    function buildWitchSteps() {
      return [
        { gap: 300, run: () => {
          phase(PHASE.ASSIGN_ROLES); revealRoles();
          gm('Vai trò đã phân định. Ngươi là PHÙ THỦY — 1 bình cứu, 1 bình độc.');
        } },
        { gap: 1200, run: () => {
          cycle = 1; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 1. Phe Sói ra tay... Ngươi có thể CỨU nạn nhân.', { tone: 'night' });
          after(1500, () => gm(`Đêm nay [${nameOf('p4')}] bị Sói tấn công.`, { tone: 'alert' }));
          after(1800, () => nightPrompt('SAVE'));
        } },
        { gap: NIGHT_MS, run: () => {
          // Phù thủy CỨU p4 → đêm 1 không ai chết.
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 1. Bình cứu đã phát huy — không ai thiệt mạng!', { tone: 'day' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p4', 'Tôi suýt chết... ai đó đã cứu tôi. Cảm ơn!');
          after(1500, () => chat('p3', 'Phù thủy còn sống. Tốt.'));
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Bỏ phiếu một kẻ tình nghi.');
          rampVote({ p6: 3, p2: 2 }, null);
        } },
        { gap: VOTE_MS, run: () => {
          kill('p6', 'VOTE');
          gm(`[${nameOf('p6')}] bị treo — chỉ là dân. Đáng tiếc.`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 2; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 2. Hết bình cứu. Ngươi có thể dùng bình ĐỘC giết một kẻ.', { tone: 'night' });
          nightPrompt('POISON');
        } },
        { gap: NIGHT_MS, run: () => {
          kill('p4', 'WEREWOLF');   // Sói cắn p4
          kill('p2', 'POISON');     // Phù thủy độc trúng Sói p2
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 2.', { tone: 'day' });
          gm(`Mất tín hiệu từ [${nameOf('p4')}].`, { tone: 'alert' });
          gm(`[${nameOf('p2')}] gục chết vì độc dược — và hắn LÀ Sói!`, { tone: 'alert' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p3', 'Phù thủy độc trúng Sói! Còn một con nữa.');
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Truy tìm Sói cuối.');
          rampVote({ p7: 3, p5: 1 }, null);
        } },
        { gap: VOTE_MS, run: () => {
          kill('p7', 'VOTE');
          gm(`[${nameOf('p7')}] bị treo — Sói cuối cùng đã ngã!`, { tone: 'alert' });
        } },
        { gap: 2000, run: () => {
          stopSpeaking(); cycle = 3; phase(PHASE.NIGHT, { cycle, duration: NIGHT_MS });
          gm('Đêm 3. Bình an — Sói đã bị diệt sạch.', { tone: 'night' });
        } },
        { gap: NIGHT_MS, run: () => {
          phase(PHASE.DAY_ANNOUNCE, { cycle, duration: ANNOUNCE_MS });
          gm('Bình minh Ngày 3. Không ai chết.', { tone: 'day' });
        } },
        { gap: ANNOUNCE_MS, run: () => {
          phase(PHASE.DAY_DISCUSS, { cycle, duration: DISCUSS_MS });
          runSpeaking();
          chat('p3', 'Chiến thắng nhờ Phù thủy!');
        } },
        { gap: DISCUSS_MS, run: () => {
          phase(PHASE.VOTE, { cycle, duration: VOTE_MS });
          gm('Làng bỏ phiếu trắng — không còn Sói.');
          rampVote({}, null);
        } },
        { gap: VOTE_MS, run: () => {
          stopSpeaking(); cycle = 4; phase(PHASE.GAME_OVER, { cycle });
          emitToClient(S2C.GAME_OVER, { winner: 'VILLAGE' });
          gm('Ngày 4 — Phe Dân thắng. Bình cứu và bình độc đã xoay chuyển ván cờ.', { tone: 'day' });
        } },
      ];
    }

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
    // DEV: đọc/đặt kịch bản hiện tại (WOLF/SEER/WITCH).
    get _scenario() { return scenario; },
    _setScenario(s) { if (SCENARIO_ROLES[s]) scenario = s; },
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
  // getter để luôn trả mã phòng hiện tại (thay đổi khi tạo phòng mới).
  get roomCode() { return _currentRoomCode; },
  players: PLAYERS,
};

export default createMockSocket;
