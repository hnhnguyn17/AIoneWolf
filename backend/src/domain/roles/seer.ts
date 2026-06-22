/**
 * Tiên tri — mỗi đêm soi 1 người, biết người đó thuộc phe Sói hay không.
 * Kết quả trả riêng cho Tiên tri (seer:result), không ghi vào buffer giết.
 */
import { ROLE, TEAM, NIGHT_ACTION } from '../../contracts/index.js';
import type { RoleModule } from './types.js';

export const Seer: RoleModule = {
  role: ROLE.SEER,
  team: TEAM.VILLAGE,
  label: 'Tiên tri',
  points: 7,
  night: {
    action: NIGHT_ACTION.CHECK,
    validate(room, actor, targetSeat) {
      const target = room.getBySeat(targetSeat);
      if (!target || !target.isAlive()) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      if (target.seat === actor.seat) return { ok: false, error: 'Không thể tự soi mình.' };
      return { ok: true };
    },
    apply(room, actor, targetSeat) {
      room.nightBuffer.seerCheck = { seerSeat: actor.seat, targetSeat };
    },
  },
};
