/**
 * services/ai/botService.ts
 * ─────────────────────────────────────────────────────────────
 * "Bộ não bot" = SERVICE NGOÀI, không nhúng trong Player (low coupling).
 * Bot vẫn là Player thường (chỉ khác cờ isBot). Service này đọc state Room
 * rồi HÀNH ĐỘNG HỘ bot đúng lượt:
 *   - ban đêm: chọn target theo vai (qua gameService.nightAction)
 *   - ban ngày: (tùy chọn) phát ngôn qua chat (Web Speech FE đọc)
 *
 * Nhận gameService + llm tiêm vào. Hành động lệch nhịp (stagger) cho tự nhiên.
 */
import type { Server } from 'socket.io';
import { PHASE, ROLE, NIGHT_ACTION } from '../../contracts/index.js';
import type { GameRoom } from '../../domain/GameRoom.js';
import type { GameService } from '../gameService.js';

export class BotService {
  // io giữ lại để mở rộng phát ngôn bot (chat) sau; hiện chỉ điều phối hành động đêm.
  constructor(_io: Server, private game: GameService) {}

  /** gameService.emitPhase gọi xuống mỗi khi đổi pha. */
  onPhase(room: GameRoom): void {
    if (room.phase === PHASE.NIGHT) this.doNight(room);
    // (ban ngày: phát ngôn bot có thể thêm sau — giữ tối giản)
  }

  /** Mỗi bot còn sống hành động theo vai (lệch nhịp nhẹ). */
  private doNight(room: GameRoom): void {
    const bots = room.alivePlayers().filter((p) => p.isBot() && p.role);
    bots.forEach((bot, i) => {
      setTimeout(() => {
        const cur = room; // closure
        if (cur.phase !== PHASE.NIGHT) return;
        const target = this.pickNightTarget(cur, bot.role!, bot.seat);
        if (target === null) return;
        const action = this.actionOf(bot.role!);
        if (!action) return;
        this.game.nightAction(cur, bot.id, action, target);
      }, 800 + i * 600);
    });
  }

  private actionOf(role: string): string | null {
    switch (role) {
      case ROLE.WEREWOLF: return NIGHT_ACTION.KILL;
      case ROLE.SEER: return NIGHT_ACTION.CHECK;
      case ROLE.GUARD: return NIGHT_ACTION.PROTECT;
      case ROLE.WITCH: return null; // bot Phù thủy giữ bình (an toàn, không tự dùng)
      default: return null;
    }
  }

  /** Chọn mục tiêu đơn giản: Sói cắn người ngoài phe; vai khác soi/chắn ngẫu nhiên. */
  private pickNightTarget(room: GameRoom, role: string, selfSeat: number): number | null {
    const alive = room.alivePlayers();
    if (role === ROLE.WEREWOLF) {
      const prey = alive.filter((p) => p.team !== 'WEREWOLF');
      return prey.length ? prey[Math.floor(Math.random() * prey.length)]!.seat : null;
    }
    const others = alive.filter((p) => p.seat !== selfSeat);
    return others.length ? others[Math.floor(Math.random() * others.length)]!.seat : null;
  }
}
