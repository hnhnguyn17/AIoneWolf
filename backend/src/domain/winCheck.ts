/**
 * domain/winCheck.ts — xác định ván kết thúc chưa + phe thắng.
 * Luật cơ bản: Sói chết hết → Dân thắng; Sói ≥ phần còn lại → Sói thắng.
 */
import { TEAM, type Team } from '../contracts/index.js';
import type { Player } from './Player.js';

export interface WinResult {
  over: boolean;
  winner?: Team;
}

export function checkWin(players: Player[]): WinResult {
  const alive = players.filter((p) => p.isAlive());
  const wolves = alive.filter((p) => p.team === TEAM.WEREWOLF).length;
  const others = alive.length - wolves;

  if (wolves === 0) return { over: true, winner: TEAM.VILLAGE };
  if (wolves >= others) return { over: true, winner: TEAM.WEREWOLF };
  return { over: false };
}
