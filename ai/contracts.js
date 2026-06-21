/**
 * contracts.js
 * ─────────────────────────────────────────────────────────────
 * [ADAPTER] Nap contracts/gametypes.js (single source of truth) MA KHONG sua
 * file goc.
 *
 * Van de: contracts/gametypes.js dung "dual export" (CommonJS + ESM). No co
 * `module.exports = GameTypes` (CommonJS) NHUNG cung co `export default ...`
 * (ESM) o cuoi file. Node >=18 khi `require()` se parse CA file kieu CommonJS
 * va bao loi "Unexpected token 'export'".
 *
 * Giai phap (khong dung deps, khong sua contracts): doc source, BO cac dong
 * `export ...` (ESM-only), roi chay phan CommonJS con lai trong VM sandbox de
 * lay `module.exports`. Tat ca module trong ai/ import contracts qua day.
 *
 * Neu sau nay repo sua contracts thanh thuan CommonJS, file nay van hoat dong
 * (require thang van duoc) — co fallback ben duoi.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CONTRACT_PATH = path.resolve(__dirname, '..', 'contracts', 'gametypes.js');

function loadGameTypes() {
  const src = fs.readFileSync(CONTRACT_PATH, 'utf8');

  // Neu file KHONG co `export ` (ESM) -> require thang duoc (repo da chuyen
  // sang thuan CommonJS). Khong co thi require se in warning, nen check truoc.
  if (!/^\s*export\s/m.test(src)) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(CONTRACT_PATH);
  }

  // Cac `export ...` (default + named block) cua contract nam o CUOI file, SAU
  // khi `module.exports = GameTypes` da chay. Vi the cat tu dong `export` dau
  // tien tro di la lay duoc phan CommonJS day du (ke ca block `export { ... };`
  // nhieu dong — neu chi loc tung dong se con sot `}` gay loi parse).
  const lines = src.split('\n');
  const firstExport = lines.findIndex((line) => /^\s*export\s/.test(line));
  const cjsOnly = (firstExport === -1 ? lines : lines.slice(0, firstExport)).join('\n');

  const sandbox = { module: { exports: {} }, exports: {}, require, __dirname, console };
  sandbox.module.exports = sandbox.exports;
  vm.runInNewContext(cjsOnly, sandbox, { filename: CONTRACT_PATH });
  return sandbox.module.exports;
}

module.exports = loadGameTypes();
