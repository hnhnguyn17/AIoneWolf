/**
 * Phù thủy — có 2 bình dùng 1 lần cả ván: CỨU (SAVE) và ĐỘC (POISON).
 * State cá nhân: { potionHeal, potionPoison }. Biến thể: mỗi đêm chỉ 1 hành động;
 * bình cứu chỉ cứu nạn nhân Sói đêm đó (Phù thủy đi SAU Sói nên biết nạn nhân).
 */
import { ROLE, TEAM, NIGHT_ACTION } from '../../contracts/index.js';
import type { RoleModule } from './types.js';

export const Witch: RoleModule = {
  role: ROLE.WITCH,
  team: TEAM.VILLAGE,
  label: 'Phù thủy',
  points: 4,
  initState() {
    return { potionHeal: true, potionPoison: true };
  },
  night: {
    // action danh nghĩa; FE gửi SAVE hoặc POISON, validate phân nhánh theo bình.
    action: NIGHT_ACTION.SAVE,
    validate(room, actor, targetSeat) {
      const target = room.getBySeat(targetSeat);
      if (!target) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      return { ok: true };
    },
    // apply riêng theo bình được xử lý trong GameRoom.applyNightAction (cần biết SAVE/POISON).
    apply() {
      /* no-op: GameRoom điều hướng SAVE/POISON vào buffer.witchSave / witchPoison */
    },
  },
};
