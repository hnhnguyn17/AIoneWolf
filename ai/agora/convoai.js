/**
 * agora/convoai.js
 * ─────────────────────────────────────────────────────────────
 * [STUB — chua noi that] Quan ly vong doi "AI Quan tro" tren Agora
 * Conversational AI Engine: dua agent vao kenh RTC de NGHE mic nguoi choi
 * va NOI lai (TTS).
 *
 * ⚠️ KHONG BIA REST SCHEMA CUA AGORA.
 *    Skill agora cam dung schema /join, /leave tu tri nho. Cac ham duoi day
 *    chi console.log + ghi TODO tro toi tai lieu skill that. Khi noi that,
 *    FETCH schema tu OpenAPI spec roi dien payload.
 *
 * ─── KIEN TRUC (xem .claude/skills/agora/references/conversational-ai/) ───
 *   architecture.md, auth-flow.md, README.md, server-custom-llm.md
 *
 *   Browser/Mobile  ── start session ──►  Backend game (mint RTC+RTM token)
 *        ▲  audio/transcripts                     │
 *        │                                        │ POST /join (config: channel, token,
 *        │                                        │            LLM_URL = tool-server nay,
 *        │                                        │            ASR + TTS vendor)
 *        │                                        ▼
 *        └──── RTC channel ◄──── ConvoAI Engine tao agent ──► agent join RTC channel
 *                                  (ASR -> LLM(tool-server) -> TTS)
 *
 *   Luong "AI Quan tro" cu the:
 *     1. Backend game mint RTC token + RTM token cho agent (App ID + App Cert).
 *     2. Backend (hoac service nay) POST /join len ConvoAI Engine, tro LLM_URL
 *        vao tool-server.js (/chat/completions). => Agent vao RTC channel
 *        "room-<roomCode>-day".
 *     3. Nguoi choi noi mic -> ConvoAI ASR -> goi LLM_URL (tool-server) ->
 *        tool-server boc lenh + goi backend /gm/* -> tra cau noi -> ConvoAI TTS
 *        doc cho ca phong.
 *     4. Quan tro chu dong dan van: goi POST /agents/{id}/speak (xem
 *        speakInChannel) cho cac cau "Soi day di"... (orchestrator.js sinh cau).
 *     5. Het van -> POST /agents/{id}/leave (stopAgent).
 *
 *   Base URL (tu README.md):
 *     https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}
 *   Endpoints lien quan: POST /join, POST /agents/{id}/leave,
 *                        POST /agents/{id}/speak, GET /agents/{id}.
 *   Auth: Authorization: agora token=<RTC+RTM token tu buildTokenWithRtm>.
 */

'use strict';

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERT = process.env.AGORA_APP_CERT || '';

// Luu agent dang chay theo channel (in-memory). That se luu agent_id tu /join.
const _activeAgents = new Map(); // channel -> { agentId, startedAt }

/**
 * [STUB] Khoi tao agent Quan tro va dua vao kenh RTC cua phong.
 *
 * @param {string} channel  ten kenh RTC, vd "room-ABCD-day"
 * @param {object} [opts]   tuy chon (greeting, language...)
 * @returns {Promise<{ ok:boolean, agentId:string, stub:boolean }>}
 */
async function startAgent(channel, opts = {}) {
  console.log(`[convoai:STUB] startAgent(channel="${channel}")`);

  if (!AGORA_APP_ID || !AGORA_APP_CERT) {
    console.log(
      '[convoai:STUB] Thieu AGORA_APP_ID / AGORA_APP_CERT — KHONG the goi /join that. ' +
        'User can cung cap App ID + App Certificate tu https://console.agora.io.'
    );
  }

  // ── TODO (NOI THAT) ────────────────────────────────────────
  // 1. Mint RTC+RTM token cho agent:
  //      RtcTokenBuilder.buildTokenWithRtm(appId, appCert, channel, account,
  //                                        RtcRole.PUBLISHER, expire, expire)
  //    (npm: agora-token). KHONG hardcode payload o day.
  // 2. FETCH schema /join that tu:
  //      https://docs-md.agora.io/en/conversational-ai/rest-api/agent/join.md
  //      hoac OpenAPI: https://docs-md.agora.io/api/conversational-ai-api-v2.x.yaml
  //    roi build body { properties: { channel, token, llm:{ url: LLM_URL,...},
  //    asr:{...}, tts:{...}, agent_rtc_uid:"0", remote_rtc_uids:["*"] } }.
  //    (LLM_URL tro vao tool-server.js — xem server-custom-llm.md)
  // 3. POST https://api.agora.io/api/conversational-ai-agent/v2/projects/{appId}/join
  //      headers: { Authorization: `agora token=${convoAIToken}` }
  //    -> nhan { agent_id }.
  // ───────────────────────────────────────────────────────────

  const fakeAgentId = `stub-agent-${channel}`;
  _activeAgents.set(channel, { agentId: fakeAgentId, startedAt: Date.now() });
  console.log(`[convoai:STUB] (gia lap) agent_id=${fakeAgentId} da "vao" kenh ${channel}.`);
  return { ok: true, agentId: fakeAgentId, stub: true };
}

/**
 * [STUB] Cho agent NOI mot cau trong kenh (TTS) — dung de Quan tro chu dong dan van.
 * That se goi POST /agents/{agentId}/speak.
 *
 * @param {string} channel
 * @param {string} text  cau GM noi (tu orchestrator.js)
 * @param {('INTERRUPT'|'APPEND'|'IGNORE')} [priority]
 */
async function speakInChannel(channel, text, priority = 'APPEND') {
  const a = _activeAgents.get(channel);
  console.log(`[convoai:STUB] speak(channel="${channel}", priority=${priority}): "${text}"`);
  // TODO (NOI THAT): POST .../agents/{a.agentId}/speak  body { text, priority }
  //   Schema /speak: FETCH tu
  //   https://docs-md.agora.io/en/conversational-ai/rest-api/agent/speak.md
  return { ok: true, stub: true, agentId: a ? a.agentId : null };
}

/**
 * [STUB] Dung agent — roi kenh RTC khi het van.
 * That se goi POST /agents/{agentId}/leave.
 *
 * @param {string} channel
 */
async function stopAgent(channel) {
  const a = _activeAgents.get(channel);
  console.log(`[convoai:STUB] stopAgent(channel="${channel}", agentId=${a ? a.agentId : 'none'})`);
  // TODO (NOI THAT): POST .../agents/{a.agentId}/leave
  //   Schema /leave: FETCH tu
  //   https://docs-md.agora.io/en/conversational-ai/rest-api/agent/leave.md
  _activeAgents.delete(channel);
  return { ok: true, stub: true };
}

module.exports = {
  startAgent,
  speakInChannel,
  stopAgent,
  _activeAgents,
};
