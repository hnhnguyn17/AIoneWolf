/**
 * services/agora/convoai.ts
 * ─────────────────────────────────────────────────────────────
 * Vòng đời ConvoAI agent (AI Quản trò audio). REST thật: /join, /speak, /leave.
 * Flag AGORA_AGENT_ENABLED=0 (mặc định) → mọi hàm là no-op (chỉ log) → KHÔNG
 * đốt phút Agora. GM vẫn "nói" qua FE Web Speech (gm:speak) khi tắt.
 *
 * Khi bật + có PUBLIC_URL → custom-LLM (não của mình). Không có → managed (LLM Agora).
 * Schema từ skill .claude/skills/agora (không bịa).
 */
import { env, features } from '../../config/env.js';
import { buildConvoAIToken } from './token.js';

const BASE = 'https://api.agora.io/api/conversational-ai-agent/v2/projects';
const _agents = new Map<string, { agentId: string | null }>();

function authHeader(token: string) {
  return { Authorization: `agora token=${token}`, 'Content-Type': 'application/json' };
}

async function post(url: string, token: string, body?: unknown) {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: authHeader(token),
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { raw: text };
    }
    return { ok: res.ok, status: res.status, body: parsed };
  } catch (e) {
    return { ok: false, status: 0, body: { error: (e as Error).message } };
  }
}

function buildJoinBody(channel: string, token: string, opts: { greeting?: string; roomCode?: string }) {
  const name = `gm_${channel}_${Date.now()}`.replace(/[^a-zA-Z0-9_]/g, '');
  const GM_SYSTEM =
    'Bạn là AI Quản trò (Game Master) của một ván Ma Sói tiếng Việt, giọng trầm, ' +
    'huyền bí nhưng rõ ràng. Dẫn dắt không khí, thông báo sự kiện, KHÔNG tự bịa kết quả, ' +
    'KHÔNG tiết lộ vai người chơi. Trả lời ngắn gọn bằng tiếng Việt có dấu.';

  const llm = features.customLlm
    ? {
        url: `${env.PUBLIC_URL.replace(/\/$/, '')}/ai/chat/completions`,
        headers: { 'X-Room-Code': opts.roomCode || '' },
        system_messages: [{ role: 'system', content: GM_SYSTEM }],
        greeting_message: opts.greeting || 'Chào mừng đến với ngôi làng!',
      }
    : {
        vendor: 'openai',
        params: { model: 'gpt-4o-mini' },
        system_messages: [{ role: 'system', content: GM_SYSTEM }],
        greeting_message: opts.greeting || 'Chào mừng đến với ngôi làng!',
      };

  return {
    name,
    properties: {
      channel,
      token,
      agent_rtc_uid: '0',
      remote_rtc_uids: ['*'],
      idle_timeout: 120,
      llm,
      asr: { language: 'vi-VN' },
      tts: {
        vendor: 'minimax',
        params: { model: 'speech-2.6-turbo', voice_setting: { voice_id: 'Wise_Woman', speed: 1, vol: 1, pitch: 0 } },
      },
    },
  };
}

export async function startAgent(channel: string, opts: { greeting?: string; roomCode?: string } = {}): Promise<{ ok: boolean; agentId: string | null }> {
  if (!features.agoraAgent) {
    console.log(`[convoai:off] startAgent(${channel}) bỏ qua (AGORA_AGENT_ENABLED=0).`);
    return { ok: false, agentId: null };
  }
  const token = buildConvoAIToken(channel, '0');
  if (!token) return { ok: false, agentId: null };
  const r = await post(`${BASE}/${env.AGORA_APP_ID}/join`, token, buildJoinBody(channel, token, opts));
  if (!r.ok) {
    console.error(`[convoai] join lỗi ${r.status}:`, JSON.stringify(r.body));
    return { ok: false, agentId: null };
  }
  const agentId = r.body?.agent_id ?? r.body?.agentId ?? null;
  _agents.set(channel, { agentId });
  console.log(`[convoai] agent vào kênh ${channel}: ${agentId}`);
  return { ok: true, agentId };
}

export async function speakInChannel(channel: string, text: string, priority: 'INTERRUPT' | 'APPEND' | 'IGNORE' = 'APPEND'): Promise<void> {
  const a = _agents.get(channel);
  if (!features.agoraAgent || !a?.agentId) return;
  const token = buildConvoAIToken(channel, '0');
  if (!token) return;
  await post(`${BASE}/${env.AGORA_APP_ID}/agents/${a.agentId}/speak`, token, {
    text: String(text).slice(0, 480),
    priority,
    interruptable: true,
  });
}

export async function stopAgent(channel: string): Promise<void> {
  const a = _agents.get(channel);
  _agents.delete(channel);
  if (!features.agoraAgent || !a?.agentId) return;
  const token = buildConvoAIToken(channel, '0');
  if (!token) return;
  await post(`${BASE}/${env.AGORA_APP_ID}/agents/${a.agentId}/leave`, token, {});
}
