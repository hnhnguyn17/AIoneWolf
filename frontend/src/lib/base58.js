/**
 * src/lib/base58.js
 * ─────────────────────────────────────────────────────────────
 * Mã hoá Base58 (bảng chữ Bitcoin) cho chữ ký ed25519 mà ví trả về.
 *
 * Backend (contracts/api.md §1) verify chữ ký bằng tweetnacl và nhận
 * `signature` dạng **base58**. `signMessage()` của wallet-adapter trả
 * về Uint8Array, nên ta tự encode để khỏi thêm dependency `bs58`.
 *
 * Thuật toán: big-integer base conversion + giữ các byte 0 ở đầu thành '1'.
 */
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * @param {Uint8Array | number[]} bytes
 * @returns {string} chuỗi base58
 */
export function encodeBase58(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
  if (input.length === 0) return '';

  // Đếm số byte 0 ở đầu → mỗi byte 0 = một ký tự '1'.
  let zeros = 0;
  while (zeros < input.length && input[zeros] === 0) zeros++;

  // Chuyển base-256 → base-58 (xử lý như số lớn, mảng digit nhỏ nhất ở đầu).
  const digits = [0];
  for (let i = zeros; i < input.length; i++) {
    let carry = input[i];
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8; // digits[j] * 256
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }

  let out = '1'.repeat(zeros);
  for (let k = digits.length - 1; k >= 0; k--) {
    out += ALPHABET[digits[k]];
  }
  return out;
}

export default encodeBase58;
