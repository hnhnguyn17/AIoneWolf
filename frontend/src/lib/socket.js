/**
 * src/lib/socket.js
 * ─────────────────────────────────────────────────────────────
 * Wrapper quanh socket.io-client, dùng ĐÚNG tên event C2S/S2C trong
 * contracts.js. Có 2 chế độ:
 *
 *   - THẬT   : kết nối backend qua socket.io (auth bằng JWT).
 *   - MOCK   : VITE_MOCK=1 → dùng createMockSocket() (mockServer.js),
 *              tự diễn 1 ván demo để `npm run dev` thấy game chạy mà
 *              KHÔNG cần backend.
 *
 * API export:
 *   getSocket({ token })  → singleton socket (thật hoặc mock)
 *   connectSocket(opts)   → tạo & connect (alias)
 *   disconnectSocket()    → ngắt + xoá singleton
 *   isMock()              → true nếu đang ở chế độ mock
 *   C2S, S2C              → re-export cho tiện
 */
import { io } from 'socket.io-client';
import { BACKEND_URL } from './api.js';
import { createMockSocket } from './mockServer.js';
import { C2S, S2C } from './contracts.js';

export { C2S, S2C };

export function isMock() {
  return import.meta.env.VITE_MOCK === '1' || import.meta.env.VITE_MOCK === 'true';
}

let _socket = null;

/**
 * getSocket — trả socket singleton. Lần đầu sẽ khởi tạo.
 * @param {{ token?: string|null }} [opts]
 */
export function getSocket(opts = {}) {
  if (_socket) return _socket;
  return connectSocket(opts);
}

/**
 * connectSocket — tạo socket mới (thật hoặc mock) và connect.
 * @param {{ token?: string|null }} [opts]
 */
export function connectSocket({ token = null } = {}) {
  if (_socket) return _socket;

  if (isMock()) {
    // eslint-disable-next-line no-console
    console.log('%c[socket] MOCK mode — no backend required', 'color:#00dbe7');
    _socket = createMockSocket();
    return _socket;
  }

  _socket = io(BACKEND_URL, {
    transports: ['websocket'],
    autoConnect: true,
    auth: token ? { token } : undefined,
  });
  return _socket;
}

/** disconnectSocket — ngắt và xoá singleton (gọi khi logout/unmount app). */
export function disconnectSocket() {
  if (_socket) {
    try {
      _socket.disconnect();
    } catch {
      /* ignore */
    }
    _socket = null;
  }
}

export default { getSocket, connectSocket, disconnectSocket, isMock, C2S, S2C };
