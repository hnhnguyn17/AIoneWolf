/**
 * src/lib/roleCatalog.js
 * ─────────────────────────────────────────────────────────────
 * Danh mục vai Ma Sói, chia BASIC (cơ bản) và ADVANCED (nâng cao) +
 * các GÓI ĐỀ XUẤT (preset) để chủ phòng chọn nhanh.
 *
 * key: trùng ROLE enum nếu là vai lõi (đã có logic backend); các vai
 * nâng cao chưa có logic backend được đánh dấu `wip:true` (chọn để demo
 * UI, logic bổ sung sau).
 */
import { ROLE, TEAM } from './contracts.js';

// team: 'VILLAGE' | 'WEREWOLF' | 'THIRD'
export const ROLE_CATALOG = {
  basic: [
    { key: ROLE.VILLAGER, name: 'Dân làng', team: TEAM.VILLAGE, icon: 'person',
      desc: 'Không có kỹ năng. Ban ngày bỏ phiếu treo cổ kẻ tình nghi.' },
    { key: ROLE.WEREWOLF, name: 'Sói', team: TEAM.WEREWOLF, icon: 'pets',
      desc: 'Mỗi đêm cùng đồng bọn chọn cắn một người.' },
    { key: ROLE.SEER, name: 'Tiên tri', team: TEAM.VILLAGE, icon: 'visibility',
      desc: 'Mỗi đêm soi một người để biết phe Sói hay Dân.' },
    { key: ROLE.GUARD, name: 'Bảo vệ', team: TEAM.VILLAGE, icon: 'shield',
      desc: 'Mỗi đêm chắn một người (không chắn cùng người 2 đêm liên tiếp).' },
    { key: ROLE.WITCH, name: 'Phù thủy', team: TEAM.VILLAGE, icon: 'science',
      desc: '1 bình cứu + 1 bình độc, mỗi loại dùng 1 lần cả ván.' },
  ],
  advanced: [
    { key: 'HUNTER', name: 'Thợ săn', team: TEAM.VILLAGE, icon: 'my_location', wip: true,
      desc: 'Khi chết được bắn theo một người bất kỳ.' },
    { key: 'CUPID', name: 'Thần Tình Yêu', team: TEAM.THIRD, icon: 'favorite', wip: true,
      desc: 'Đêm đầu ghép đôi 2 người; nếu một chết, người kia chết theo.' },
    { key: 'ELDER', name: 'Già làng', team: TEAM.VILLAGE, icon: 'elderly', wip: true,
      desc: 'Chịu được một lần bị Sói cắn mới chết.' },
    { key: 'WHITE_WOLF', name: 'Sói trắng', team: TEAM.WEREWOLF, icon: 'dark_mode', wip: true,
      desc: 'Sói đơn độc, cách đêm có thể cắn cả Sói khác để thắng một mình.' },
    { key: 'IDIOT', name: 'Thằng Ngố', team: TEAM.VILLAGE, icon: 'sentiment_dissatisfied', wip: true,
      desc: 'Nếu bị treo cổ thì lộ thân phận và được tha (mất quyền bỏ phiếu).' },
    { key: 'WOLF_SEER', name: 'Sói Tiên tri', team: TEAM.WEREWOLF, icon: 'remove_red_eye', wip: true,
      desc: 'Sói có khả năng soi như Tiên tri.' },
    { key: 'PIPER', name: 'Người Thổi Sáo', team: TEAM.THIRD, icon: 'music_note', wip: true,
      desc: 'Phe thứ 3: mỗi đêm mê hoặc người chơi; thắng khi mê hoặc hết.' },
  ],
};

// Gói đề xuất theo số người — chọn 1 phát là set roleCounts.
export const ROLE_PACKAGES = [
  {
    id: 'classic6', name: 'Cổ điển 6 người', size: 6,
    desc: '2 Sói · Tiên tri · Bảo vệ · 2 Dân',
    counts: { [ROLE.WEREWOLF]: 2, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.VILLAGER]: 2 },
  },
  {
    id: 'witch8', name: 'Phù thủy 8 người', size: 8,
    desc: '2 Sói · Tiên tri · Bảo vệ · Phù thủy · 3 Dân',
    counts: { [ROLE.WEREWOLF]: 2, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.WITCH]: 1, [ROLE.VILLAGER]: 3 },
  },
  {
    id: 'hunter10', name: 'Thợ săn 10 người', size: 10,
    desc: '3 Sói · Tiên tri · Bảo vệ · Phù thủy · Thợ săn · 3 Dân',
    counts: { [ROLE.WEREWOLF]: 3, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.WITCH]: 1, HUNTER: 1, [ROLE.VILLAGER]: 3 },
  },
  {
    id: 'cupid12', name: 'Tình yêu 12 người', size: 12,
    desc: '3 Sói · Tiên tri · Bảo vệ · Phù thủy · Cupid · Thợ săn · 4 Dân',
    counts: { [ROLE.WEREWOLF]: 3, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.WITCH]: 1, CUPID: 1, HUNTER: 1, [ROLE.VILLAGER]: 4 },
  },
];

// Map nhanh key -> meta (cả basic + advanced).
export const ROLE_META = [...ROLE_CATALOG.basic, ...ROLE_CATALOG.advanced].reduce(
  (acc, r) => { acc[r.key] = r; return acc; },
  {},
);

export const TEAM_COLOR = {
  [TEAM.VILLAGE]: 'text-surface-tint border-surface-tint/40',
  [TEAM.WEREWOLF]: 'text-error border-error/40',
  [TEAM.THIRD]: 'text-on-tertiary-container border-tertiary/40',
};
