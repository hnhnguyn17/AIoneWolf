/**
 * src/lib/socket.js
 * Wrapper quanh socket.io-client. CHỈ chế độ THẬT (mock đã gỡ).
 *   getSocket({ token }) → singleton socket
 *   connectSocket(opts)  → tạo & connect
 *   disconnectSocket()   → ngắt + xoá singleton
 */
import { io } from 'socket.io-client';
import { BACKEND_URL } from './api.js';
import { C2S, S2C } from './contracts.js';

export { C2S, S2C };

let _socket = null;

export function getSocket(opts = {}) {
  if (_socket) return _socket;
  return connectSocket(opts);
}

export function connectSocket({ token = null } = {}) {
  if (_socket) return _socket;
  _socket = io(BACKEND_URL, {
    transports: ['websocket'],
    autoConnect: true,
    auth: token ? { token } : undefined,
  });
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    try { _socket.disconnect(); } catch { /* ignore */ }
    _socket = null;
  }
}

export default { getSocket, connectSocket, disconnectSocket, C2S, S2C };
