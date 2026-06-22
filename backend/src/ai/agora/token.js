/**
 * agora/token.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC — can dep 'agora-token'] Sinh token Agora cho AI Quan tro.
 *
 * Co 3 LOAI TOKEN trong 1 phien ConvoAI (xem skill auth-flow.md "The Three Tokens"):
 *   1. RTC client token  — nguoi choi join kenh RTC          (backend/routes/agora.js cap)
 *   2. RTM client token  — nguoi choi login RTM              (backend/routes/agora.js cap)
 *   3. ConvoAI server token — service nay goi REST /join     (FILE NAY sinh)
 *
 * ConvoAI server token = token KET HOP RTC + RTM, sinh bang
 *   RtcTokenBuilder.buildTokenWithRtm(appId, appCert, channel, account,
 *                                     role, tokenExpire, privilegeExpire)
 * (skill conversational-ai/auth-flow.md, README.md muc "Option A: Agora Token").
 * Dung lam header:  Authorization: agora token=<token nay>.
 *
 * Token nay cung chinh la token agent dung de join kenh (properties.token trong /join),
 * vi enable_rtm=true yeu cau token co CA quyen RTC + RTM (join.md ghi ro:
 * "make sure the token includes both RTC and RTM privileges. When an agent joins an
 *  RTM channel, it reuses the token specified in the `token` field").
 *
 * ⚠️ Khong sua backend. Day la token cho phia AI-service goi ConvoAI Engine.
 *    Token RTC/RTM cho NGUOI CHOI van do backend/routes/agora.js cap (port 3636).
 *
 * Thieu AGORA_APP_ID / AGORA_APP_CERT  -> tra null + log "stub mode" (khong nem).
 * Thieu package 'agora-token'          -> tra null + log goi y `npm install agora-token`.
 */

'use strict';

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERT = process.env.AGORA_APP_CERT || '';

// Token validity toi da 24h (skill server-sdks.md: "Max token validity is 24 hours").
const DEFAULT_EXPIRE_SECONDS = parseInt(process.env.AGORA_TOKEN_EXPIRE || '3600', 10);

// Lazy-load 'agora-token' — chi nap khi THAT SU sinh token. Nho vay module nay
// (va convoai.js) van require duoc o che do stub khi chua `npm install`.
let _builder = null;
function getBuilder() {
  if (_builder !== null) return _builder;
  try {
    // eslint-disable-next-line global-require
    _builder = require('agora-token');
  } catch (e) {
    _builder = false; // danh dau "da thu, that bai" de khong thu lai lien tuc
    console.warn(
      "[agora/token] Thieu package 'agora-token'. Chay `npm install agora-token` de sinh token that. " +
        '(hien tai chay stub: token=null)'
    );
  }
  return _builder;
}

/**
 * Sinh ConvoAI server token (RTC + RTM ket hop) cho agent join 1 channel.
 *
 * @param {string} channel  ten kenh RTC, vd "room-ABCD-day"
 * @param {object} [opts]
 * @param {string} [opts.account]        identity (string) cua agent trong RTM/RTC. Mac dinh "0" (auto-uid).
 *                                        LUU Y: voi enable_string_uid=false, agent_rtc_uid="0" la auto-int.
 * @param {number} [opts.expireSeconds]  thoi han token (giay). Mac dinh 3600, toi da 86400.
 * @returns {{ token: string|null, appId: string, channel: string, account: string,
 *             expireSeconds: number, stub: boolean, reason?: string }}
 */
function buildConvoAIToken(channel, opts = {}) {
  const account = opts.account != null ? String(opts.account) : '0';
  const expireSeconds = Math.min(
    opts.expireSeconds || DEFAULT_EXPIRE_SECONDS,
    86400 // 24h tran cung
  );

  // ── Stub: thieu credential ──────────────────────────────────
  if (!AGORA_APP_ID || !AGORA_APP_CERT) {
    const reason =
      'Thieu AGORA_APP_ID / AGORA_APP_CERT — chay stub mode (token=null). ' +
      'Lay tu https://console.agora.io (Project > App ID + Primary Certificate).';
    console.log(`[agora/token:STUB] ${reason}`);
    return { token: null, appId: AGORA_APP_ID, channel, account, expireSeconds, stub: true, reason };
  }

  const agoraToken = getBuilder();
  if (!agoraToken) {
    return {
      token: null,
      appId: AGORA_APP_ID,
      channel,
      account,
      expireSeconds,
      stub: true,
      reason: "Chua cai 'agora-token'.",
    };
  }

  const { RtcTokenBuilder, RtcRole } = agoraToken;

  // buildTokenWithRtm: token co CA quyen RTC (publisher) lan RTM cho `account`.
  // Chu ky theo skill auth-flow.md Option-A / "Worked Example" muc Token Auth mode:
  //   buildTokenWithRtm(appId, appCert, channel, account, role, tokenExpire, privilegeExpire)
  const token = RtcTokenBuilder.buildTokenWithRtm(
    AGORA_APP_ID,
    AGORA_APP_CERT,
    channel,
    account,
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds
  );

  return { token, appId: AGORA_APP_ID, channel, account, expireSeconds, stub: false };
}

/**
 * Tien ich: sinh RTC token (buildTokenWithUid) cho 1 NGUOI CHOI join kenh.
 * Backend (backend/routes/agora.js) la noi cap chinh thuc cho FE; ham nay chi de
 * AI-service tu test cuc bo / dung khi can. KHONG thay the backend.
 *
 * @param {string} channel
 * @param {number} uid  so nguyen (0 = auto)
 * @param {number} [expireSeconds]
 * @returns {{ token: string|null, stub: boolean }}
 */
function buildRtcUserToken(channel, uid = 0, expireSeconds = DEFAULT_EXPIRE_SECONDS) {
  if (!AGORA_APP_ID || !AGORA_APP_CERT) {
    return { token: null, stub: true };
  }
  const agoraToken = getBuilder();
  if (!agoraToken) return { token: null, stub: true };

  const { RtcTokenBuilder, RtcRole } = agoraToken;
  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERT,
    channel,
    Number(uid),
    RtcRole.PUBLISHER,
    expireSeconds,
    expireSeconds
  );
  return { token, stub: false };
}

module.exports = {
  buildConvoAIToken,
  buildRtcUserToken,
  // Lo ra de test/log.
  _config: { AGORA_APP_ID: AGORA_APP_ID ? '(set)' : '', hasCert: !!AGORA_APP_CERT, DEFAULT_EXPIRE_SECONDS },
};
