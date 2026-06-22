/**
 * domain/Player.ts
 * ─────────────────────────────────────────────────────────────
 * 1 người trong ván (người THẬT hoặc bot — GIỐNG NHAU về data).
 * Composition: Player CHỨA role (1 field đổi được), KHÔNG kế thừa role.
 * → vai đổi giữa ván (AFK→bot, hóa Sói...) chỉ cần gán lại player.role.
 *
 * Khác biệt người/bot KHÔNG nằm ở đây mà ở "nguồn quyết định hành động"
 * (người = socket; bot = botBrain service) — xem socket/handlers + services/bot.
 */
import { PLAYER_STATUS, type Role, type Team, type PlayerStatus } from '../contracts/index.js';
import { BOT_ID_PREFIX } from '../config/constants.js';
import type { RoleState } from './roles/types.js';
import type { PublicPlayer } from '../contracts/events.js';

export class Player {
  id: string;
  seat: number;
  name: string;
  /** ví Solana nếu là người đã đăng nhập (để ghi ELO/lịch sử). */
  wallet: string | null;

  role: Role | null = null;
  team: Team | null = null;
  status: PlayerStatus = PLAYER_STATUS.ALIVE;
  /** state cá nhân theo vai (vd Phù thủy: 2 bình). */
  roleState: RoleState = {};

  constructor(opts: { id: string; seat: number; name: string; wallet?: string | null }) {
    this.id = opts.id;
    this.seat = opts.seat;
    this.name = opts.name;
    this.wallet = opts.wallet ?? null;
  }

  isBot(): boolean {
    return this.id.startsWith(BOT_ID_PREFIX);
  }

  isAlive(): boolean {
    return this.status === PLAYER_STATUS.ALIVE;
  }

  /** Serialize an toàn để gửi client. `reveal` = lộ vai (đã chết / hết ván). */
  toPublic(reveal = false): PublicPlayer {
    return {
      id: this.id,
      seat: this.seat,
      name: this.name,
      status: this.status,
      isBot: this.isBot(),
      role: reveal || !this.isAlive() ? this.role : null,
    };
  }
}
