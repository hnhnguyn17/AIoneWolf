'use strict';

/**
 * backend/src/routes/ai.js
 * Endpoint Agora ConvoAI Engine trỏ LLM_URL vào: POST /ai/chat/completions
 * Nghe text người chơi → bóc lệnh → gmService thực thi → trả câu GM nói (TTS).
 */

const express = require('express');
const rooms = require('../game');
const tools = require('../ai/tools');
const { parseIntent } = require('../ai/intentParser');

const LLM_PROVIDER = process.env.LLM_PROVIDER || 'stub';

function createAiRouter(gm) {
  const router = express.Router();

  function lastUserMessage(messages) {
    if (!Array.isArray(messages)) return '';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i] && messages[i].role === 'user') {
        return typeof messages[i].content === 'string'
          ? messages[i].content
          : JSON.stringify(messages[i].content);
      }
    }
    return '';
  }

  function resolveRoomCode(req, body) {
    return body.roomCode || req.get('X-Room-Code') ||
      (body.metadata && body.metadata.roomCode) || 'DEMO';
  }

  // Lấy GAME STATE trực tiếp từ GameRoom (không REST)
  function buildGameContext(roomCode) {
    const room = rooms.getRoom(roomCode);
    if (!room) return { room: null, text: `[GAME STATE] Phong ${roomCode} khong ton tai.`, alive: [], dead: [], phase: null };
    const st = room.getGmState();
    const alive = st.players.filter((p) => p.status === 'ALIVE').map((p) => p.seat);
    const dead = st.players.filter((p) => p.status === 'DEAD').map((p) => p.seat);
    const aliveList = st.players
      .filter((p) => p.status === 'ALIVE')
      .map((p) => `ghe ${p.seat} (${p.name})`).join(', ') || '(khong co)';
    const text =
      `[GAME STATE]\n- Pha: ${st.phase} (dem/ngay thu ${st.cycle}).\n` +
      `- CON SONG: ${aliveList}.\n- DA CHET: ${dead.length ? dead.map((s) => `ghe ${s}`).join(', ') : '(chua co)'}.\n` +
      `- LUAT: chi thao tac nguoi CON SONG; dung trinh tu pha; tu choi neu chon ghe da chet.`;
    return { room, text, alive, dead, phase: st.phase };
  }

  function openAiResponse(text, toolName) {
    const now = Math.floor(Date.now() / 1000);
    return {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: now,
      model: `aionewolf-gm-${LLM_PROVIDER}`,
      choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      aionewolf: { tool: toolName || null },
    };
  }

  // Health check
  router.get('/healthz', (_req, res) => {
    res.json({ ok: true, service: 'aionewolf-ai-embedded', llmProvider: LLM_PROVIDER });
  });

  // Tool schema (debug / LLM thật)
  router.get('/tools', (_req, res) => res.json({ tools: tools.getToolSchemas() }));

  // ⭐ ENDPOINT CHÍNH: Agora ConvoAI trỏ LLM_URL vào đây
  router.post('/chat/completions', async (req, res) => {
    const body = req.body || {};
    const roomCode = resolveRoomCode(req, body);
    const userText = lastUserMessage(body.messages || []);
    console.log(`[ai] room=${roomCode} heard="${userText}"`);

    const ctx = buildGameContext(roomCode);
    if (!ctx.room) {
      return res.json(openAiResponse('Phong khong ton tai hoac chua bat dau.'));
    }

    // BƯỚC 1: bóc lệnh
    const intent = parseIntent(userText);
    if (!intent) {
      return res.json(openAiResponse('Ta dang lang nghe ngoi lang trong dem. Hay noi ro hanh dong cua nguoi.'));
    }
    if (intent.missingSeat) {
      return res.json(openAiResponse('Nguoi muon chon ghe so may?', intent.tool));
    }

    // Chặn sớm người đã chết
    const tSeat = intent.args && intent.args.targetSeat;
    if (tSeat != null && ctx.alive.length > 0 && !ctx.alive.includes(Number(tSeat))) {
      const why = ctx.dead.includes(Number(tSeat)) ? 'da chet' : 'khong ton tai trong phong';
      return res.json(openAiResponse(`Ghe so ${tSeat} ${why}. Nguoi hay chon mot nguoi con song.`, intent.tool));
    }

    // BƯỚC 2: thực thi qua gmService (function call trực tiếp, không REST)
    try {
      const result = await tools.executeTool(intent.tool, intent.args, { room: ctx.room, gm });
      return res.json(openAiResponse(result.text, intent.tool));
    } catch (err) {
      console.error('[ai] loi thuc thi tool:', err);
      return res.status(500).json(openAiResponse('Co loi khi ghi nhan hanh dong. Hay thu lai.', intent.tool));
    }
  });

  return router;
}

module.exports = { createAiRouter };
