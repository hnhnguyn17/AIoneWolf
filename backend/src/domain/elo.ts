/**
 * domain/elo.ts — tính ELO theo SRS 5.3.2.
 *   ΔELO = (điểm chuẩn × hệ số vai) + điểm khuyến khích
 *   chuẩn: thắng +15 / thua −10
 *   hệ số: Dân thường 1.0 / Dân có năng lực 1.3 / Sói 1.5
 *   khuyến khích: sống tới cuối (Dân/Sói) +5 ; chết nhưng team thắng +0 ;
 *                 sống nhưng team thua −2
 */
import { TEAM, ROLE, type Role, type Team } from '../contracts/index.js';

const POWER_VILLAGE_ROLES: Role[] = [ROLE.SEER, ROLE.GUARD, ROLE.WITCH];

function roleFactor(role: Role, team: Team): number {
  if (team === TEAM.WEREWOLF) return 1.5;
  if (POWER_VILLAGE_ROLES.includes(role)) return 1.3;
  return 1.0;
}

export interface MatchOutcome {
  role: Role;
  team: Team;
  won: boolean;
  survived: boolean;
}

/** ΔELO của 1 người sau ván. */
export function computeEloDelta(o: MatchOutcome): number {
  const base = o.won ? 15 : -10;
  let delta = base * roleFactor(o.role, o.team);
  if (o.won && o.survived) delta += 5; // sống tới cuối, team thắng
  if (!o.won && o.survived) delta -= 2; // sống nhưng team thua
  return Math.round(delta);
}

/** Hạng theo ELO (SRS 5.3.1). */
export function rankOf(elo: number): string {
  if (elo > 2000) return 'Chúa Tể';
  if (elo >= 1500) return 'Ma Sói';
  if (elo >= 1000) return 'Thợ Săn';
  return 'Tân Binh';
}
