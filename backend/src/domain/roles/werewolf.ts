/**
 * Sói — mỗi đêm cùng bầy chọn 1 nạn nhân để cắn.
 * Nhiều Sói: mỗi con ghi 1 phiếu; resolveNight đếm đa số (chống ghi đè 1-slot).
 */
import { ROLE, TEAM, NIGHT_ACTION } from '../../contracts/index.js';
import type { RoleModule } from './types.js';

export const Werewolf: RoleModule = {
  role: ROLE.WEREWOLF,
  team: TEAM.WEREWOLF,
  label: 'Sói',
  points: -6,
  night: {
    action: NIGHT_ACTION.KILL,
    validate(room, actor, targetSeat) {
      const target = room.getBySeat(targetSeat);
      if (!target || !target.isAlive()) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      if (target.team === TEAM.WEREWOLF) return { ok: false, error: 'Không thể cắn đồng loại.' };
      return { ok: true };
    },
    apply(room, actor, targetSeat) {
      // Mỗi Sói 1 phiếu — resolveNight đếm đa số (không ghi đè).
      room.nightBuffer.wolfVotes[actor.seat] = targetSeat;
    },
  },
};
