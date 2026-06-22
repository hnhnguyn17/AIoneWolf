/**
 * contracts/events.ts
 * ─────────────────────────────────────────────────────────────
 * Tên sự kiện socket + kiểu payload. PHẢI khớp `frontend/src/lib/contracts.js`.
 * Client→Server (C2S) và Server→Client (S2C).
 */
import type { Role, Team, NightAction } from './roles.js';
import type { Phase } from './phases.js';

/** Client → Server. */
export const C2S = {
  AUTH: 'auth',
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  GAME_START: 'game:start',
  NIGHT_ACTION: 'night:action',
  VOTE_CAST: 'vote:cast',
  CHAT_SEND: 'chat:send',
} as const;

/** Server → Client. */
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
  HOST_ROLE_MAP: 'host:roleMap',
} as const;

// ─── Kiểu payload public (an toàn để gửi cho client) ──────────

/** Người chơi nhìn từ ngoài — KHÔNG lộ vai của người khác. */
export interface PublicPlayer {
  id: string;
  seat: number;
  name: string;
  status: 'ALIVE' | 'DEAD';
  isBot: boolean;
  /** chỉ điền khi đã chết hoặc hết ván (lộ vai). */
  role?: Role | null;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  status: string;
  phase: Phase;
  cycle: number;
  deadline: number | null;
  players: PublicPlayer[];
  maxPlayers: number;
}

// ─── Payload từng sự kiện (tham chiếu khi viết handler) ────────

export interface C2SMap {
  [C2S.ROOM_CREATE]: { name?: string };
  [C2S.ROOM_JOIN]: { roomCode: string; name?: string };
  [C2S.ROOM_LEAVE]: Record<string, never>;
  [C2S.GAME_START]: { roleConfig?: Role[]; withBots?: boolean };
  [C2S.NIGHT_ACTION]: { action: NightAction; targetSeat: number };
  [C2S.VOTE_CAST]: { targetSeat: number | null };
  [C2S.CHAT_SEND]: { text: string };
}

export interface S2CMap {
  [S2C.ERROR]: { error: string };
  [S2C.ROOM_CREATED]: { roomCode: string };
  [S2C.ROOM_STATE]: RoomState;
  [S2C.ROLE_ASSIGNED]: { role: Role; seat: number };
  [S2C.PHASE_CHANGED]: { phase: Phase; cycle: number; deadline: number | null };
  [S2C.NIGHT_PROMPT]: { role: Role; action: NightAction; options: number[] };
  [S2C.SEER_RESULT]: { targetSeat: number; team: Team };
  [S2C.PLAYER_DIED]: { seat: number; cause: string };
  [S2C.VOTE_UPDATE]: { tally: Record<number, number>; voter: number };
  [S2C.CHAT_MSG]: { from: string; seat: number; text: string; ts: number };
  [S2C.GAME_OVER]: { winner: Team };
  [S2C.GM_SPEAK]: { text: string };
  [S2C.HOST_ROLE_MAP]: { map: { seat: number; name: string; role: Role; isBot: boolean }[] };
}
