/**
 * config/constants.ts
 * ─────────────────────────────────────────────────────────────
 * Hằng số game (1 nguồn magic number). Thời lượng pha, giới hạn người chơi.
 */

/** Số người tối thiểu / tối đa cho 1 phòng. */
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

/** Thời lượng mỗi pha (ms). null = chờ điều kiện, không tự hết giờ. */
export const PHASE_DURATION = {
  LOBBY: null,
  NIGHT: 35_000,
  DAY_ANNOUNCE: 6_000,
  DAY_DISCUSS: 45_000,
  VOTE: 30_000,
  GAME_OVER: null,
} as const;

/** Tiền tố id để phân biệt bot với người (player.isBot suy từ đây). */
export const BOT_ID_PREFIX = 'bot_';

/** Độ dài mã phòng sinh ngẫu nhiên. */
export const ROOM_CODE_LENGTH = 4;
