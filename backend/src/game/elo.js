/**
 * backend/game/elo.js
 * ─────────────────────────────────────────────────────────────
 * Tính ELO + phân hạng theo luật trong .ask/ask.txt.
 *
 * ΔELO = (điểm tiêu chuẩn * hệ số) + điểm khuyến khích + điểm MVP
 *
 * Điểm tiêu chuẩn: Thắng +15, Thua -10
 * Hệ số theo vai:  Dân thường 1.0 | Phe dân có năng lực 1.3 | Sói 1.5
 * Điểm khuyến khích:
 *   - Sống sót đến cuối (phe sói/dân):      +5
 *   - Sống sót đến cuối (phe thứ 3):        +7
 *   - Chết nhưng team thắng:                +0
 *   - Sống sót nhưng team thua:             -2
 *   - AFK / thoát game (chưa chết):         -20
 */

const { ROLE, TEAM } = require('../contracts');

// Hệ số theo vai
const ROLE_FACTOR = {
  [ROLE.VILLAGER]: 1.0,
  [ROLE.SEER]: 1.3,
  [ROLE.GUARD]: 1.3,
  [ROLE.WITCH]: 1.3,
  [ROLE.WEREWOLF]: 1.5,
};

// Ngưỡng phân hạng
const RANKS = [
  { key: 'DIAMOND', name: 'Chúa Tể', min: 2000 },
  { key: 'GOLD', name: 'Ma Sói', min: 1500 },
  { key: 'SILVER', name: 'Thợ Săn', min: 1000 },
  { key: 'BRONZE', name: 'Tân Binh', min: 0 },
];

/** Trả hạng theo ELO. */
function getRank(elo) {
  return RANKS.find((r) => elo >= r.min) || RANKS[RANKS.length - 1];
}

/**
 * Tính ΔELO cho 1 người chơi sau 1 ván.
 * @param {object} p - { role, team, won:boolean, survived:boolean, afk?:boolean, mvp?:number }
 * @returns {{ delta:number, breakdown:object }}
 */
function computeDelta(p) {
  const base = p.won ? 15 : -10;
  const factor = ROLE_FACTOR[p.role] ?? 1.0;
  let standard = base * factor;

  // Điểm khuyến khích (các case loại trừ nhau, đúng theo ask.txt)
  let bonus = 0;
  if (p.afk) {
    bonus = -20;                                  // AFK/thoát game (chưa chết)
  } else if (p.survived && p.won) {
    bonus = p.team === TEAM.THIRD ? 7 : 5;        // sống tới cuối + team thắng
  } else if (p.survived && !p.won) {
    bonus = -2;                                   // sống nhưng team thua
  }
  // chết nhưng team thắng: +0 (không cộng gì)

  const mvp = p.mvp || 0; // luật MVP chưa chốt — để tham số mở

  const delta = Math.round(standard + bonus + mvp);
  return {
    delta,
    breakdown: { base, factor, standard: Math.round(standard), bonus, mvp },
  };
}

/**
 * Áp ΔELO vào ELO hiện tại (không âm).
 */
function applyDelta(currentElo, delta) {
  return Math.max(0, currentElo + delta);
}

/**
 * Mốc NFT theo chuỗi thắng LIÊN TIẾP: 20/50/100 → hạng badge.
 * @param {number} winStreak
 * @returns {string|null} badge key nếu vừa đạt mốc, ngược lại null
 */
function nftMilestone(winStreak) {
  if (winStreak === 100) return 'CHUA_TE';   // Chúa Tể
  if (winStreak === 50) return 'MA_SOI';      // Ma Sói
  if (winStreak === 20) return 'THO_SAN';     // Thợ Săn
  return null;
}

module.exports = { ROLE_FACTOR, RANKS, getRank, computeDelta, applyDelta, nftMilestone };
