/**
 * backend/game/voting.js
 * ─────────────────────────────────────────────────────────────
 * Đếm phiếu treo cổ ban ngày.
 *
 * Luật:
 *  - Mỗi người sống bỏ tối đa 1 phiếu, có thể skip (targetSeat = null).
 *  - Người bị nhiều phiếu nhất bị treo cổ.
 *  - Nếu HÒA (>=2 người cùng số phiếu cao nhất) -> KHÔNG ai chết.
 *  - Nếu tất cả skip / không ai bỏ phiếu -> KHÔNG ai chết.
 */

/**
 * Tính tally từ map votes: { voterSeat -> targetSeat|null }.
 * @param {Object<number, (number|null)>} votes
 * @returns {Object<number, number>} { targetSeat -> count } (bỏ qua skip)
 */
function tallyVotes(votes) {
  const tally = {};
  for (const target of Object.values(votes)) {
    if (target === null || target === undefined) continue; // skip
    tally[target] = (tally[target] || 0) + 1;
  }
  return tally;
}

/**
 * Quyết định người bị treo cổ.
 * @param {Object<number, (number|null)>} votes - { voterSeat -> targetSeat|null }
 * @returns {{ tally:Object, lynchedSeat:(number|null), tie:boolean }}
 *   - lynchedSeat=null + tie=true  : hòa, không ai chết.
 *   - lynchedSeat=null + tie=false : không có phiếu hợp lệ, không ai chết.
 *   - lynchedSeat=<seat>           : người bị treo cổ.
 */
function resolveVote(votes) {
  const tally = tallyVotes(votes);
  const seats = Object.keys(tally).map(Number);

  if (seats.length === 0) {
    return { tally, lynchedSeat: null, tie: false };
  }

  let max = -1;
  for (const s of seats) {
    if (tally[s] > max) max = tally[s];
  }
  const top = seats.filter((s) => tally[s] === max);

  // Hòa -> không ai chết
  if (top.length > 1) {
    return { tally, lynchedSeat: null, tie: true };
  }
  return { tally, lynchedSeat: top[0], tie: false };
}

module.exports = { tallyVotes, resolveVote };
