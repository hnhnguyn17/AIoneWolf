/**
 * src/lib/contracts.js
 * ─────────────────────────────────────────────────────────────
 * Bản sao FE-friendly (ESM) của contracts/gametypes.js + contracts/events.js.
 * Giữ ĐÚNG các string/enums để FE emit/listen socket khớp backend.
 * (Sao chép vào frontend/ để bundler không phải import ra ngoài thư mục dự án.)
 *
 * NẾU backend đổi contract -> cập nhật file này cho khớp.
 */

// ─── Roles ──────────────────────────────────────────────────
export const ROLE = {
  WEREWOLF: 'WEREWOLF',
  VILLAGER: 'VILLAGER',
  SEER: 'SEER',
  GUARD: 'GUARD',
  WITCH: 'WITCH',
};

export const TEAM = {
  WEREWOLF: 'WEREWOLF',
  VILLAGE: 'VILLAGE',
};

export const ROLE_TEAM = {
  [ROLE.WEREWOLF]: TEAM.WEREWOLF,
  [ROLE.VILLAGER]: TEAM.VILLAGE,
  [ROLE.SEER]: TEAM.VILLAGE,
  [ROLE.GUARD]: TEAM.VILLAGE,
  [ROLE.WITCH]: TEAM.VILLAGE,
};

// Nhãn tiếng Việt hiển thị cho từng vai
export const ROLE_LABEL = {
  [ROLE.WEREWOLF]: 'Sói',
  [ROLE.VILLAGER]: 'Dân thường',
  [ROLE.SEER]: 'Tiên tri',
  [ROLE.GUARD]: 'Bảo vệ',
  [ROLE.WITCH]: 'Phù thủy',
};

// ─── Phases ─────────────────────────────────────────────────
export const PHASE = {
  LOBBY: 'LOBBY',
  ASSIGN_ROLES: 'ASSIGN_ROLES',
  NIGHT: 'NIGHT',
  DAY_ANNOUNCE: 'DAY_ANNOUNCE',
  DAY_DISCUSS: 'DAY_DISCUSS',
  VOTE: 'VOTE',
  CHECK_WIN: 'CHECK_WIN',
  GAME_OVER: 'GAME_OVER',
};

export const NIGHT_ORDER = [ROLE.GUARD, ROLE.WEREWOLF, ROLE.SEER, ROLE.WITCH];

export const PLAYER_STATUS = {
  ALIVE: 'ALIVE',
  DEAD: 'DEAD',
};

export const NIGHT_ACTION = {
  KILL: 'KILL',
  PROTECT: 'PROTECT',
  CHECK: 'CHECK',
  SAVE: 'SAVE',
  POISON: 'POISON',
};

export const ROLE_PRESETS = {
  4: [ROLE.WEREWOLF, ROLE.SEER, ROLE.VILLAGER, ROLE.VILLAGER],
  5: [ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.VILLAGER, ROLE.VILLAGER],
  6: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.VILLAGER, ROLE.VILLAGER],
  7: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.WITCH, ROLE.VILLAGER, ROLE.VILLAGER],
  8: [ROLE.WEREWOLF, ROLE.WEREWOLF, ROLE.SEER, ROLE.GUARD, ROLE.WITCH, ROLE.VILLAGER, ROLE.VILLAGER, ROLE.VILLAGER],
};

export const CONTRACT_VERSION = '1.0.0';

// ─── Socket events (events.js) ──────────────────────────────
// Client -> Server
export const C2S = {
  AUTH: 'auth',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  GAME_START: 'game:start',
  NIGHT_ACTION: 'night:action',
  VOTE_CAST: 'vote:cast',
  CHAT_SEND: 'chat:send',
};

// Server -> Client
export const S2C = {
  ERROR: 'error_msg',
  ROOM_CREATED: 'room:created',
  ROOM_STATE: 'room:state',
  ROLE_ASSIGNED: 'role:assigned',
  PHASE_CHANGED: 'phase:changed',
  NIGHT_PROMPT: 'night:prompt',
  SEER_RESULT: 'seer:result',
  PLAYER_DIED: 'player:died',
  VOTE_UPDATE: 'vote:update',
  CHAT_MSG: 'chat:msg',
  GAME_OVER: 'game:over',
  GM_SPEAK: 'gm:speak',
};
