/**
 * contracts/roles.ts
 * ─────────────────────────────────────────────────────────────
 * Vai + phe. PHẢI khớp `frontend/src/lib/contracts.js` (wire contract).
 * 5 vai lõi có logic backend; thêm vai = thêm entry RoleRegistry + 1 mục FE.
 */

export const ROLE = {
  WEREWOLF: 'WEREWOLF',
  VILLAGER: 'VILLAGER',
  SEER: 'SEER',
  GUARD: 'GUARD',
  WITCH: 'WITCH',
} as const;
export type Role = (typeof ROLE)[keyof typeof ROLE];

export const TEAM = {
  WEREWOLF: 'WEREWOLF',
  VILLAGE: 'VILLAGE',
} as const;
export type Team = (typeof TEAM)[keyof typeof TEAM];

export const ROLE_TEAM: Record<Role, Team> = {
  [ROLE.WEREWOLF]: TEAM.WEREWOLF,
  [ROLE.VILLAGER]: TEAM.VILLAGE,
  [ROLE.SEER]: TEAM.VILLAGE,
  [ROLE.GUARD]: TEAM.VILLAGE,
  [ROLE.WITCH]: TEAM.VILLAGE,
};

export const ROLE_LABEL: Record<Role, string> = {
  [ROLE.WEREWOLF]: 'Sói',
  [ROLE.VILLAGER]: 'Dân thường',
  [ROLE.SEER]: 'Tiên tri',
  [ROLE.GUARD]: 'Bảo vệ',
  [ROLE.WITCH]: 'Phù thủy',
};

export const PLAYER_STATUS = {
  ALIVE: 'ALIVE',
  DEAD: 'DEAD',
} as const;
export type PlayerStatus = (typeof PLAYER_STATUS)[keyof typeof PLAYER_STATUS];

/** Hành động đêm. Khớp NIGHT_ACTION ở FE. */
export const NIGHT_ACTION = {
  KILL: 'KILL', // Sói
  PROTECT: 'PROTECT', // Bảo vệ
  CHECK: 'CHECK', // Tiên tri
  SAVE: 'SAVE', // Phù thủy — bình cứu
  POISON: 'POISON', // Phù thủy — bình độc
} as const;
export type NightAction = (typeof NIGHT_ACTION)[keyof typeof NIGHT_ACTION];
