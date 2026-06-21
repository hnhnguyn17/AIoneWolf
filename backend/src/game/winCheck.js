/**
 * backend/game/winCheck.js
 * ─────────────────────────────────────────────────────────────
 * Kiểm tra điều kiện thắng/thua.
 *
 * Luật:
 *  - Phe DÂN thắng khi KHÔNG còn con Sói nào sống.
 *  - Phe SÓI thắng khi số Sói sống >= số Dân sống (Sói áp đảo).
 *  - Ngược lại: game tiếp tục.
 */

const { TEAM, PLAYER_STATUS } = require('../contracts');

/**
 * @param {Array<{team:string, status:string}>} players
 * @returns {{ over:boolean, winner:(string|null) }}
 *   - over=false: chưa kết thúc.
 *   - over=true + winner=TEAM.*: phe thắng.
 */
function checkWin(players) {
  const alive = players.filter((p) => p.status === PLAYER_STATUS.ALIVE);
  const wolves = alive.filter((p) => p.team === TEAM.WEREWOLF).length;
  const villagers = alive.filter((p) => p.team === TEAM.VILLAGE).length;

  // Hết Sói -> Dân thắng
  if (wolves === 0) {
    return { over: true, winner: TEAM.VILLAGE };
  }
  // Sói >= Dân -> Sói thắng (đêm sau Sói chắc chắn áp đảo)
  if (wolves >= villagers) {
    return { over: true, winner: TEAM.WEREWOLF };
  }
  return { over: false, winner: null };
}

module.exports = { checkWin };
