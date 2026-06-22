/**
 * src/lib/roleCatalog.js
 * ─────────────────────────────────────────────────────────────
 * Danh mục vai Ma Sói (57 vai): BASIC (5 vai lõi có logic backend) +
 * ADVANCED (52 vai nâng cao, wip:true — chọn để cấu hình/demo, logic bổ sung sau).
 *
 * Export:
 *   ROLE_CATALOG.basic / .advanced  — cho tab/cũ.
 *   ALL_ROLES                       — mảng phẳng MỌI vai (cho box search RoleAddPicker).
 *   ROLE_META                       — map key -> meta.
 *   ROLE_PACKAGES                   — gói đề xuất (preset).
 *   TEAM_COLOR / TEAM_LABEL         — màu và nhãn.
 */
import { ROLE, TEAM } from './contracts.js';

export const THIRD = 'THIRD';

export const ROLE_POINTS = {
  [ROLE.SEER]: 7,
  [ROLE.WITCH]: 4,
  APPRENTICE_SEER: 4,
  NURSE: 4,
  VILLAGE_DRUNK: 4,
  MARKSMAN: 4,
  [ROLE.GUARD]: 3,
  HUNTER: 3,
  PRIEST: 3,
  PRINCE: 3,
  BODYGUARD: 3,
  ORACLE: 3,
  ELDER: 2,
  TROUBLEMAKER: 2,
  GHOST: 2,
  [ROLE.VILLAGER]: 1,
  WOLF_CUB: -8,
  SERIAL_KILLER: -8,
  ARSONIST: -8,
  PLAGUE_DOCTOR: -8,
  VAMPIRE: -7,
  [ROLE.WEREWOLF]: -6,
  HEADHUNTER: -6,
  ALPHA_WOLF: -6,
  BOSS_WOLF: -6,
  LONE_WOLF: -5,
  DIRE_WOLF: -4,
  CURSED_WOLF: -3,
  WOLF_MYSTIC: -3,
  SORCERER: -3,
  CUPID: -3,
  DOPPELGANGER: -2,
  PACIFIST: -1,
  EXECUTIONER: -1,
  JESTER: -1,
  FOOL: -1,
  SURVIVOR: 0,
};

const BASIC = [
  { key: ROLE.VILLAGER, name: 'Dân làng', team: TEAM.VILLAGE, icon: 'person', desc: 'Không kỹ năng. Ban ngày bỏ phiếu treo cổ kẻ tình nghi.' },
  { key: ROLE.WEREWOLF, name: 'Sói', team: TEAM.WEREWOLF, icon: 'pets', desc: 'Mỗi đêm cùng đồng bọn chọn cắn một người.' },
  { key: ROLE.SEER, name: 'Tiên tri', team: TEAM.VILLAGE, icon: 'visibility', desc: 'Mỗi đêm soi một người để biết phe Sói hay Dân.' },
  { key: ROLE.GUARD, name: 'Bảo vệ', team: TEAM.VILLAGE, icon: 'shield', desc: 'Mỗi đêm chắn một người (không chắn cùng người 2 đêm liên tiếp).' },
  { key: ROLE.WITCH, name: 'Phù thủy', team: TEAM.VILLAGE, icon: 'science', desc: '1 bình cứu + 1 bình độc, mỗi loại dùng 1 lần cả ván.' },
];

const ADVANCED = [
  // Phe DÂN
  { key: 'HUNTER', name: 'Thợ săn', team: TEAM.VILLAGE, icon: 'my_location', desc: 'Khi chết được bắn theo một người bất kỳ.' },
  { key: 'ELDER', name: 'Già làng', team: TEAM.VILLAGE, icon: 'elderly', desc: 'Chịu được một lần bị Sói cắn mới chết.' },
  { key: 'IDIOT', name: 'Thằng Ngố', team: TEAM.VILLAGE, icon: 'sentiment_dissatisfied', desc: 'Bị treo cổ thì lộ thân phận và được tha, mất quyền vote.' },
  { key: 'BODYGUARD', name: 'Vệ sĩ', team: TEAM.VILLAGE, icon: 'security', desc: 'Mỗi đêm bảo vệ một người, có thể hi sinh thay họ.' },
  { key: 'PRIEST', name: 'Linh mục', team: TEAM.VILLAGE, icon: 'church', desc: 'Một lần ban thánh thuỷ tiêu diệt Sói nếu đoán đúng.' },
  { key: 'APPRENTICE_SEER', name: 'Tiên tri tập sự', team: TEAM.VILLAGE, icon: 'visibility', desc: 'Trở thành Tiên tri khi Tiên tri chính chết.' },
  { key: 'PRINCE', name: 'Hoàng tử', team: TEAM.VILLAGE, icon: 'workspace_premium', desc: 'Lần đầu bị treo cổ được tha và lộ thân phận.' },
  { key: 'MARKSMAN', name: 'Xạ thủ', team: TEAM.VILLAGE, icon: 'gps_fixed', desc: 'Hai lần cả ván được bắn một người vào ban đêm.' },
  { key: 'NURSE', name: 'Y tá', team: TEAM.VILLAGE, icon: 'medical_services', desc: 'Hồi sinh kỹ năng cho người hỗ trợ đã chết.' },
  { key: 'GRAVE_KEEPER', name: 'Phu mộ', team: TEAM.VILLAGE, icon: 'deceased', desc: 'Biết vai của người vừa chết mỗi sáng.' },
  { key: 'PACIFIST', name: 'Người hoà giải', team: TEAM.VILLAGE, icon: 'volunteer_activism', desc: 'Một lần huỷ toàn bộ phiếu treo cổ trong ngày.' },
  { key: 'ORACLE', name: 'Nhà tiên tri', team: TEAM.VILLAGE, icon: 'auto_awesome', desc: 'Mỗi đêm biết một vai KHÔNG có mặt trong số người chỉ định.' },
  { key: 'WATCHER', name: 'Người canh gác', team: TEAM.VILLAGE, icon: 'visibility_lock', desc: 'Biết ai đã tới thăm một người trong đêm.' },
  { key: 'TROUBLEMAKER', name: 'Kẻ gây rối', team: TEAM.VILLAGE, icon: 'bolt', desc: 'Một lần ép cả làng vote 2 người trong cùng ngày.' },
  { key: 'VILLAGE_DRUNK', name: 'Bợm nhậu', team: TEAM.VILLAGE, icon: 'sports_bar', desc: 'Vài đêm đầu say, sau đó nhận một vai ngẫu nhiên.' },

  // Phe SÓI
  { key: 'WOLF_SEER', name: 'Sói Tiên tri', team: TEAM.WEREWOLF, icon: 'remove_red_eye', desc: 'Sói có khả năng soi như Tiên tri.' },
  { key: 'ALPHA_WOLF', name: 'Sói đầu đàn', team: TEAM.WEREWOLF, icon: 'pets', desc: 'Một lần biến nạn nhân thành Sói thay vì giết.' },
  { key: 'BOSS_WOLF', name: 'Sói Trùm', team: TEAM.WEREWOLF, icon: 'crown', desc: 'Thủ lĩnh bầy Sói, được tính như một lợi thế mạnh cho phe Sói.' },
  { key: 'WOLF_CUB', name: 'Sói con', team: TEAM.WEREWOLF, icon: 'child_care', desc: 'Khi chết, đêm sau bầy Sói được cắn 2 người.' },
  { key: 'SHADOW_WOLF', name: 'Sói bóng đêm', team: TEAM.WEREWOLF, icon: 'nights_stay', desc: 'Ẩn khỏi mọi khả năng soi của phe Dân.' },
  { key: 'SORCERER', name: 'Phù thuỷ hắc ám', team: TEAM.WEREWOLF, icon: 'auto_fix_high', desc: 'Mỗi đêm soi tìm Tiên tri để báo cho bầy Sói.' },
  { key: 'WOLF_SHAMAN', name: 'Sói pháp sư', team: TEAM.WEREWOLF, icon: 'whatshot', desc: 'Mỗi đêm yểm bùa che giấu một Sói khỏi bị soi.' },
  { key: 'DIRE_WOLF', name: 'Sói khổng lồ', team: TEAM.WEREWOLF, icon: 'cruelty_free', desc: 'Gắn bó một người; người đó chết thì Sói cũng chết.' },
  { key: 'LONE_WOLF', name: 'Sói lạc đàn', team: TEAM.WEREWOLF, icon: 'hiking', desc: 'Thuộc phe Sói nhưng chỉ thắng khi sống tới cuối một mình.' },
  { key: 'WOLF_MYSTIC', name: 'Sói huyền bí', team: TEAM.WEREWOLF, icon: 'blur_circular', desc: 'Mỗi đêm biết số người có kỹ năng đứng cạnh mình.' },
  { key: 'CURSED_WOLF', name: 'Sói nguyền', team: TEAM.WEREWOLF, icon: 'skull', desc: 'Một lần khiến nạn nhân không thể được cứu trong đêm.' },

  // Phe THỨ 3
  { key: 'CUPID', name: 'Thần Tình Yêu', team: THIRD, icon: 'favorite', desc: 'Đêm đầu ghép đôi 2 người; một chết thì người kia chết theo.' },
  { key: 'PIPER', name: 'Người Thổi Sáo', team: THIRD, icon: 'music_note', desc: 'Mỗi đêm mê hoặc người chơi; thắng khi mê hoặc tất cả.' },
  { key: 'TANNER', name: 'Thợ thuộc da', team: THIRD, icon: 'checkroom', desc: 'Chỉ thắng nếu bị làng treo cổ.' },
  { key: 'SERIAL_KILLER', name: 'Sát nhân hàng loạt', team: THIRD, icon: 'mood_bad', desc: 'Mỗi đêm tự giết một người; thắng khi còn lại một mình.' },
  { key: 'JESTER', name: 'Thằng Hề', team: THIRD, icon: 'mood', desc: 'Thắng nếu khiến làng vote treo cổ chính mình.' },
  { key: 'WITCH_HUNTER', name: 'Thợ săn phù thuỷ', team: THIRD, icon: 'local_fire_department', desc: 'Săn người có kỹ năng; thắng khi diệt hết phe phép thuật.' },
  { key: 'FOOL', name: 'Kẻ Ngốc', team: THIRD, icon: 'sentiment_very_dissatisfied', desc: 'Soi như Tiên tri nhưng kết quả luôn bị đảo ngược.' },
  { key: 'PLAGUE_DOCTOR', name: 'Bác sĩ dịch hạch', team: THIRD, icon: 'masks', desc: 'Reo rắc dịch; người nhiễm lây sang người ngồi cạnh.' },
  { key: 'GHOST', name: 'Hồn ma', team: THIRD, icon: 'mode_night', desc: 'Đã chết nhưng mỗi đêm để lại một chữ cái cho làng.' },
  { key: 'ARSONIST', name: 'Kẻ phóng hoả', team: THIRD, icon: 'fireplace', desc: 'Tẩm dầu nhiều người, một đêm châm lửa giết tất cả.' },
  { key: 'DOPPELGANGER', name: 'Kẻ song trùng', team: THIRD, icon: 'people_alt', desc: 'Đêm đầu chọn một người, nhận vai của họ khi họ chết.' },
  { key: 'VAMPIRE', name: 'Ma cà rồng', team: THIRD, icon: 'bloodtype', desc: 'Mỗi đêm cắn hút máu; nạn nhân dần thành ma cà rồng.' },
  { key: 'HEADHUNTER', name: 'Thợ săn tiền thưởng', team: THIRD, icon: 'paid', desc: 'Được giao một mục tiêu; thắng nếu mục tiêu bị treo cổ.' },
  { key: 'EXECUTIONER', name: 'Đao phủ', team: THIRD, icon: 'gavel', desc: 'Ép làng treo cổ mục tiêu của mình để thắng.' },
  { key: 'SURVIVOR', name: 'Người sống sót', team: THIRD, icon: 'self_improvement', desc: 'Không phe; chỉ cần sống tới khi ván kết thúc là thắng.' },
].map((r) => ({ ...r, wip: true }));

export const ROLE_CATALOG = { basic: BASIC, advanced: ADVANCED };

// Mảng phẳng MỌI vai
export const ALL_ROLES = [...BASIC, ...ADVANCED].map((r) => ({
  ...r,
  points: ROLE_POINTS[r.key] ?? 0,
}));

// Map nhanh key -> meta
export const ROLE_META = ALL_ROLES.reduce((acc, r) => { acc[r.key] = r; return acc; }, {});

// Gói đề xuất theo số người
export const ROLE_PACKAGES = [
  { id: 'matchmaking8', name: 'Ghép trận 8 người', size: 8,
    desc: 'Tiên tri · Bảo vệ · Phù thuỷ · 3 Sói · 2 Dân',
    counts: { [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.WITCH]: 1, [ROLE.WEREWOLF]: 3, [ROLE.VILLAGER]: 2 } },
  { id: 'matchmaking12', name: 'Ghép trận 12 người', size: 12,
    desc: 'Tiên tri · Bảo vệ · Thợ săn · Phù thuỷ · 4 Sói · 4 Dân',
    counts: { [ROLE.SEER]: 1, [ROLE.GUARD]: 1, HUNTER: 1, [ROLE.WITCH]: 1, [ROLE.WEREWOLF]: 4, [ROLE.VILLAGER]: 4 } },
  { id: 'matchmaking15', name: 'Ghép trận 15 người', size: 15,
    desc: 'Tiên tri · Bảo vệ · Thợ săn · Phù thủy · 4 Sói · 7 Dân',
    counts: { [ROLE.SEER]: 1, [ROLE.GUARD]: 1, HUNTER: 1, [ROLE.WITCH]: 1, [ROLE.WEREWOLF]: 4, [ROLE.VILLAGER]: 7 } },
  { id: 'classic6', name: 'Cổ điển 6 người', size: 6,
    desc: '2 Sói · Tiên tri · Bảo vệ · 2 Dân',
    counts: { [ROLE.WEREWOLF]: 2, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.VILLAGER]: 2 } },
  { id: 'witch8', name: 'Phù thuỷ 8 người', size: 8,
    desc: '3 Sói · Tiên tri · Bảo vệ · Phù thuỷ · 2 Dân',
    counts: { [ROLE.WEREWOLF]: 3, [ROLE.SEER]: 1, [ROLE.GUARD]: 1, [ROLE.WITCH]: 1, [ROLE.VILLAGER]: 2 } },
];

export function roleBalanceScore(counts = {}) {
  return Object.entries(counts).reduce(
    (sum, [key, count]) => sum + (ROLE_POINTS[key] ?? 0) * count,
    0,
  );
}

export function balanceTone(score) {
  return Math.abs(score) <= 2 ? 'text-surface-tint' : 'text-error';
}

export const TEAM_COLOR = {
  [TEAM.VILLAGE]: 'text-surface-tint border-surface-tint/40',
  [TEAM.WEREWOLF]: 'text-error border-error/40',
  [THIRD]: 'text-on-tertiary-container border-tertiary/40',
};

export const TEAM_LABEL = {
  [TEAM.VILLAGE]: 'Phe Dân',
  [TEAM.WEREWOLF]: 'Phe Sói',
  [THIRD]: 'Phe thứ 3',
};
