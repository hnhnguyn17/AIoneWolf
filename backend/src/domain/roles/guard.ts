/**
 * Bảo vệ — mỗi đêm chắn 1 người khỏi đòn cắn của Sói.
 * Biến thể: không chắn cùng 1 người 2 đêm liên tiếp; được tự chắn mình.
 */
import { ROLE, TEAM, NIGHT_ACTION } from '../../contracts/index.js';
import type { RoleModule } from './types.js';

export const Guard: RoleModule = {
  role: ROLE.GUARD,
  team: TEAM.VILLAGE,
  label: 'Bảo vệ',
  points: 3,
  night: {
    action: NIGHT_ACTION.PROTECT,
    validate(room, actor, targetSeat) {
      const target = room.getBySeat(targetSeat);
      if (!target || !target.isAlive()) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      if (room.lastGuardedSeat === targetSeat)
        return { ok: false, error: 'Không thể bảo vệ cùng người 2 đêm liên tiếp.' };
      return { ok: true };
    },
    apply(room, actor, targetSeat) {
      room.nightBuffer.guardSeat = targetSeat;
    },
  },
};
