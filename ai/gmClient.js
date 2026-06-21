/**
 * gmClient.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC NGAY] Wrapper axios goi backend game qua REST.
 *
 * Hop dong: contracts/api.md  muc "2. AI Quan tro -> backend".
 *   - POST /gm/action          { roomCode, actorRole, action, targetSeat }
 *   - POST /gm/advance-phase    { roomCode, from }
 *   - GET  /gm/state?roomCode=  -> RoomState
 * Header bat buoc:  Authorization: Bearer <GM_SECRET>
 *
 * Xu ly loi 409 (sai pha / target da chet / khong hop le) -> tra ve
 * { ok:false, status:409, message } de tang tren (tool / AI) doc lai cho
 * nguoi choi nghe "Hanh dong khong hop le".
 */

'use strict';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';

// Lazy-load axios: chi nap khi THAT SU goi backend. Nho vay cac module chi can
// schema/map (vd mock/sim-night DRY mode) van require duoc tools.js ma khong can
// axios da install. Khi goi REST that thi axios la bat buoc.
let _http = null;
function getHttp() {
  if (_http) return _http;
  // eslint-disable-next-line global-require
  const axios = require('axios');
  _http = axios.create({
    baseURL: BACKEND_URL,
    timeout: 8000,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GM_SECRET}`,
    },
    // Khong throw cho 4xx — ta tu xu ly de bien 409 thanh message thay vi exception.
    validateStatus: (s) => s >= 200 && s < 500,
  });
  return _http;
}

/**
 * Chuan hoa loi mang/timeout thanh ket qua mem (khong nem).
 * Tra ve shape thong nhat: { ok, status, data?, message? }
 */
function wrapError(err, label) {
  // Loi ket noi (ECONNREFUSED) — backend chua bat.
  const code = err && err.code ? err.code : 'UNKNOWN';
  return {
    ok: false,
    status: 0,
    message: `Khong goi duoc backend (${label}): ${code}. Kiem tra BACKEND_URL=${BACKEND_URL} da bat chua.`,
  };
}

/**
 * Bien response axios thanh shape thong nhat va dich 409.
 */
function normalize(res) {
  const { status, data } = res;
  if (status >= 200 && status < 300) {
    return { ok: true, status, data };
  }
  if (status === 409) {
    // Sai pha / target chet / khong hop le.
    const reason = (data && (data.error || data.message)) || 'Hanh dong khong hop le';
    return { ok: false, status: 409, message: reason, data };
  }
  // 4xx khac (400/401/403/404...).
  const reason = (data && (data.error || data.message)) || `Loi ${status}`;
  return { ok: false, status, message: reason, data };
}

/**
 * POST /gm/action — ghi nhan 1 hanh dong ban dem.
 * @param {{roomCode:string, actorRole:string, action:string, targetSeat:number}} payload
 * @returns {Promise<{ok:boolean,status:number,data?:any,message?:string}>}
 */
async function postAction(payload) {
  try {
    const res = await getHttp().post('/gm/action', payload);
    return normalize(res);
  } catch (err) {
    return wrapError(err, 'POST /gm/action');
  }
}

/**
 * POST /gm/advance-phase — bao "phe X xong, chuyen pha".
 * @param {{roomCode:string, from:string}} payload
 */
async function advancePhase(payload) {
  try {
    const res = await getHttp().post('/gm/advance-phase', payload);
    return normalize(res);
  } catch (err) {
    return wrapError(err, 'POST /gm/advance-phase');
  }
}

/**
 * GET /gm/state — snapshot phong (ai con song, dang pha nao).
 * Dung de chong hallucination: chi thao tac nguoi con song.
 * @param {string} roomCode
 */
async function getState(roomCode) {
  try {
    const res = await getHttp().get('/gm/state', { params: { roomCode } });
    return normalize(res);
  } catch (err) {
    return wrapError(err, 'GET /gm/state');
  }
}

module.exports = {
  postAction,
  advancePhase,
  getState,
  // Lo ra de test / log.
  _config: { BACKEND_URL, GM_SECRET },
};
