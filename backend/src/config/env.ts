/**
 * config/env.ts
 * ─────────────────────────────────────────────────────────────
 * Đọc + validate biến môi trường MỘT LẦN tại đây (1 nguồn sự thật).
 * Phần còn lại của app import `env` đã được kiểm tra kiểu, không đọc
 * `process.env` rải rác.
 */
import 'dotenv/config';
import { z } from 'zod';

/** "1"/"true" → true; còn lại → false. */
const boolish = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined ? def : v === '1' || v.toLowerCase() === 'true'));

const schema = z.object({
  PORT: z.coerce.number().default(3636),

  // Auth ví (JWT)
  JWT_SECRET: z.string().min(1).default('dev-jwt-secret'),
  REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret'),
  REQUIRE_AUTH: boolish(false),

  // LLM
  LLM_ENABLED: boolish(false),
  LLM_PROVIDER: z.enum(['ollama', 'groq', 'openai']).default('ollama'),
  GROQ_API_KEY: z.string().optional().default(''),
  OLLAMA_MODEL: z.string().default('qwen3:8b'),

  // Agora
  AGORA_APP_ID: z.string().optional().default(''),
  AGORA_APP_CERT: z.string().optional().default(''),
  AGORA_AGENT_ENABLED: boolish(false),
  PUBLIC_URL: z.string().optional().default(''),

  // Solana
  SOLANA_CLUSTER: z.enum(['devnet', 'mainnet-beta', 'testnet']).default('devnet'),
  SOLANA_KEYPAIR: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Biến môi trường không hợp lệ:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

/** Tiện ích suy ra trạng thái tính năng từ env (để log/route quyết định). */
export const features = {
  /** Có đủ credential để gọi Agora REST thật không. */
  agoraReady: !!(env.AGORA_APP_ID && env.AGORA_APP_CERT),
  /** Có bật ConvoAI agent audio thật không (cần credential + cờ). */
  agoraAgent: !!(env.AGORA_APP_ID && env.AGORA_APP_CERT && env.AGORA_AGENT_ENABLED),
  /** Agent dùng custom-LLM (não của mình qua tunnel) hay managed của Agora. */
  customLlm: !!env.PUBLIC_URL,
};

export type Env = typeof env;
