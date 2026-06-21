/**
 * tool-server.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC NGAY] "Custom LLM proxy" kieu OpenAI-compatible cho Agora ConvoAI.
 *
 * Agora ConvoAI Engine se tro LLM_URL vao endpoint POST /chat/completions cua
 * server nay (xem references/conversational-ai/server-custom-llm.md). Khi nguoi
 * choi noi mic -> ConvoAI ASR -> goi /chat/completions voi `messages`. Server:
 *   1. Boc lenh tu cau noi cuoi cung (hien tai = intent-parser regex tieng Viet).
 *      >>> CHO NAY THAY BANG LLM THAT (gpt-4o-mini qua Agora) sau: gui messages +
 *          tools.getToolSchemas() len LLM, nhan tool_calls. <<<
 *   2. THUC THI tool ngay tai server (server-side tool execution) -> goi backend
 *      REST /gm/* qua tools.executeTool().
 *   3. Tra ket qua ve duoi dang OpenAI chat.completion (content = cau GM noi)
 *      de ConvoAI TTS doc lai cho ca phong.
 *
 * Phan STUB: ket noi LLM that, ket noi Agora Engine (xem agora/convoai.js).
 */

'use strict';

require('dotenv').config();

const express = require('express');
const tools = require('./tools');
const { parseIntent } = require('./intentParser');
const gmClient = require('./gmClient');

const PORT = parseInt(process.env.PORT || '5000', 10);
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'stub';

const app = express();
app.use(express.json({ limit: '1mb' }));

// ─── Health check ───────────────────────────────────────────
app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'aionewolf-ai', llmProvider: LLM_PROVIDER });
});

/**
 * Lay cau noi cuoi cung cua nguoi choi (role user) tu mang messages.
 */
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

/**
 * Lay roomCode tu ngu canh: uu tien body.roomCode / header, fallback "DEMO".
 * (ConvoAI co the gan metadata; o stub ta cho phep truyen kem.)
 */
function resolveRoomCode(req, body) {
  return (
    body.roomCode ||
    req.get('X-Room-Code') ||
    (body.metadata && body.metadata.roomCode) ||
    'DEMO'
  );
}

/**
 * ⭐ buildGameContext — LAY GAME STATE TU BACKEND -> nhoi vao context cho LLM.
 *
 * Day la phan giup AI "dieu tro dung logic": truoc moi luot, hoi backend
 * GET /gm/state de biet PHA hien tai + AI CON SONG / AI DA CHET, roi chen mot
 * "GAME STATE block" vao messages. Nho vay LLM (hoac intent-parser) KHONG cho
 * thao tac nguoi da chet va theo dung pha.
 *
 * @param {string} roomCode
 * @returns {Promise<{ text:string, alive:number[], dead:number[], phase:string|null }>}
 */
async function buildGameContext(roomCode) {
  const r = await gmClient.getState(roomCode);
  if (!r.ok || !r.data) {
    return { text: `[GAME STATE] Khong lay duoc trang thai phong ${roomCode}.`, alive: [], dead: [], phase: null };
  }
  const st = r.data;
  const players = st.players || [];
  const alive = players.filter((p) => p.status === 'ALIVE').map((p) => p.seat);
  const dead = players.filter((p) => p.status === 'DEAD').map((p) => p.seat);

  const aliveList = players
    .filter((p) => p.status === 'ALIVE')
    .map((p) => `ghe ${p.seat} (${p.name})`)
    .join(', ') || '(khong co)';
  const deadList = dead.length ? dead.map((s) => `ghe ${s}`).join(', ') : '(chua co)';

  const text =
    `[GAME STATE]\n` +
    `- Pha hien tai: ${st.phase} (dem/ngay thu ${st.cycle}).\n` +
    `- Nguoi CON SONG: ${aliveList}.\n` +
    `- Nguoi DA CHET: ${deadList}.\n` +
    `- LUAT: chi duoc thao tac nguoi CON SONG; lam dung trinh tu pha. ` +
    `Neu nguoi choi chon mot ghe da chet hoac khong ton tai, hay tu choi va nhac ho.`;

  return { text, alive, dead, phase: st.phase };
}

/**
 * Dong goi 1 cau tra loi kieu OpenAI chat.completion (non-stream).
 * ConvoAI doc field choices[0].message.content de TTS.
 */
function openAiResponse(text, toolName) {
  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: `aionewolf-gm-${LLM_PROVIDER}`,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      },
    ],
    // metadata rieng cho debug — khong bat buoc trong chuan OpenAI.
    aionewolf: { tool: toolName || null },
  };
}

/**
 * ─── ENDPOINT CHINH: /chat/completions ──────────────────────
 * Agora ConvoAI tro LLM_URL vao day.
 */
app.post('/chat/completions', async (req, res) => {
  const body = req.body || {};
  const messages = body.messages || [];
  const roomCode = resolveRoomCode(req, body);
  const userText = lastUserMessage(messages);

  console.log(`[tool-server] room=${roomCode} heard="${userText}"`);

  // ── BUOC 0: LAY GAME STATE, nhoi vao context cho LLM ───────
  // (AI biet ai con song / da chet / dang pha nao truoc khi xu ly)
  const ctx = await buildGameContext(roomCode);
  // Chen GAME STATE block lam system message dau tien (cho LLM that doc).
  const llmMessages = [{ role: 'system', content: ctx.text }, ...messages];
  console.log(`[tool-server] ${ctx.text.replace(/\n/g, ' ')}`);

  // ── BUOC 1: boc lenh -> tool_call ──────────────────────────
  // [STUB hien tai] intent-parser regex tieng Viet.
  // >>> THAY BANG LLM THAT o day:
  //   const completion = await callRealLLM(messages, tools.getToolSchemas());
  //   const toolCall = completion.choices[0].message.tool_calls?.[0];
  //   intent = toolCall ? { tool: toolCall.function.name,
  //                         args: JSON.parse(toolCall.function.arguments) } : null;
  // (LLM_PROVIDER=openai -> goi gpt-4o-mini; xem .env.example)
  let intent = null;
  if (LLM_PROVIDER === 'stub') {
    intent = parseIntent(userText);
  } else {
    // [STUB] Nha cung cap LLM that chua noi.
    console.log(`[tool-server] LLM_PROVIDER=${LLM_PROVIDER} chua duoc cai dat — fallback stub parser.`);
    intent = parseIntent(userText);
  }

  // Khong phai lenh game -> Quan tro tra loi dan dat chung (khong goi tool).
  if (!intent) {
    return res.json(
      openAiResponse('Ta dang lang nghe ngoi lang trong dem. Hay noi ro hanh dong cua nguoi.')
    );
  }

  // Thieu so ghe -> GM hoi lai.
  if (intent.missingSeat) {
    return res.json(openAiResponse('Nguoi muon chon ghe so may?', intent.tool));
  }

  // ── CHAN THAO TAC NGUOI DA CHET (dua tren GAME STATE) ──────
  // Neu lenh nham vao 1 ghe khong con trong danh sach song -> tu choi luon,
  // khong goi backend. (Backend cung chan bang 409, day la lop chan som hon.)
  const tSeat = intent.args && intent.args.targetSeat;
  if (tSeat != null && ctx.alive.length > 0 && !ctx.alive.includes(Number(tSeat))) {
    const why = ctx.dead.includes(Number(tSeat)) ? 'da chet' : 'khong ton tai trong phong';
    return res.json(openAiResponse(`Ghe so ${tSeat} ${why}. Nguoi hay chon mot nguoi con song.`, intent.tool));
  }

  // ── BUOC 2: THUC THI tool tai server -> goi backend REST ──
  try {
    const result = await tools.executeTool(intent.tool, { roomCode, ...intent.args });
    // result.text = cau GM noi (ke ca khi 409 -> "khong hop le").
    return res.json(openAiResponse(result.text, intent.tool));
  } catch (err) {
    console.error('[tool-server] loi thuc thi tool:', err);
    return res
      .status(500)
      .json(openAiResponse('Co loi xay ra khi ghi nhan hanh dong. Hay thu lai.', intent.tool));
  }
});

// ─── Lo schema tool ra de debug / cho LLM that doc ──────────
app.get('/tools', (_req, res) => {
  res.json({ tools: tools.getToolSchemas() });
});

// ─── Khoi dong ──────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('─────────────────────────────────────────────');
    console.log(` AIoneWolf — AI Quan tro (tool-server)`);
    console.log(` Listening: http://localhost:${PORT}`);
    console.log(` LLM endpoint (Agora tro vao): POST /chat/completions`);
    console.log(` LLM_PROVIDER=${LLM_PROVIDER}  BACKEND_URL=${process.env.BACKEND_URL || 'http://localhost:4000'}`);
    console.log('─────────────────────────────────────────────');
  });
}

module.exports = app;
