/**
 * orchestrator.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC NGAY] "Dao dien" cua Quan tro — kich ban 1 DEM.
 *
 * Theo NIGHT_ORDER (GUARD -> WEREWOLF -> SEER -> WITCH), lan luot phat cau
 * dan ("Bao ve day di", "Soi day di"...) va CHO action cua tung phe. Khi het
 * cac phe, goi advance_phase de sang ban ngay.
 *
 * Day la logic CHU DONG dan van — tuong ung sau nay se goi Agora /speak de
 * agent NOI cac cau nay (xem agora/convoai.js, TODO speakInChannel()).
 *
 * Luong dung that:
 *   1. nightScript(roomCode)  -> tra danh sach buoc { role, speak } (cau GM noi)
 *   2. Voi moi buoc: GM noi `speak` (TTS), cho nguoi choi noi -> intentParser/LLM
 *      boc lenh -> executeTool() ghi nhan.
 *   3. Khi xong het -> finishNight(roomCode) -> advance_phase -> cau cong bo sang.
 */

'use strict';

const { NIGHT_ORDER, ROLE } = require('../contracts');
const tools = require('./tools');

// Cau dan mo dau dem + tung phe (van phong rung ron, khop prompts/gm.md).
const NIGHT_INTRO = 'Man dem buong xuong ngoi lang. Tat ca hay nham mat lai...';

// Moi vai -> { speak (cau goi phe day), tool (tool tuong ung) }.
const ROLE_CUE = {
  [ROLE.GUARD]: {
    speak: 'Bao ve day di. Hay chon mot nguoi de che chan dem nay.',
    tools: ['guard_protect'],
  },
  [ROLE.WEREWOLF]: {
    speak: 'Phe Soi day di. Da den gio san moi — cac nguoi muon can ai?',
    tools: ['werewolf_kill'],
  },
  [ROLE.SEER]: {
    speak: 'Tien tri day di. Hay chon mot nguoi de soi roi ban chat.',
    tools: ['seer_check'],
  },
  [ROLE.WITCH]: {
    speak: 'Phu thuy day di. Dem nay nguoi co muon dung binh cuu hay binh doc?',
    tools: ['witch_save', 'witch_poison'],
  },
};

/**
 * Sinh kich ban 1 dem: danh sach buoc GM se dan, theo NIGHT_ORDER.
 * (Khong goi backend — chi tra cau noi + meta de tang tren dieu phoi.)
 *
 * @param {string} roomCode
 * @returns {{ intro:string, steps: Array<{role:string, speak:string, awaitTools:string[]}> }}
 */
function nightScript(roomCode) {
  const steps = NIGHT_ORDER.map((role) => {
    const cue = ROLE_CUE[role];
    return {
      role,
      speak: cue.speak,
      awaitTools: cue.tools, // cac tool hop le o buoc nay
      roomCode,
    };
  });
  return { intro: NIGHT_INTRO, steps };
}

/**
 * Ket thuc dem: goi advance_phase (NIGHT -> DAY_ANNOUNCE) va sinh cau cong bo.
 *
 * @param {string} roomCode
 * @returns {Promise<{ ok:boolean, speak:string, result?:any }>}
 */
async function finishNight(roomCode) {
  const res = await tools.executeTool('advance_phase', { roomCode, from: 'NIGHT' });
  // executeTool da sinh cau "Troi sang..." trong res.text.
  return { ok: res.ok, speak: res.text, result: res.result };
}

/**
 * Tien ich: lay snapshot trang thai (chong hallucination — biet ai con song).
 * Tang tren co the goi truoc khi dan dem de loc nguoi da chet.
 *
 * @param {string} roomCode
 */
async function snapshot(roomCode) {
  // State lấy trực tiếp từ rooms (in-process, không REST)
  const rooms = require('../game');
  const room = rooms.getRoom(roomCode);
  if (!room) return { ok: false, data: null };
  return { ok: true, data: room.getGmState() };
}

/**
 * Chay THU mot dem voi danh sach cau noi gia lap (dung cho mock/sim-night
 * va test). Tang tren that se thay `spokenLines` bang audio mic that.
 *
 * @param {string} roomCode
 * @param {string[]} spokenLines  cac cau nguoi choi noi, theo thu tu
 * @param {(text:string)=>{tool:string,args:object}|null} parse  ham boc lenh
 * @returns {Promise<Array<{speak?:string, heard?:string, tool?:string, toolResult?:any}>>}
 */
async function runNight(roomCode, spokenLines, parse) {
  const log = [];
  const { intro, steps } = nightScript(roomCode);
  log.push({ speak: intro });

  // Don gian: phat het cau dan cua moi phe, va xu ly toan bo cau noi qua parser.
  for (const step of steps) {
    log.push({ speak: step.speak, role: step.role });
  }

  for (const line of spokenLines) {
    const intent = parse(line);
    if (!intent) {
      log.push({ heard: line, note: 'khong phai lenh game — bo qua' });
      continue;
    }
    if (intent.missingSeat) {
      log.push({ heard: line, tool: intent.tool, note: 'thieu so ghe — GM se hoi lai' });
      continue;
    }
    const res = await tools.executeTool(intent.tool, { roomCode, ...intent.args });
    log.push({ heard: line, tool: intent.tool, speak: res.text, toolResult: res.result });
  }

  const ending = await finishNight(roomCode);
  log.push({ speak: ending.speak, toolResult: ending.result });
  return log;
}

module.exports = {
  NIGHT_INTRO,
  ROLE_CUE,
  nightScript,
  finishNight,
  snapshot,
  runNight,
};
