/**
 * contracts/events.js
 * ─────────────────────────────────────────────────────────────
 * Tên các Socket.io event giữa frontend <-> backend. Dùng chung để khỏi gõ sai string.
 */

// Client -> Server
const C2S = {
  AUTH: 'auth',                   // { token }  (JWT sau khi verify ví)
  ROOM_CREATE: 'room:create',     // {}  -> server trả ROOM_STATE
  ROOM_JOIN: 'room:join',         // { roomCode, name }
  ROOM_LEAVE: 'room:leave',       // {}
  GAME_START: 'game:start',       // { roleConfig? }  (chỉ chủ phòng/QT)
  NIGHT_ACTION: 'night:action',   // { action: NIGHT_ACTION.*, targetSeat }
  VOTE_CAST: 'vote:cast',         // { targetSeat | null(skip) }
  CHAT_SEND: 'chat:send',         // { text }  (chỉ pha cho phép)
};

// Server -> Client
const S2C = {
  ERROR: 'error_msg',             // string
  ROOM_STATE: 'room:state',       // RoomState (xem gametypes.js) — public, role ẩn
  ROLE_ASSIGNED: 'role:assigned', // { role, seat }  — gửi RIÊNG từng người
  PHASE_CHANGED: 'phase:changed', // { phase, cycle, deadline }
  NIGHT_PROMPT: 'night:prompt',   // { role, options:[seat] } — tới phiên ai thì nhắc người đó
  SEER_RESULT: 'seer:result',     // { targetSeat, team } — chỉ gửi cho Tiên tri
  PLAYER_DIED: 'player:died',     // { seat, cause }
  VOTE_UPDATE: 'vote:update',     // { tally: {seat: count}, voters }
  CHAT_MSG: 'chat:msg',           // { from, seat, text, ts }
  GAME_OVER: 'game:over',         // { winner: TEAM.*, summary }
  GM_SPEAK: 'gm:speak',           // { text } — câu Quản trò AI nói (FE hiển thị + Agora TTS đọc)
};

const Events = { C2S, S2C };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Events;
}
export default Events;
export { C2S, S2C };
