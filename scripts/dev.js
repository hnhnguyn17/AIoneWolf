/**
 * scripts/dev.js
 * ─────────────────────────────────────────────────────────────
 * Bộ khởi động "1 lệnh" cho AIoneWolf (chạy được trên Windows/macOS/Linux,
 * KHÔNG cần `make`):
 *
 *   1. Cài deps cho backend + frontend nếu thiếu node_modules.
 *   2. Migrate DB SQLite (tạo backend/data/aionewolf.db nếu chưa có).
 *   3. Seed ~20 user giả nếu DB còn trống (bỏ qua nếu đã có dữ liệu).
 *   4. Chạy SONG SONG backend (:3636) + frontend (:3000); Ctrl+C tắt cả hai.
 *
 * Dùng:
 *   node scripts/dev.js            # full: setup + chạy BE + FE
 *   node scripts/dev.js setup      # chỉ cài deps + migrate + seed (không chạy)
 *   node scripts/dev.js migrate    # chỉ migrate
 *   node scripts/dev.js seed       # chỉ seed
 *   node scripts/dev.js backend    # chỉ chạy backend
 *   node scripts/dev.js frontend   # chỉ chạy frontend
 */
'use strict';

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function log(msg) { console.log(`\x1b[36m[dev]\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m[dev]\x1b[0m ${msg}`); }

/** Chạy 1 lệnh đồng bộ trong cwd, ném lỗi nếu fail. */
function run(cmd, args, cwd, label) {
  log(`${label} → ${cmd} ${args.join(' ')}  (${path.relative(ROOT, cwd) || '.'})`);
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    throw new Error(`${label} thất bại (exit ${r.status}).`);
  }
}

/** Cài deps nếu thiếu node_modules. */
function ensureDeps() {
  for (const [dir, name] of [[BACKEND, 'backend'], [FRONTEND, 'frontend']]) {
    if (!fs.existsSync(path.join(dir, 'node_modules'))) {
      run(NPM, ['install'], dir, `Cài deps ${name}`);
    } else {
      log(`deps ${name}: đã có (bỏ qua install).`);
    }
  }
}

/** Tạo .env từ .env.example nếu chưa có (clone mới là chạy được ngay). */
function ensureEnv() {
  const targets = [
    [path.join(BACKEND, '.env'), path.join(BACKEND, '.env.example'), 'backend/.env'],
    [path.join(FRONTEND, '.env'), path.join(FRONTEND, '.env.example'), 'frontend/.env'],
  ];
  for (const [dest, src, label] of targets) {
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      log(`Tạo ${label} từ .env.example (chỉnh secret khi cần).`);
    }
  }
}

/** Migrate DB (tạo bảng + file .db nếu chưa có). */
function migrate() {
  run('node', ['src/db/migrate.js'], BACKEND, 'Migrate DB');
}

/** Seed nếu DB còn trống (không ghi đè khi đã có user). */
function seedIfEmpty() {
  const store = require(path.join(BACKEND, 'src', 'db', 'store.js'));
  const count = store.leaderboard(1).length;
  if (count === 0) {
    run('node', ['mock/seed-fake.js'], BACKEND, 'Seed dữ liệu giả');
  } else {
    log(`DB đã có user (${store.leaderboard(1000).length}) → bỏ qua seed. (ép seed: node scripts/dev.js seed)`);
  }
}

/** Chạy BE + FE song song; gom log; Ctrl+C tắt cả hai. */
function runDev() {
  const procs = [];
  function start(label, cmd, args, cwd, color) {
    const p = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    const tag = `\x1b[${color}m[${label}]\x1b[0m`;
    p.stdout.on('data', (d) => process.stdout.write(prefix(tag, d)));
    p.stderr.on('data', (d) => process.stderr.write(prefix(tag, d)));
    p.on('exit', (code) => {
      warn(`${label} đã dừng (exit ${code}). Tắt tiến trình còn lại…`);
      shutdown();
    });
    procs.push(p);
  }
  function prefix(tag, buf) {
    return String(buf).split('\n').map((l) => (l ? `${tag} ${l}` : l)).join('\n');
  }
  let closing = false;
  function shutdown() {
    if (closing) return;
    closing = true;
    for (const p of procs) { try { p.kill(); } catch { /* ignore */ } }
    process.exit(0);
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  log('Khởi chạy backend :3636 + frontend :3000  (Ctrl+C để tắt)');
  start('BE', NPM, ['run', 'dev'], BACKEND, '35');      // magenta
  start('FE', NPM, ['run', 'dev'], FRONTEND, '32');     // green
}

// ─── Dispatch ─────────────────────────────────────────────
const mode = (process.argv[2] || 'all').toLowerCase();
try {
  switch (mode) {
    case 'setup':
      ensureEnv(); ensureDeps(); migrate(); seedIfEmpty();
      log('Setup xong. Chạy app: node scripts/dev.js');
      break;
    case 'migrate':
      ensureEnv(); migrate();
      break;
    case 'seed':
      run('node', ['mock/seed-fake.js'], BACKEND, 'Seed dữ liệu giả');
      break;
    case 'backend':
      ensureEnv(); ensureDeps(); migrate(); seedIfEmpty();
      runDevSingle('BE', BACKEND);
      break;
    case 'frontend':
      ensureEnv(); ensureDeps();
      runDevSingle('FE', FRONTEND);
      break;
    case 'all':
    default:
      ensureEnv(); ensureDeps(); migrate(); seedIfEmpty(); runDev();
      break;
  }
} catch (e) {
  console.error(`\x1b[31m[dev] LỖI:\x1b[0m ${e.message}`);
  process.exit(1);
}

/** Chạy đơn lẻ 1 service (kế thừa stdio trực tiếp). */
function runDevSingle(label, cwd) {
  log(`Khởi chạy ${label} (${path.relative(ROOT, cwd)})  (Ctrl+C để tắt)`);
  const p = spawn(NPM, ['run', 'dev'], { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  p.on('exit', (code) => process.exit(code || 0));
}
