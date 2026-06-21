/**
 * backend/game/phases.js
 * ─────────────────────────────────────────────────────────────
 * Logic chuyển pha + giải quyết ĐÊM (night resolution) — phần luật cốt lõi.
 *
 * Vòng lặp pha:
 *   LOBBY → ASSIGN_ROLES → NIGHT → DAY_ANNOUNCE → DAY_DISCUSS → VOTE
 *         → CHECK_WIN → (NIGHT lặp lại | GAME_OVER)
 *
 * Thứ tự xử lý đêm theo NIGHT_ORDER = [GUARD, WEREWOLF, SEER, WITCH]:
 *   1. GUARD chắn 1 người (không chắn cùng người 2 đêm liên tiếp).
 *   2. WEREWOLF chọn cắn 1 người -> đây là "nạn nhân của Sói".
 *   3. SEER soi 1 người (chỉ trả kết quả, không gây chết).
 *   4. WITCH có thể CỨU nạn nhân của Sói (bình cứu) và/hoặc ĐỘC 1 người (bình độc).
 *
 * Tính người chết cuối đêm:
 *   - Nạn nhân Sói chết, TRỪ KHI được GUARD chắn HOẶC được WITCH cứu.
 *   - Người bị WITCH độc luôn chết (độc xuyên giáp bảo vệ).
 */

const { ROLE, NIGHT_ACTION, PLAYER_STATUS } = require('../contracts');

/**
 * Map pha kế tiếp (luồng tuyến tính, riêng CHECK_WIN do winCheck quyết định).
 */
const NEXT_PHASE = {
  LOBBY: 'ASSIGN_ROLES',
  ASSIGN_ROLES: 'NIGHT',
  NIGHT: 'DAY_ANNOUNCE',
  DAY_ANNOUNCE: 'DAY_DISCUSS',
  DAY_DISCUSS: 'VOTE',
  VOTE: 'CHECK_WIN',
  // CHECK_WIN -> NIGHT (lặp) hoặc GAME_OVER: xử lý riêng trong GameRoom
};

/**
 * Giải quyết toàn bộ hành động đêm từ buffer nightActions.
 *
 * @param {Object} room - tham chiếu GameRoom (đọc players, nightActions, guard state, witch potions)
 * @returns {{ deaths: Array<{seat:number, cause:string}>, wolfTarget:(number|null) }}
 *
 * Lưu ý: hàm này MUTATE trạng thái phù thủy (đánh dấu đã dùng bình) và guard.lastProtectedSeat,
 * nhưng KHÔNG tự đánh dấu player.status = DEAD (việc đó do caller làm để dễ phát event).
 */
function resolveNight(room) {
  const na = room.nightActions; // { KILL, PROTECT, CHECK, SAVE, POISON } -> targetSeat
  const deaths = [];
  const deadSet = new Set(); // tránh trùng seat trong danh sách chết

  // 1) GUARD chắn ai (nếu có)
  const protectedSeat = na[NIGHT_ACTION.PROTECT] ?? null;

  // 2) Sói cắn ai
  const wolfTarget = na[NIGHT_ACTION.KILL] ?? null;

  // 4a) Phù thủy CỨU: chỉ hợp lệ nếu cứu đúng nạn nhân của Sói và còn bình cứu
  const witchSaveSeat = na[NIGHT_ACTION.SAVE] ?? null;
  const witchSaved =
    witchSaveSeat !== null &&
    wolfTarget !== null &&
    witchSaveSeat === wolfTarget &&
    !room.witch.healUsed;

  // Tính cái chết do Sói cắn (trừ khi được chắn hoặc được cứu)
  if (wolfTarget !== null) {
    const blockedByGuard = protectedSeat !== null && protectedSeat === wolfTarget;
    if (!blockedByGuard && !witchSaved) {
      deaths.push({ seat: wolfTarget, cause: ROLE.WEREWOLF });
      deadSet.add(wolfTarget);
    }
  }

  // 4b) Phù thủy ĐỘC: luôn chết (xuyên giáp), nếu còn bình độc
  const witchPoisonSeat = na[NIGHT_ACTION.POISON] ?? null;
  if (witchPoisonSeat !== null && !room.witch.poisonUsed) {
    if (!deadSet.has(witchPoisonSeat)) {
      deaths.push({ seat: witchPoisonSeat, cause: NIGHT_ACTION.POISON });
      deadSet.add(witchPoisonSeat);
    }
    room.witch.poisonUsed = true; // tiêu bình độc
  }

  // Tiêu bình cứu nếu đã cứu thành công
  if (witchSaved) {
    room.witch.healUsed = true;
  }

  // Ghi nhớ GUARD đã chắn ai để đêm sau không chắn lại cùng người
  room.guard.lastProtectedSeat = protectedSeat;

  return { deaths, wolfTarget };
}

/**
 * Kiểm tra một mục tiêu chắn của GUARD có hợp lệ không
 * (không được chắn cùng người 2 đêm liên tiếp).
 * @param {Object} room
 * @param {number} targetSeat
 * @returns {boolean}
 */
function isGuardProtectAllowed(room, targetSeat) {
  return room.guard.lastProtectedSeat !== targetSeat;
}

module.exports = { NEXT_PHASE, resolveNight, isGuardProtectAllowed };
