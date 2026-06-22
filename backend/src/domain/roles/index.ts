/**
 * domain/roles/index.ts
 * ─────────────────────────────────────────────────────────────
 * RoleRegistry — "1 nơi chung" tra cứu mọi vai. Thêm vai = thêm 1 import + 1 entry.
 */
import { type Role } from '../../contracts/index.js';
import type { RoleModule } from './types.js';
import { Werewolf } from './werewolf.js';
import { Seer } from './seer.js';
import { Guard } from './guard.js';
import { Witch } from './witch.js';
import { Villager } from './villager.js';

export const RoleRegistry: Record<Role, RoleModule> = {
  WEREWOLF: Werewolf,
  SEER: Seer,
  GUARD: Guard,
  WITCH: Witch,
  VILLAGER: Villager,
};

/** Lấy module 1 vai (luôn tồn tại vì Role là union đóng). */
export function getRoleModule(role: Role): RoleModule {
  return RoleRegistry[role];
}

export type { RoleModule, RoleState, NightActionDef } from './types.js';
