/**
 * data/types.ts — kiểu của các dòng DB (khớp schema.sql).
 */
export interface UserRow {
  wallet: string;
  name: string;
  elo: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  createdAt: string;
  lastLogin: string;
}

export interface SessionRow {
  jti: string;
  wallet: string;
  createdAt: string;
  expiresAt: string;
  revoked: number;
}

export interface AuthAccountRow {
  email: string;
  wallet: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  lastLogin: string;
}

export interface MatchRow {
  id: number;
  wallet: string;
  roomCode: string | null;
  role: string | null;
  team: string | null;
  won: number;
  delta: number;
  eloAfter: number;
  playedAt: string;
}

export interface AttendanceRow {
  id: number;
  roomCode: string;
  wallet: string | null;
  name: string;
  seat: number;
  role: string | null;
  active: number;
  joinedAt: string;
  leftAt: string | null;
}

export interface RoomRow {
  code: string;
  hostWallet: string | null;
  status: string;
  phase: string | null;
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
  endedAt: string | null;
}
