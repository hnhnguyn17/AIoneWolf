/**
 * backend/contracts.js
 * ─────────────────────────────────────────────────────────────
 * [ADAPTER] Nạp contracts/gametypes.js + contracts/events.js (single source
 * of truth) MÀ KHÔNG sửa file gốc.
 *
 * Vấn đề: contracts/*.js dùng "dual export" (CommonJS + ESM). Chúng có
 * `module.exports = ...` (CommonJS) NHƯNG cũng có `export default ...` (ESM) ở
 * cuối file. Node >=18 khi `require()` sẽ parse CẢ file kiểu CommonJS và báo lỗi
 * "Unexpected token 'export'".
 *
 * Giải pháp (không thêm deps, không sửa contracts): đọc source, BỎ các dòng
 * `export ...` (ESM-only) — chúng nằm ở CUỐI file, SAU `module.exports` — rồi
 * chạy phần CommonJS còn lại trong VM sandbox để lấy `module.exports`.
 * Tất cả module trong backend/ import contracts qua đây.
 *
 * Nếu sau này repo chuyển contracts thành thuần CommonJS thì file này vẫn chạy
 * (require thẳng) nhờ fallback bên dưới.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONTRACTS_DIR = path.resolve(__dirname, '..', '..', 'contracts');

function loadDualExport(absPath) {
  const src = fs.readFileSync(absPath, 'utf8');

  // Nếu file KHÔNG còn `export ` (ESM) -> require thẳng được.
  if (!/^\s*export\s/m.test(src)) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(absPath);
  }

  // Cắt từ dòng `export` đầu tiên trở đi -> còn lại phần CommonJS đầy đủ
  // (kể cả block `export { ... };` nhiều dòng).
  const lines = src.split('\n');
  const firstExport = lines.findIndex((line) => /^\s*export\s/.test(line));
  const cjsOnly = (firstExport === -1 ? lines : lines.slice(0, firstExport)).join('\n');

  const sandbox = { module: { exports: {} }, exports: {}, require, __dirname, console };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(cjsOnly, sandbox, { filename: absPath });
  return sandbox.module.exports;
}

const gametypes = loadDualExport(path.join(CONTRACTS_DIR, 'gametypes.js'));
const events = loadDualExport(path.join(CONTRACTS_DIR, 'events.js'));

module.exports = { ...gametypes, ...events };
