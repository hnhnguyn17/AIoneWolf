/**
 * src/lib/rank.js
 * ─────────────────────────────────────────────────────────────
 * Hệ thống phân hạng theo ELO (khớp backend/src/game/elo.js → RANKS):
 *   - Tân Binh  (Bronze)  : < 1000
 *   - Thợ Săn   (Silver)  : 1000–1500
 *   - Ma Sói    (Gold)    : 1500–2000
 *   - Chúa Tể   (Diamond) : > 2000  (đủ điều kiện đúc NFT Avatar độc quyền)
 *
 * Mỗi tier kèm "skin" UI (màu viền / glow / icon) cho phần redesign.
 */

// Sắp tăng dần theo `min` để tính progress tới mốc kế tiếp.
export const RANK_TIERS = [
  {
    key: 'BRONZE',
    name: 'Tân Binh',
    metal: 'Bronze',
    min: 0,
    title: 'Kẻ Tập Sự Trong Bóng Tối',
    accent: '#c08a4d',
    ring: 'border-[#c08a4d]/60',
    text: 'text-[#e8b98a]',
    glow: '0 0 18px rgba(192,138,77,0.35)',
    icon: 'sentiment_satisfied',
    canMintNft: false,
  },
  {
    key: 'SILVER',
    name: 'Thợ Săn',
    metal: 'Silver',
    min: 1000,
    title: 'Thợ Săn Đêm Trường',
    accent: '#cdd7df',
    ring: 'border-[#cdd7df]/60',
    text: 'text-[#e8eef3]',
    glow: '0 0 20px rgba(205,215,223,0.4)',
    icon: 'visibility',
    canMintNft: false,
  },
  {
    key: 'GOLD',
    name: 'Ma Sói',
    metal: 'Gold',
    min: 1500,
    title: 'Ma Sói Khát Máu',
    accent: '#ffce4d',
    ring: 'border-[#ffce4d]/70',
    text: 'text-[#ffe9a8]',
    glow: '0 0 26px rgba(255,206,77,0.5)',
    icon: 'pets',
    canMintNft: false,
  },
  {
    key: 'DIAMOND',
    name: 'Chúa Tể',
    metal: 'Diamond',
    min: 2000,
    title: 'Chúa Tể Của Đêm',
    accent: '#7af5ff',
    ring: 'border-[#7af5ff]/80',
    text: 'text-[#caffff]',
    glow: '0 0 32px rgba(122,245,255,0.65)',
    icon: 'diamond',
    canMintNft: true,
  },
];

/** Trả tier UI theo ELO (cao nhất mà elo >= min). */
export function tierForElo(elo) {
  const e = Number.isFinite(elo) ? elo : 0;
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (e >= t.min) tier = t;
  }
  return tier;
}

/** Khớp rank từ backend ({key,name,min}) sang tier UI; fallback theo elo. */
export function tierFromRank(rank, elo) {
  if (rank?.key) {
    const found = RANK_TIERS.find((t) => t.key === rank.key);
    if (found) return found;
  }
  return tierForElo(elo);
}

/**
 * Tính tiến độ tới mốc hạng kế tiếp.
 * @returns {{ pct:number, current:object, next:object|null, nextMin:number, remaining:number, isMax:boolean }}
 */
export function rankProgress(elo) {
  const e = Number.isFinite(elo) ? elo : 0;
  const current = tierForElo(e);
  const idx = RANK_TIERS.findIndex((t) => t.key === current.key);
  const next = idx < RANK_TIERS.length - 1 ? RANK_TIERS[idx + 1] : null;

  if (!next) {
    // Đã ở hạng cao nhất — thanh đầy.
    return { pct: 100, current, next: null, nextMin: current.min, remaining: 0, isMax: true };
  }

  const span = next.min - current.min;
  const into = e - current.min;
  const pct = Math.max(0, Math.min(100, Math.round((into / span) * 100)));
  return {
    pct,
    current,
    next,
    nextMin: next.min,
    remaining: Math.max(0, next.min - e),
    isMax: false,
  };
}
