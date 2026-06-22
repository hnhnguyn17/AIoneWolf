/**
 * services/ai/llmService.ts
 * ─────────────────────────────────────────────────────────────
 * Client LLM trung lập (OpenAI-compatible). Đổi provider qua env:
 *   ollama (local, miễn phí) | groq (cloud) | openai.
 * LLM_ENABLED=0 → complete() trả null ngay (GM/bot dùng câu cứng, không gọi mạng).
 *
 * Đây là điểm phân bổ LLM: GM dùng ít (diễn đạt vài câu), bot dùng nhiều (suy luận).
 */
import { env } from '../../config/env.js';

interface ProviderCfg {
  baseUrl: string;
  apiKey: string;
  model: string;
}

function providerCfg(): ProviderCfg {
  switch (env.LLM_PROVIDER) {
    case 'groq':
      return { baseUrl: 'https://api.groq.com/openai/v1', apiKey: env.GROQ_API_KEY, model: 'llama-3.3-70b-versatile' };
    case 'openai':
      return { baseUrl: 'https://api.openai.com/v1', apiKey: env.GROQ_API_KEY, model: 'gpt-4o-mini' };
    case 'ollama':
    default:
      return { baseUrl: 'http://localhost:11434/v1', apiKey: 'ollama', model: env.OLLAMA_MODEL };
  }
}

/** Có bật LLM không (flag + provider sẵn sàng). */
export function llmEnabled(): boolean {
  return env.LLM_ENABLED;
}

/**
 * Sinh 1 câu trả lời. Trả null nếu tắt/timeout/lỗi (caller dùng fallback cứng).
 */
export async function complete(
  system: string,
  user: string,
  opts: { maxTokens?: number; temperature?: number; timeoutMs?: number } = {},
): Promise<string | null> {
  if (!env.LLM_ENABLED) return null;
  const cfg = providerCfg();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: opts.maxTokens ?? 160,
        temperature: opts.temperature ?? 0.9,
        // Ollama qwen3: tắt reasoning cho nhanh.
        ...(env.LLM_PROVIDER === 'ollama' ? { chat_template_kwargs: { enable_thinking: false } } : {}),
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as any;
    const text = json?.choices?.[0]?.message?.content;
    return typeof text === 'string' ? text.trim() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
