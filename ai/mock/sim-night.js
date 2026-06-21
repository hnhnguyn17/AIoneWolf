/**
 * mock/sim-night.js
 * ─────────────────────────────────────────────────────────────
 * [MOCK / DEMO] CHUNG MINH luong boc lenh hoat dong.
 *
 * Day vai cau noi tieng Viet vao intent-parser -> in ra tool_call + REST call
 * tuong ung. Phan boc lenh thuan JS (intentParser) CHAY NGAY khong can deps.
 *
 * Chay (chi xem boc lenh, KHONG goi backend):
 *   node mock/sim-night.js
 *
 * Chay co goi backend that (can fake-backend dang chay o cong 4000):
 *   node mock/fake-backend.js        # terminal 1
 *   node mock/sim-night.js --live    # terminal 2  (can axios da install)
 */

'use strict';

const path = require('path');
const { parseIntent } = require('../intentParser');
const { TOOL_DEFS } = require('../tools');
const { ROLE } = require('../contracts');

const LIVE = process.argv.includes('--live');
const ROOM = 'DEMO';

// Cac cau nguoi choi "noi" trong 1 dem (co dau, lan lon nhu mic that).
const SPOKEN_LINES = [
  'Bảo vệ che chắn cho số 5',
  'Sói cắn người số 3',
  'Tiên tri soi số 2',
  'Phù thủy cứu số 3',
  'Treo cổ số 4',
  'Trời sáng đi quản trò',
  'Soi số 9', // ghe da chet -> backend tra 409 (neu --live)
  'Hôm nay trời đẹp nhỉ', // khong phai lenh -> bo qua
];

// Map tool -> { actorRole, action } de in ra REST call du kien.
function restPreview(tool, args) {
  const def = TOOL_DEFS[tool];
  if (!def) return null;
  if (tool === 'advance_phase') {
    return {
      method: 'POST',
      path: '/gm/advance-phase',
      body: { roomCode: ROOM, from: args.from || 'NIGHT' },
    };
  }
  return {
    method: 'POST',
    path: '/gm/action',
    body: {
      roomCode: ROOM,
      actorRole: def.actorRole,
      action: def.action,
      targetSeat: args.targetSeat,
    },
  };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' SIM-NIGHT — chung minh luong: cau noi -> tool_call -> REST');
  console.log(` Mode: ${LIVE ? 'LIVE (goi fake-backend)' : 'DRY (chi boc lenh)'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  // Neu --live, nap tools that (can axios). Khong thi chi preview.
  let tools = null;
  if (LIVE) {
    process.env.BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
    process.env.GM_SECRET = process.env.GM_SECRET || 'dev-gm-secret';
    try {
      tools = require(path.join('..', 'tools'));
    } catch (e) {
      console.error('Khong nap duoc tools.js (thieu axios?). Chay `npm install` truoc.\n', e.message);
      process.exit(1);
    }
  }

  let n = 0;
  for (const line of SPOKEN_LINES) {
    n += 1;
    console.log(`(${n}) 🎙️  Nguoi choi noi: "${line}"`);
    const intent = parseIntent(line);

    if (!intent) {
      console.log('     → khong phai lenh game — Quan tro bo qua.\n');
      continue;
    }
    if (intent.missingSeat) {
      console.log(`     → tool_call: ${intent.tool} (THIEU so ghe) — GM hoi lai "chon ghe so may?"\n`);
      continue;
    }

    // In tool_call (kieu OpenAI function-calling).
    console.log(`     → tool_call: ${intent.tool}(${JSON.stringify({ roomCode: ROOM, ...intent.args })})`);

    // In REST call du kien.
    const preview = restPreview(intent.tool, intent.args);
    console.log(`     → REST: ${preview.method} ${preview.path}  ${JSON.stringify(preview.body)}`);

    // Neu --live: goi backend that qua tools.executeTool.
    if (LIVE && tools) {
      const res = await tools.executeTool(intent.tool, { roomCode: ROOM, ...intent.args });
      const tag = res.ok ? '✅ OK' : '⛔ KHONG HOP LE';
      console.log(`     → backend: ${tag} | GM noi: "${res.text}"`);
    }
    console.log('');
  }

  // Tom tat map vai/action theo contracts.
  console.log('───────────────────────────────────────────────────────');
  console.log(' Map tool -> (actorRole, action) theo contracts/gametypes:');
  for (const [name, def] of Object.entries(TOOL_DEFS)) {
    if (name === 'advance_phase') {
      console.log(`   ${name.padEnd(14)} -> POST /gm/advance-phase`);
    } else {
      console.log(`   ${name.padEnd(14)} -> ${String(def.actorRole)}/${def.action}`);
    }
  }
  console.log('───────────────────────────────────────────────────────');
  console.log(` (ROLE enum kiem chung: WEREWOLF=${ROLE.WEREWOLF}, SEER=${ROLE.SEER})`);
  if (!LIVE) {
    console.log('\n Goi y: chay `node mock/fake-backend.js` roi `node mock/sim-night.js --live`');
    console.log(' de thay backend tra ket qua that (gom 409 cho ghe da chet).');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
