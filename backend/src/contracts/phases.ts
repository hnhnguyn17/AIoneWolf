/**
 * contracts/phases.ts
 * ─────────────────────────────────────────────────────────────
 * Pha của ván + thứ tự gọi vai ban đêm. Khớp FE contracts.js.
 */
import { ROLE, type Role } from './roles.js';

export const PHASE = {
  LOBBY: 'LOBBY',
  ASSIGN_ROLES: 'ASSIGN_ROLES',
  NIGHT: 'NIGHT',
  DAY_ANNOUNCE: 'DAY_ANNOUNCE',
  DAY_DISCUSS: 'DAY_DISCUSS',
  VOTE: 'VOTE',
  CHECK_WIN: 'CHECK_WIN',
  GAME_OVER: 'GAME_OVER',
} as const;
export type Phase = (typeof PHASE)[keyof typeof PHASE];

/** Thứ tự đánh thức vai ban đêm. Phù thủy SAU Sói để biết nạn nhân mà cứu. */
export const NIGHT_ORDER: Role[] = [ROLE.GUARD, ROLE.WEREWOLF, ROLE.SEER, ROLE.WITCH];
