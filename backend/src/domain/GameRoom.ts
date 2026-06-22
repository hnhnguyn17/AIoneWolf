/**
 * domain/GameRoom.ts
 * ─────────────────────────────────────────────────────────────
 * TRÁI TIM hệ thống. 1 phòng = 1 ván. Room TỰ ÔM state (status/phase/cycle)
 * và TỰ CHẠY các hàm tương ứng — mỗi hàm GÁC CỬA theo state (1 cửa mutation).
 *
 * Nguyên tắc (đã chốt khi thiết kế):
 *   - Composition: Room CHỨA Player[]; Player CHỨA role. Không kế thừa.
 *   - resolveNight TẬP TRUNG: Sói×Bảo vệ×Phù thủy cùng tác động → tính 1 chỗ.
 *   - killSeat IDEMPOTENT: chống đệ quy (lover-chain sau này) + double-resolve.
 *   - Multi-wolf: mỗi Sói 1 phiếu → đếm đa số (không ghi đè 1-slot).
 *   - LOW COUPLING: Room KHÔNG import socket/db. Side-effect đi qua callback
 *     `emit` (gọi lên khi có event); persist do tầng ngoài lo.
 */
import {
  PHASE,
  PLAYER_STATUS,
  NIGHT_ACTION,
  ROLE_TEAM,
  type Phase,
  type Role,
  type Team,
  type NightAction,
} from '../contracts/index.js';
import { MAX_PLAYERS } from '../config/constants.js';
import { Player } from './Player.js';
import { getRoleModule } from './roles/index.js';
import { buildDeck, shuffle } from './deck.js';
import { checkWin, type WinResult } from './winCheck.js';

/** Trạng thái vòng đời phòng (khác `phase` của ván trong lúc IN_GAME). */
export const ROOM_STATUS = {
  WAITING: 'WAITING',
  IN_GAME: 'IN_GAME',
  ENDED: 'ENDED',
} as const;
export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

/** Buffer thu thập hành động đêm — resolveNight đọc rồi tính kết quả. */
interface NightBuffer {
  /** seat Sói -> seat nạn nhân con đó chọn (đếm đa số). */
  wolfVotes: Record<number, number>;
  /** Bảo vệ chắn ai. */
  guardSeat: number | null;
  /** Tiên tri soi: ai soi ai. */
  seerCheck: { seerSeat: number; targetSeat: number } | null;
  /** Phù thủy cứu seat nào (thường = nạn nhân Sói). */
  witchSave: number | null;
  /** Phù thủy đầu độc seat nào. */
  witchPoison: number | null;
}

function emptyNightBuffer(): NightBuffer {
  return { wolfVotes: {}, guardSeat: null, seerCheck: null, witchSave: null, witchPoison: null };
}

/** 1 người chết khi resolve (để emit player:died). */
export interface Death {
  seat: number;
  cause: string;
}

/** Callback side-effect — tầng ngoài (service) cắm vào, Room không biết socket. */
export interface RoomHooks {
  /** Tiên tri có kết quả soi (gửi RIÊNG cho Tiên tri). */
  onSeerResult?(seerSeat: number, targetSeat: number, team: Team): void;
}

export class GameRoom {
  readonly roomCode: string;
  hostId: string;
  status: RoomStatus = ROOM_STATUS.WAITING;
  phase: Phase = PHASE.LOBBY;
  cycle = 0;
  deadline: number | null = null;
  maxPlayers: number;

  players: Player[] = [];
  roleConfig: Role[] | null = null;

  nightBuffer: NightBuffer = emptyNightBuffer();
  /** Bảo vệ: ghi nhớ người được chắn đêm trước (không chắn 2 đêm liền). */
  lastGuardedSeat: number | null = null;
  winner: Team | null = null;

  private hooks: RoomHooks;

  constructor(roomCode: string, hostId: string, opts: { maxPlayers?: number; hooks?: RoomHooks } = {}) {
    this.roomCode = roomCode;
    this.hostId = hostId;
    this.maxPlayers = opts.maxPlayers ?? MAX_PLAYERS;
    this.hooks = opts.hooks ?? {};
  }

  /** roundId chống race: mọi mutation mang theo; fire ở round cũ = no-op. */
  get roundId(): string {
    return `${this.cycle}:${this.phase}`;
  }

  // ─── Truy vấn ──────────────────────────────────────────────
  getBySeat(seat: number): Player | undefined {
    return this.players.find((p) => p.seat === seat);
  }
  getById(id: string): Player | undefined {
    return this.players.find((p) => p.id === id);
  }
  alivePlayers(): Player[] {
    return this.players.filter((p) => p.isAlive());
  }
  isFull(): boolean {
    return this.players.length >= this.maxPlayers;
  }

  // ─── WAITING: vào / ra phòng ───────────────────────────────
  addPlayer(opts: { id: string; name: string; wallet?: string | null }): { ok: boolean; error?: string; player?: Player } {
    if (this.status !== ROOM_STATUS.WAITING) return { ok: false, error: 'Ván đã bắt đầu.' };
    if (this.getById(opts.id)) return { ok: true, player: this.getById(opts.id) }; // idempotent
    if (this.isFull()) return { ok: false, error: 'Phòng đã đầy.' };
    const seat = this.nextFreeSeat();
    const player = new Player({ id: opts.id, seat, name: opts.name, wallet: opts.wallet });
    this.players.push(player);
    return { ok: true, player };
  }

  removePlayer(id: string): void {
    const p = this.getById(id);
    if (!p) return;
    if (this.status === ROOM_STATUS.WAITING) {
      // Chưa chơi → bỏ hẳn khỏi danh sách.
      this.players = this.players.filter((x) => x.id !== id);
    } else {
      // Đang chơi → đánh dấu chết (rời giữa ván). AFK-takeover xử lý ở tầng service.
      this.killSeat(p.seat, 'LEAVE', []);
    }
  }

  private nextFreeSeat(): number {
    const used = new Set(this.players.map((p) => p.seat));
    let s = 1;
    while (used.has(s)) s++;
    return s;
  }

  // ─── ASSIGN: bắt đầu ván, chia vai ─────────────────────────
  startGame(roleConfig?: Role[] | null): { ok: boolean; error?: string } {
    if (this.status !== ROOM_STATUS.WAITING) return { ok: false, error: 'Ván đã bắt đầu.' };
    if (this.players.length < 1) return { ok: false, error: 'Chưa có người chơi.' };

    const deck = shuffle(buildDeck(this.players.length, roleConfig));
    this.players.forEach((p, i) => {
      const role = deck[i]!;
      p.role = role;
      p.team = ROLE_TEAM[role];
      p.status = PLAYER_STATUS.ALIVE;
      const mod = getRoleModule(role);
      p.roleState = mod.initState ? mod.initState() : {};
    });
    this.roleConfig = roleConfig ?? null;
    this.status = ROOM_STATUS.IN_GAME;
    // Vào ĐÊM đầu tiên (theo sơ đồ trạng thái SRS: ASSIGN → NIGHT).
    this.beginNight();
    return { ok: true };
  }

  // ─── NIGHT ─────────────────────────────────────────────────
  beginNight(): void {
    this.cycle += 1;
    this.phase = PHASE.NIGHT;
    this.nightBuffer = emptyNightBuffer();
  }

  /**
   * 1 CỬA hành động đêm. Gác cửa state + roundId. Định tuyến theo vai.
   * Phù thủy: action SAVE/POISON đi thẳng vào buffer (cần biết bình nào).
   */
  applyNightAction(
    actorId: string,
    action: NightAction,
    targetSeat: number,
    roundId?: string,
  ): { ok: boolean; error?: string } {
    if (this.status !== ROOM_STATUS.IN_GAME || this.phase !== PHASE.NIGHT)
      return { ok: false, error: 'Không phải ban đêm.' };
    if (roundId && roundId !== this.roundId) return { ok: false, error: 'stale-round' };

    const actor = this.getById(actorId);
    if (!actor || !actor.isAlive() || !actor.role) return { ok: false, error: 'Người chơi không hợp lệ.' };

    // Phù thủy: xử lý riêng 2 bình.
    if (actor.role === 'WITCH') return this.applyWitch(actor, action, targetSeat);

    const mod = getRoleModule(actor.role);
    if (!mod.night) return { ok: false, error: 'Vai này không hành động ban đêm.' };
    if (mod.night.action !== action) return { ok: false, error: 'Sai hành động cho vai.' };

    const v = mod.night.validate(this, actor, targetSeat);
    if (!v.ok) return { ok: false, error: v.error };
    mod.night.apply(this, actor, targetSeat);

    // Tiên tri: trả kết quả NGAY cho người soi (qua hook).
    if (action === NIGHT_ACTION.CHECK) {
      const target = this.getBySeat(targetSeat);
      if (target) this.hooks.onSeerResult?.(actor.seat, targetSeat, target.team!);
    }
    return { ok: true };
  }

  private applyWitch(actor: Player, action: NightAction, targetSeat: number): { ok: boolean; error?: string } {
    if (action === NIGHT_ACTION.SAVE) {
      if (!actor.roleState.potionHeal) return { ok: false, error: 'Đã dùng hết bình cứu.' };
      this.nightBuffer.witchSave = targetSeat;
      actor.roleState.potionHeal = false;
      return { ok: true };
    }
    if (action === NIGHT_ACTION.POISON) {
      if (!actor.roleState.potionPoison) return { ok: false, error: 'Đã dùng hết bình độc.' };
      const target = this.getBySeat(targetSeat);
      if (!target || !target.isAlive()) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
      this.nightBuffer.witchPoison = targetSeat;
      actor.roleState.potionPoison = false;
      return { ok: true };
    }
    return { ok: false, error: 'Phù thủy chỉ dùng cứu hoặc độc.' };
  }

  /**
   * resolveNight TẬP TRUNG: đọc toàn bộ buffer → tính ai chết → chuyển DAY_ANNOUNCE.
   * Thứ tự: chốt nạn nhân Sói (đa số) → Bảo vệ/Phù thủy cứu → cộng độc.
   */
  resolveNight(): { deaths: Death[] } {
    const deaths: Death[] = [];
    const wolfTarget = this.tallyWolfVotes();

    // Sói cắn — trừ khi được Bảo vệ chắn HOẶC Phù thủy cứu.
    if (wolfTarget !== null) {
      const guarded = this.nightBuffer.guardSeat === wolfTarget;
      const saved = this.nightBuffer.witchSave === wolfTarget;
      if (!guarded && !saved) this.killSeat(wolfTarget, 'WOLF', deaths);
    }
    // Phù thủy độc — xuyên mọi giáp (guard/cứu không chặn độc).
    if (this.nightBuffer.witchPoison !== null) {
      this.killSeat(this.nightBuffer.witchPoison, 'POISON', deaths);
    }

    this.lastGuardedSeat = this.nightBuffer.guardSeat;
    this.phase = PHASE.DAY_ANNOUNCE;
    return { deaths };
  }

  /** Đếm phiếu Sói → seat đa số. Hòa → seat nhỏ nhất (tất định). */
  private tallyWolfVotes(): number | null {
    const votes = Object.values(this.nightBuffer.wolfVotes);
    if (votes.length === 0) return null;
    const count = new Map<number, number>();
    for (const seat of votes) count.set(seat, (count.get(seat) ?? 0) + 1);
    let best: number | null = null;
    let bestN = -1;
    for (const [seat, n] of [...count.entries()].sort((a, b) => a[0] - b[0])) {
      if (n > bestN) {
        best = seat;
        bestN = n;
      }
    }
    return best;
  }

  /** Giết 1 ghế — IDEMPOTENT (đã chết → no-op, chống đệ quy/double). */
  killSeat(seat: number, cause: string, deaths: Death[]): void {
    const p = this.getBySeat(seat);
    if (!p || p.status === PLAYER_STATUS.DEAD) return;
    p.status = PLAYER_STATUS.DEAD;
    deaths.push({ seat, cause });
    // (Hook onDeath cho Thợ săn/Cupid sẽ thêm ở đây sau — đã idempotent sẵn.)
  }

  // ─── DAY ───────────────────────────────────────────────────
  beginDiscuss(): void {
    this.phase = PHASE.DAY_DISCUSS;
  }
  beginVote(): void {
    this.phase = PHASE.VOTE;
    this.votes.clear();
  }

  // ─── VOTE ──────────────────────────────────────────────────
  private votes = new Map<number, number | null>(); // voterSeat -> targetSeat|null

  castVote(voterSeat: number, targetSeat: number | null, roundId?: string): { ok: boolean; error?: string; tally?: Record<number, number> } {
    if (this.status !== ROOM_STATUS.IN_GAME || this.phase !== PHASE.VOTE)
      return { ok: false, error: 'Không phải lúc bỏ phiếu.' };
    if (roundId && roundId !== this.roundId) return { ok: false, error: 'stale-round' };
    const voter = this.getBySeat(voterSeat);
    if (!voter || !voter.isAlive()) return { ok: false, error: 'Người bỏ phiếu không hợp lệ.' };
    if (targetSeat !== null) {
      const target = this.getBySeat(targetSeat);
      if (!target || !target.isAlive()) return { ok: false, error: 'Mục tiêu không hợp lệ.' };
    }
    this.votes.set(voterSeat, targetSeat);
    return { ok: true, tally: this.voteTally() };
  }

  voteTally(): Record<number, number> {
    const tally: Record<number, number> = {};
    for (const target of this.votes.values()) {
      if (target === null) continue;
      tally[target] = (tally[target] ?? 0) + 1;
    }
    return tally;
  }

  /** Chốt vote → treo cổ người nhiều phiếu nhất (hòa → không ai chết). */
  resolveVote(): { lynchedSeat: number | null; tie: boolean; deaths: Death[] } {
    const tally = this.voteTally();
    const entries = Object.entries(tally).map(([s, n]) => [Number(s), n] as [number, number]);
    const deaths: Death[] = [];
    if (entries.length === 0) return { lynchedSeat: null, tie: false, deaths };

    const maxN = Math.max(...entries.map((e) => e[1]));
    const top = entries.filter((e) => e[1] === maxN);
    if (top.length > 1) return { lynchedSeat: null, tie: true, deaths }; // hòa

    const lynchedSeat = top[0]![0];
    this.killSeat(lynchedSeat, 'LYNCH', deaths);
    return { lynchedSeat, tie: false, deaths };
  }

  // ─── WIN ───────────────────────────────────────────────────
  checkWin(): WinResult {
    const res = checkWin(this.players);
    if (res.over) {
      this.winner = res.winner!;
      this.status = ROOM_STATUS.ENDED;
      this.phase = PHASE.GAME_OVER;
    }
    return res;
  }

  // ─── Serialize cho client ──────────────────────────────────
  toPublicState(reveal = false) {
    return {
      roomCode: this.roomCode,
      hostId: this.hostId,
      status: this.status,
      phase: this.phase,
      cycle: this.cycle,
      deadline: this.deadline,
      maxPlayers: this.maxPlayers,
      players: this.players.map((p) => p.toPublic(reveal || this.status === ROOM_STATUS.ENDED)),
    };
  }
}
