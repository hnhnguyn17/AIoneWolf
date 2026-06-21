/**
 * intentParser.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC NGAY — DEMO] Boc lenh tieng Viet bang regex/keyword.
 *
 * ⚠️ DAY LA STUB THAY CHO "BO NAO" LLM THAT.
 *    Khi noi LLM that (gpt-4o-mini qua Agora, LLM_PROVIDER=openai), ta KHONG
 *    dung file nay nua — thay vao do gui messages + getToolSchemas() len LLM
 *    va LLM tu sinh tool_calls. File nay chi de CHUNG MINH luong boc lenh ->
 *    tool_call hoat dong ma chua can cam key/LLM.
 *
 * Map cau noi -> { tool, args:{ targetSeat } }:
 *   "soi can (nguoi) (so) N"        -> werewolf_kill
 *   "tien tri soi N" / "soi nguoi N"-> seer_check   (luu y phan biet voi "soi can")
 *   "bao ve N" / "che chan N"       -> guard_protect
 *   "phu thuy cuu N" / "cuu N"      -> witch_save
 *   "phu thuy giet/doc N"           -> witch_poison
 *   "treo co N" / "bo phieu N"      -> vote
 *   "sang di" / "chuyen pha"        -> advance_phase
 *
 * Tra ve null neu khong khop (AI se hoi lai / bo qua).
 */

'use strict';

/**
 * Doi chu so tieng Viet va so Arabic -> number.
 * Ho tro: "3", "ba", "so 3", "số ba".
 */
const VN_NUM = {
  khong: 0, mot: 1, hai: 2, ba: 3, bon: 4, nam: 5,
  sau: 6, bay: 7, tam: 8, chin: 9, muoi: 10,
};

/**
 * Bo dau tieng Viet de regex don gian (khong phu thuoc input co dau hay khong).
 */
function deaccent(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // bo dau thanh + dau mu
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Tach so ghe tu cau. Uu tien so Arabic, fallback so chu tieng Viet.
 * @returns {number|null}
 */
function extractSeat(text) {
  // 1) so Arabic: "so 3", "ghe 3", "3"
  const m = text.match(/(\d+)/);
  if (m) return parseInt(m[1], 10);

  // 2) so chu: "so ba", "ghe ba"
  const words = text.split(/\s+/);
  for (const w of words) {
    if (Object.prototype.hasOwnProperty.call(VN_NUM, w)) {
      return VN_NUM[w];
    }
  }
  return null;
}

/**
 * Boc 1 cau noi -> intent.
 * @param {string} rawText cau noi cua nguoi choi (co the co dau)
 * @returns {{tool:string, args:object, matched:string}|null}
 */
function parseIntent(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const text = deaccent(rawText);

  // advance_phase: khong can seat.
  if (/\b(chuyen pha|sang di|troi sang|ket thuc dem|qua ngay)\b/.test(text)) {
    return { tool: 'advance_phase', args: { from: 'NIGHT' }, matched: 'advance_phase' };
  }

  const seat = extractSeat(text);

  // Thu tu kiem tra QUAN TRONG: "soi can" phai check truoc "soi" (tien tri),
  // vi tu "soi" xuat hien o ca hai.
  const rules = [
    // werewolf_kill: "soi can ...", "can nguoi ...", "phe soi can ..."
    { tool: 'werewolf_kill', re: /\b(soi\s+can|can\s+nguoi|can\s+chet|phe\s+soi)\b/ },
    // witch_save: "phu thuy cuu", "cuu nguoi", "dung binh cuu"
    { tool: 'witch_save', re: /\b(cuu)\b/ },
    // witch_poison: "phu thuy giet", "doc nguoi", "dau doc", "ra tay"
    { tool: 'witch_poison', re: /\b(giet|dau\s*doc|binh\s+doc|ra\s+tay|doc\s+nguoi)\b/ },
    // guard_protect: "bao ve", "che chan", "chan"
    { tool: 'guard_protect', re: /\b(bao\s+ve|che\s+chan|chan)\b/ },
    // seer_check: "tien tri soi", "soi nguoi", "soi bai"  (sau khi loai "soi can")
    { tool: 'seer_check', re: /\b(tien\s+tri|soi)\b/ },
    // vote: "treo co", "bo phieu", "phieu"
    { tool: 'vote', re: /\b(treo\s+co|bo\s+phieu|phieu)\b/ },
  ];

  for (const r of rules) {
    if (r.re.test(text)) {
      if (seat == null) {
        // Khop dong tu nhung thieu so ghe -> bao thieu de AI hoi lai.
        return { tool: r.tool, args: {}, matched: r.tool, missingSeat: true };
      }
      return { tool: r.tool, args: { targetSeat: seat }, matched: r.tool };
    }
  }

  return null; // khong khop -> khong phai lenh game
}

module.exports = { parseIntent, extractSeat, deaccent, VN_NUM };
