/**
 * services/agora/token.ts — sinh token Agora.
 *   - buildUserToken: RTC token cho NGƯỜI CHƠI join kênh voice (FE gọi).
 *   - buildConvoAIToken: RTC+RTM token cho ConvoAI agent (REST /join).
 * Thiếu credential → trả token=null (stub, FE vẫn chạy kênh test không token).
 */
import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import { env, features } from '../../config/env.js';

const EXPIRE = 3600; // 1h

/** RTC token cho 1 người chơi (uid số). */
export function buildUserToken(channel: string, uid: number): { token: string | null; appId: string; stub: boolean } {
  if (!features.agoraReady) return { token: null, appId: env.AGORA_APP_ID, stub: true };
  const token = RtcTokenBuilder.buildTokenWithUid(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERT,
    channel,
    uid,
    RtcRole.PUBLISHER,
    EXPIRE,
    EXPIRE,
  );
  return { token, appId: env.AGORA_APP_ID, stub: false };
}

/** RTC+RTM token cho ConvoAI agent (account string, mặc định "0" = auto-uid). */
export function buildConvoAIToken(channel: string, account = '0'): string | null {
  if (!features.agoraReady) return null;
  return RtcTokenBuilder.buildTokenWithRtm(
    env.AGORA_APP_ID,
    env.AGORA_APP_CERT,
    channel,
    account,
    RtcRole.PUBLISHER,
    EXPIRE,
    EXPIRE,
  );
}
