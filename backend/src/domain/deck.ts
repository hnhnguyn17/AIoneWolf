/**
 * domain/deck.ts — chia bài: build bộ vai theo số người + trộn Fisher-Yates.
 */
import { ROLE_PRESETS, type Role } from '../contracts/index.js';

/** Trộn tại chỗ (Fisher-Yates). */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Bộ bài cho N người: ưu tiên roleConfig truyền vào, không thì lấy preset. */
export function buildDeck(count: number, roleConfig?: Role[] | null): Role[] {
  if (Array.isArray(roleConfig) && roleConfig.length === count) return [...roleConfig];
  const preset = ROLE_PRESETS[count];
  if (!preset)
    throw new Error(
      `Không có preset cho ${count} người (hỗ trợ ${Object.keys(ROLE_PRESETS).join(', ')}).`,
    );
  return [...preset];
}
