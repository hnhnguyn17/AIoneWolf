/**
 * domain/roles/types.ts
 * ─────────────────────────────────────────────────────────────
 * Hợp đồng "1 nơi chung" cho mỗi vai (RoleModule). Mỗi vai khai báo:
 *   - metadata: tên, phe, điểm
 *   - initState: state cá nhân khi vào ván (vd Phù thủy có 2 bình)
 *   - night: hành động ban đêm (chỉ vai có hành động mới khai)
 *   - onDeath: phản ứng khi chết (vd Thợ săn bắn — chưa có ở 5 vai lõi)
 *
 * QUAN TRỌNG: RoleModule chỉ lo INPUT + state riêng. KẾT QUẢ đêm (ai thật sự
 * chết) do GameRoom.resolveNight() tổng hợp tập trung — KHÔNG để mỗi vai tự
 * giết, vì Sói×Bảo vệ×Phù thủy cùng tác động 1 người (cross-cutting).
 */
import type { Role, Team, NightAction } from '../../contracts/index.js';
import type { Player } from '../Player.js';
import type { GameRoom } from '../GameRoom.js';

/** State cá nhân theo vai (mở rộng tùy vai). */
export interface RoleState {
  /** Phù thủy: còn bình cứu / bình độc. */
  potionHeal?: boolean;
  potionPoison?: boolean;
}

/** Định nghĩa hành động ban đêm của 1 vai. */
export interface NightActionDef {
  /** Hành động chính (KILL/PROTECT/CHECK/SAVE...). */
  action: NightAction;
  /** Kiểm tra hành động hợp lệ trước khi ghi buffer. */
  validate(room: GameRoom, actor: Player, targetSeat: number): { ok: boolean; error?: string };
  /** Ghi ý định vào nightBuffer của room (KHÔNG tự giết). */
  apply(room: GameRoom, actor: Player, targetSeat: number): void;
}

/** Module 1 vai — "nơi chung" bảo trợ cho vai đó. */
export interface RoleModule {
  role: Role;
  team: Team;
  label: string;
  /** Điểm cân bằng (dương = lợi cho Dân, âm = lợi cho Sói). */
  points: number;
  /** State cá nhân khởi tạo khi vào ván (mặc định {}). */
  initState?(): RoleState;
  /** Hành động đêm (vai bị động như Dân làng không khai). */
  night?: NightActionDef;
}
