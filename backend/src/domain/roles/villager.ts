/**
 * Dân làng — không có kỹ năng đêm. Ban ngày bỏ phiếu treo cổ.
 */
import { ROLE, TEAM } from '../../contracts/index.js';
import type { RoleModule } from './types.js';

export const Villager: RoleModule = {
  role: ROLE.VILLAGER,
  team: TEAM.VILLAGE,
  label: 'Dân thường',
  points: 1,
  // không có `night` → vai bị động.
};
