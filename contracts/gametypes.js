/**
 * contracts/gametypes.js
 * ─────────────────────────────────────────────────────────────
 * Hợp đồng KIỂU DỮ LIỆU dùng chung cho cả frontend, backend, ai.
 * Đây là "single source of truth" — 3 module import từ đây để không lệch nhau.
 *
 * Dùng được ở cả Node (CommonJS) lẫn bundler FE (ESM) qua phần export kép cuối file.
 */

// ─── Vai trò (Roles) ────────────────────────────────────────
const ROLE = {
  WEREWOLF: 'WEREWOLF', // Sói — đêm chọn cắn 1 người
  VILLAGER: 'VILLAGER', // Dân thường — không có kỹ năng
  SEER: 'SEER',         // Tiên tri — đêm soi 1 người (biết Sói/Dân)
  GUARD: 'GUARD',       // Bảo vệ — đêm chắn 1 mạng (không tự chắn 2 đêm liên tiếp)
  WITCH: 'WITCH',       // Phù thủy — 1 bình cứu + 1 bình độc (mỗi loại 1 lần/ván)
};

// Phe — dùng để check thắng/thua
const TEAM = {
  WEREWOLF: 'WEREWOLF', // phe Sói
  VILLAGE: 'VILLAGE',   // phe Dân (gồm Dân, Tiên tri, Bảo vệ, Phù thủy)
  THIRD: 'THIRD',       // phe thứ 3 (solo: Thằng Ngố/Thần Tình Yêu... — mở rộng sau)
};

const ROLE_TEAM = {
  [ROLE.WEREWOLF]: TEAM.WEREWOLF,
  [ROLE.VILLAGER]: TEAM.VILLAGE,
  [ROLE.SEER]: TEAM.VILLAGE,
  [ROLE.GUARD]: TEAM.VILLAGE,
  [ROLE.WITCH]: TEAM.VILLAGE,
};

// ─── Pha của game (State machine) ───────────────────────────
const PHASE = {
  LOBBY: 'LOBBY',               // chờ người vào phòng
  ASSIGN_ROLES: 'ASSIGN_ROLES', // chia bài
  NIGHT: 'NIGHT',               // ban đêm — các phe hành động lần lượt
  DAY_ANNOUNCE: 'DAY_ANNOUNCE', // sáng — công bố người chết đêm qua
  DAY_DISCUSS: 'DAY_DISCUSS',   // thảo luận (mic mở cả phòng)
  VOTE: 'VOTE',                 // bỏ phiếu treo cổ
  CHECK_WIN: 'CHECK_WIN',       // kiểm tra điều kiện thắng
  GAME_OVER: 'GAME_OVER',       // kết thúc
};

// Thứ tự hành động ban đêm (ai dậy trước). Backend xử lý theo thứ tự này.
const NIGHT_ORDER = [ROLE.GUARD, ROLE.WEREWOLF, ROLE.SEER, ROLE.WITCH];

// ─── Trạng thái người chơi ──────────────────────────────────
const PLAYER_STATUS = {
  ALIVE: 'ALIVE',
  DEAD: 'DEAD',
};

// Loại hành động ban đêm (actor → target)
const NIGHT_ACTION = {
  KILL: 'KILL',         // Sói cắn
  PROTECT: 'PROTECT',   // Bảo vệ chắn
  CHECK: 'CHECK',       // Tiên tri soi
  SAVE: 'SAVE',         // Phù thủy cứu (dùng bình cứu lên nạn nhân của Sói)
  POISON: 'POISON',     // Phù thủy giết (dùng bình độc)
};

// ─── Cấu hình số vai theo số người (preset demo 6–8 người) ──
// Backend dùng để build bộ bài. Có thể chỉnh.
const ROLE_PRESETS = {
  4: [ROLE.WEREWOLF, ROLE.SEER, ROLE.VILLAGER, ROLE.VILLAGER],
  5: [ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.VILLAGER, ROLE.VILLAGER],
  6: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.VILLAGER, ROLE.VILLAGER],
  7: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.WITCH, ROLE.VILLAGER, ROLE.VILLAGER],
  8: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.WITCH, ROLE.VILLAGER, ROLE.VILLAGER, ROLE.VILLAGER],
};

// ─── Shape tham chiếu (JSDoc, không bắt buộc runtime) ───────
/**
 * @typedef {Object} Player
 * @property {string} id        - socket id hoặc session id
 * @property {string} wallet    - địa chỉ ví Solana (định danh bền)
 * @property {string} name      - tên hiển thị
 * @property {number} seat      - số ghế (1..N), người chơi gọi nhau bằng số này
 * @property {string|null} role - ROLE.* (chỉ lộ cho chính chủ / quản trò)
 * @property {string} status    - PLAYER_STATUS.*
 */

/**
 * @typedef {Object} RoomState
 * @property {string} roomCode
 * @property {string} phase           - PHASE.*
 * @property {number} cycle           - đêm/ngày thứ mấy (bắt đầu 1)
 * @property {Player[]} players
 * @property {number|null} deadline    - epoch ms khi pha hiện tại hết giờ (null = vô hạn)
 * @property {string|null} winner      - TEAM.* khi GAME_OVER
 */

const CONTRACT_VERSION = '1.0.0';

const GameTypes = {
  ROLE, TEAM, ROLE_TEAM, PHASE, NIGHT_ORDER,
  PLAYER_STATUS, NIGHT_ACTION, ROLE_PRESETS, CONTRACT_VERSION,
};

// Export kép: CommonJS (backend/ai) + ESM-friendly (frontend bundler đọc được qua default)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameTypes;
}
export default GameTypes;
export {
  ROLE, TEAM, ROLE_TEAM, PHASE, NIGHT_ORDER,
  PLAYER_STATUS, NIGHT_ACTION, ROLE_PRESETS, CONTRACT_VERSION,
};
