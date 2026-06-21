/**
 * src/lib/agora.js
 * ─────────────────────────────────────────────────────────────
 * STUB voice interface (Spatial Audio / "Comms_Link" trong mockup).
 *
 * Đây CHỈ là khung (stub) để UI gọi mà không vỡ — chưa tích hợp SDK
 * voice thật (Agora.io / LiveKit / WebRTC). Mọi hàm chỉ console.log
 * và trả Promise resolve. Khi ráp voice thật, thay phần thân hàm bằng
 * lời gọi SDK tương ứng (xem TODO ở từng hàm).
 *
 * Thiết kế khớp với HUD trong các mockup game board:
 *   - "Spatial Audio Active" (central mic, animate-pulse-ring)
 *   - "Comms_Link" / radar (right HUD)
 *   - nút Mic / Whisper / hearing_disabled ở bottom action bar
 */

let _state = {
  joined: false,
  channel: null,
  uid: null,
  micOn: false,
  mutedAll: false,
};

// Tập listener cho sự kiện "ai đang nói" (speaking indicator kiểu Google Meet).
// Khi nối Agora thật: đăng ký client.on('volume-indicator', ...) rồi gọi
// _emitSpeaking(seat, volume > NGƯỠNG) để UI bật/tắt viền sáng + icon loa.
const _speakingListeners = new Set();

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('%c[agora:stub]', 'color:#00dbe7', ...args);
}

/**
 * joinChannel — vào kênh voice của phòng.
 * @param {{ channel: string, uid?: string, token?: string }} opts
 * TODO: agoraClient.join(appId, channel, token, uid)
 */
export async function joinChannel({ channel, uid = null, token = null } = {}) {
  log('joinChannel', { channel, uid, token: token ? '***' : null });
  _state = { ..._state, joined: true, channel, uid, micOn: true };
  return { ok: true, channel, uid };
}

/**
 * leave — rời kênh voice.
 * TODO: agoraClient.leave()
 */
export async function leave() {
  log('leave', { channel: _state.channel });
  _state = { joined: false, channel: null, uid: null, micOn: false, mutedAll: false };
  return { ok: true };
}

/**
 * setMic — bật/tắt micro của chính mình.
 * @param {boolean} on
 * TODO: localAudioTrack.setEnabled(on)
 */
export async function setMic(on) {
  log('setMic', on);
  _state.micOn = !!on;
  return { ok: true, micOn: _state.micOn };
}

/**
 * muteAll — tắt/bật tiếng TẤT CẢ người khác (dùng khi vào Night Phase
 * để khoá comms, hoặc khi GM đang nói).
 * @param {boolean} muted
 * TODO: lặp remoteUsers → user.audioTrack.setVolume(muted ? 0 : 100)
 */
export async function muteAll(muted) {
  log('muteAll', muted);
  _state.mutedAll = !!muted;
  return { ok: true, mutedAll: _state.mutedAll };
}

/**
 * setRemoteVolume — chỉnh âm lượng 1 người (spatial audio theo vị trí ghế).
 * @param {string} uid
 * @param {number} volume 0..100
 * TODO: remoteUsers[uid].audioTrack.setVolume(volume)
 */
export async function setRemoteVolume(uid, volume) {
  log('setRemoteVolume', { uid, volume });
  return { ok: true };
}

/**
 * setSpeaking — đánh dấu 1 ghế (seat) đang nói hay không. Đây là điểm nối
 * tương lai với Agora volume-indicator: khi có SDK thật, callback của Agora
 * sẽ gọi hàm này. Hiện tại mockServer gọi để demo speaking indicator.
 * @param {number|string} seat - số ghế / id người chơi
 * @param {boolean} speaking
 * TODO(agora): client.enableAudioVolumeIndicator(); client.on('volume-indicator', vols => vols.forEach(v => setSpeaking(uidToSeat(v.uid), v.level > 5)))
 */
export function setSpeaking(seat, speaking) {
  log('setSpeaking', { seat, speaking });
  for (const fn of _speakingListeners) fn(seat, !!speaking);
  return { ok: true };
}

/**
 * onSpeaking — đăng ký nghe sự kiện speaking. Trả về hàm hủy đăng ký.
 * UI (AvatarCircle/PlayerAvatar) dùng để cập nhật viền sáng + icon loa.
 * @param {(seat:number|string, speaking:boolean)=>void} fn
 */
export function onSpeaking(fn) {
  _speakingListeners.add(fn);
  return () => _speakingListeners.delete(fn);
}

/** getState — snapshot trạng thái stub (debug/UI). */
export function getState() {
  return { ..._state };
}

export default {
  joinChannel,
  leave,
  setMic,
  muteAll,
  setRemoteVolume,
  setSpeaking,
  onSpeaking,
  getState,
};
