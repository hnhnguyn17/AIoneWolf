/**
 * services/ai/gmService.ts
 * ─────────────────────────────────────────────────────────────
 * AI Quản trò = CÁI LOA của Room. KHÔNG quyết định gì về ván — chỉ nghe
 * event Room phát (onGameStart/onNightResolved/onVoteResolved/onGameOver)
 * rồi DIỄN ĐẠT thành lời + phát ra:
 *   - emit gm:speak (FE hiện bong bóng + đọc bằng Web Speech — luôn có)
 *   - convoai.speakInChannel (phát tiếng qua Agora — nếu agent bật)
 * Lời = LLM sinh động (nếu LLM_ENABLED) hoặc câu cứng fallback.
 */
import type { Server } from 'socket.io';
import { S2C, type Team, TEAM } from '../../contracts/index.js';
import type { GameRoom } from '../../domain/GameRoom.js';
import type { Death } from '../../domain/GameRoom.js';
import { complete } from './llmService.js';
import { startAgent, speakInChannel, stopAgent } from '../agora/convoai.js';
import { env } from '../../config/env.js';

const TEAM_LABEL: Record<Team, string> = {
  [TEAM.WEREWOLF]: 'phe Sói',
  [TEAM.VILLAGE]: 'phe Dân làng',
};

function agoraChannel(room: GameRoom): string {
  return `room-${room.roomCode}-day`;
}

export class GmService {
  constructor(private io: Server) {}

  /** GM nói: bong bóng FE + (tùy) tiếng Agora. */
  private async say(room: GameRoom, text: string, priority: 'INTERRUPT' | 'APPEND' = 'APPEND'): Promise<void> {
    this.io.to(room.roomCode).emit(S2C.GM_SPEAK, { text });
    speakInChannel(agoraChannel(room), text, priority).catch(() => {});
  }

  /** Sinh lời động qua LLM (fallback câu cứng). */
  private async narrate(room: GameRoom, eventVi: string, fallback: string, priority: 'INTERRUPT' | 'APPEND' = 'APPEND'): Promise<void> {
    const system = 'Bạn là Quản trò Ma Sói, giọng trầm huyền bí. Diễn đạt sự kiện sau thành 1-2 câu tiếng Việt có dấu, KHÔNG bịa thêm thông tin.';
    const line = await complete(system, eventVi, { maxTokens: 120, temperature: 0.9 });
    await this.say(room, line || fallback, priority);
  }

  // ─── Các hook Room gọi xuống ───────────────────────────────
  onGameStart(room: GameRoom): void {
    if (env.AGORA_AGENT_ENABLED) {
      startAgent(agoraChannel(room), {
        greeting: 'Chào mừng tất cả đến với ngôi làng! Ta là Quản trò ván Ma Sói hôm nay.',
        roomCode: room.roomCode,
      }).catch(() => {});
    }
    this.narrate(
      room,
      `Ván Ma Sói bắt đầu với ${room.players.length} người. Mỗi người vừa nhận một vai bí mật. Màn đêm đầu tiên buông xuống, phe Sói hãy thức giấc.`,
      'Ván Ma Sói bắt đầu! Màn đêm đầu tiên buông xuống, mọi người nhắm mắt lại.',
      'APPEND',
    );
  }

  onNightFall(room: GameRoom): void {
    this.narrate(
      room,
      `Đêm thứ ${room.cycle} buông xuống ngôi làng. Mọi người nhắm mắt, phe Sói hãy chọn con mồi.`,
      'Màn đêm lại buông xuống. Phe Sói hãy thức giấc.',
      'INTERRUPT',
    );
  }

  onNightResolved(room: GameRoom, deaths: Death[]): void {
    if (deaths.length === 0) {
      this.narrate(room, `Trời sáng sau đêm ${room.cycle}, kỳ lạ thay không ai thiệt mạng.`, 'Trời sáng rồi. Đêm qua cả làng bình yên vô sự.', 'INTERRUPT');
    } else {
      const names = deaths.map((d) => { const p = room.getBySeat(d.seat); return p ? `${p.name} (ghế ${d.seat})` : `ghế ${d.seat}`; }).join(', ');
      this.narrate(room, `Trời sáng sau đêm ${room.cycle}. ${names} đã ngã xuống.`, `Trời sáng rồi. Đêm qua ${names} đã ngã xuống.`, 'INTERRUPT');
    }
  }

  onVoteResolved(room: GameRoom, lynchedSeat: number | null): void {
    if (lynchedSeat === null) {
      this.narrate(room, 'Cuộc bỏ phiếu hòa, không ai bị treo cổ.', 'Số phiếu hòa nhau. Không ai bị treo cổ hôm nay.', 'INTERRUPT');
    } else {
      const p = room.getBySeat(lynchedSeat);
      const who = p ? `${p.name} (ghế ${lynchedSeat})` : `ghế ${lynchedSeat}`;
      this.narrate(room, `Dân làng đã bỏ phiếu treo cổ ${who}.`, `Dân làng đã quyết định treo cổ ${who}.`, 'INTERRUPT');
    }
  }

  onGameOver(room: GameRoom, winner: Team): void {
    const label = TEAM_LABEL[winner] || 'một phe';
    this.narrate(room, `Ván đấu ngã ngũ, chiến thắng thuộc về ${label}.`, `Ván đấu kết thúc. Chiến thắng thuộc về ${label}!`, 'INTERRUPT');
    setTimeout(() => stopAgent(agoraChannel(room)).catch(() => {}), 8000);
  }
}

export type { GmService as default };
