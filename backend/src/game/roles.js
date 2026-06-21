/**
 * backend/game/roles.js
 * ─────────────────────────────────────────────────────────────
 * Build bộ bài theo ROLE_PRESETS, trộn Fisher-Yates, gán seat 1..N.
 */

const { ROLE_PRESETS, ROLE_TEAM } = require('../contracts');

/**
 * Trộn mảng tại chỗ bằng thuật toán Fisher-Yates (đảm bảo phân phối đều).
 * @param {Array} arr
 * @returns {Array} chính mảng đã trộn
 */
function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Lấy bộ bài cho N người. Ưu tiên roleConfig truyền vào (mảng ROLE.*),
 * nếu không có thì lấy từ ROLE_PRESETS theo số người.
 * @param {number} count - số người chơi
 * @param {string[]|null} roleConfig - cấu hình vai tùy chọn (override preset)
 * @returns {string[]} mảng ROLE.* dài đúng count
 */
function buildDeck(count, roleConfig = null) {
  if (Array.isArray(roleConfig) && roleConfig.length === count) {
    return [...roleConfig];
  }
  const preset = ROLE_PRESETS[count];
  if (!preset) {
    throw new Error(`Không có preset vai cho ${count} người (hỗ trợ ${Object.keys(ROLE_PRESETS).join(', ')})`);
  }
  return [...preset];
}

/**
 * Chia vai cho danh sách người chơi:
 *  - build bộ bài đúng số người,
 *  - trộn Fisher-Yates,
 *  - gán role + team cho từng player (giữ nguyên seat đã có).
 * Lưu ý: hàm này MUTATE player.role / player.team.
 * @param {Array<{seat:number, role:string|null}>} players
 * @param {string[]|null} roleConfig
 * @returns {Array} chính players đã được gán role
 */
function assignRoles(players, roleConfig = null) {
  const deck = fisherYatesShuffle(buildDeck(players.length, roleConfig));
  players.forEach((p, idx) => {
    p.role = deck[idx];
    p.team = ROLE_TEAM[deck[idx]];
  });
  return players;
}

module.exports = { fisherYatesShuffle, buildDeck, assignRoles };
