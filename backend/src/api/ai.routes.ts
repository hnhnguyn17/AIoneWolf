/**
 * api/ai.routes.ts — endpoint custom-LLM cho ConvoAI agent (chỉ dùng khi PUBLIC_URL set).
 *   POST /ai/chat/completions  (OpenAI-compatible, SSE)
 * ConvoAI agent gọi vào đây mỗi lượt; ta ghép game context + persona GM rồi
 * proxy sang llmService. Khi LLM tắt → trả 1 câu cứng dạng SSE.
 *
 * Đây là "não của mình" — chỉ kích hoạt ở chế độ custom-LLM. Managed thì không cần.
 */
import { Router } from 'express';
import { complete } from '../services/ai/llmService.js';

export const aiRouter = Router();

aiRouter.post('/chat/completions', async (req, res) => {
  const messages = (req.body?.messages ?? []) as { role: string; content: string }[];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  const system = 'Bạn là Quản trò Ma Sói, giọng trầm huyền bí, trả lời ngắn gọn tiếng Việt có dấu.';
  const line = (await complete(system, lastUser, { maxTokens: 120 })) || 'Ta đang lắng nghe ngôi làng.';

  // Trả SSE đúng định dạng OpenAI chat.completion.chunk.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const chunk = {
    id: 'chatcmpl-gm',
    object: 'chat.completion.chunk',
    choices: [{ delta: { content: line }, index: 0, finish_reason: null }],
  };
  res.write(`data: ${JSON.stringify(chunk)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
});
