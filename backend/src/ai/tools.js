'use strict';

/**
 * backend/src/ai/tools.js
 * Định nghĩa OpenAI function-calling tools + handler thực thi qua gmService.
 * Không còn axios/gmClient — gọi gmService trực tiếp (function call).
 */

const { ROLE, NIGHT_ACTION } = require('../contracts');

function targetSeatParam(desc) {
  return {
    type: 'object',
    properties: {
      roomCode: { type: 'string', description: 'Ma phong (vd "ABCD").' },
      targetSeat: { type: 'integer', description: desc, minimum: 1 },
    },
    required: ['roomCode', 'targetSeat'],
  };
}

const TOOL_DEFS = {
  werewolf_kill: {
    action: NIGHT_ACTION.KILL,
    schema: {
      type: 'function',
      function: {
        name: 'werewolf_kill',
        description: 'Phe Soi chon can chet nguoi choi o ghe so N trong dem.',
        parameters: targetSeatParam('So ghe nan nhan ma Soi muon can.'),
      },
    },
  },
  seer_check: {
    action: NIGHT_ACTION.CHECK,
    schema: {
      type: 'function',
      function: {
        name: 'seer_check',
        description: 'Tien tri soi nguoi choi o ghe so N de biet la phe Soi hay Dan.',
        parameters: targetSeatParam('So ghe nguoi Tien tri muon soi.'),
      },
    },
  },
  guard_protect: {
    action: NIGHT_ACTION.PROTECT,
    schema: {
      type: 'function',
      function: {
        name: 'guard_protect',
        description: 'Bao ve chan 1 mang cho nguoi choi o ghe so N trong dem.',
        parameters: targetSeatParam('So ghe nguoi duoc Bao ve chan.'),
      },
    },
  },
  witch_save: {
    action: NIGHT_ACTION.SAVE,
    schema: {
      type: 'function',
      function: {
        name: 'witch_save',
        description: 'Phu thuy dung binh cuu de cuu nan nhan bi Soi can. Chi 1 lan/van.',
        parameters: targetSeatParam('So ghe nan nhan ma Phu thuy muon cuu.'),
      },
    },
  },
  witch_poison: {
    action: NIGHT_ACTION.POISON,
    schema: {
      type: 'function',
      function: {
        name: 'witch_poison',
        description: 'Phu thuy dung binh doc giet nguoi choi o ghe so N. Chi 1 lan/van.',
        parameters: targetSeatParam('So ghe nguoi ma Phu thuy muon dau doc.'),
      },
    },
  },
  vote: {
    action: 'VOTE',
    schema: {
      type: 'function',
      function: {
        name: 'vote',
        description: 'Ban ngay: ca lang bo phieu treo co nguoi choi o ghe so N.',
        parameters: targetSeatParam('So ghe nguoi bi de nghi treo co.'),
      },
    },
  },
  advance_phase: {
    action: null,
    schema: {
      type: 'function',
      function: {
        name: 'advance_phase',
        description: 'Chuyen sang pha tiep theo khi pha hien tai da xong.',
        parameters: {
          type: 'object',
          properties: {
            roomCode: { type: 'string' },
            from: { type: 'string', description: 'Pha hien tai (vd "NIGHT").' },
          },
          required: ['roomCode'],
        },
      },
    },
  },
};

/**
 * Thực thi tool — gọi gmService trực tiếp (không REST/axios).
 * @param {string} name
 * @param {object} args  { roomCode, targetSeat, from, voterSeat }
 * @param {object} ctx   { room: GameRoom, gm: gmService }
 */
async function executeTool(name, args, ctx) {
  const def = TOOL_DEFS[name];
  if (!def) return { ok: false, text: `Khong nhan ra hanh dong "${name}".` };

  const { room, gm } = ctx || {};
  if (!room || !gm) return { ok: false, text: 'Thieu ngu canh phong.' };

  if (name === 'advance_phase') {
    const res = gm.advancePhase(room);
    if (!res.ok) return { ok: false, text: res.error || 'Khong chuyen duoc pha.', result: res };
    const deaths = Array.isArray(res.deaths) ? res.deaths : [];
    const who = deaths.length === 0
      ? 'Dem qua khong ai thiet mang.'
      : `Dem qua, ${deaths.map((x) => `ghe so ${x.seat}`).join(', ')} da nga xuong.`;
    return { ok: true, text: `Troi sang. ${who}`, result: res };
  }

  if (name === 'vote') {
    const res = gm.castVote(room, args.voterSeat ?? null, args.targetSeat);
    if (!res.ok) return { ok: false, text: res.error || 'Khong bo phieu duoc.', result: res };
    return { ok: true, text: speakFor(name, args, res.result), result: res.result };
  }

  // Các tool đêm: gọi applyNightAction (actorSocketId = null vì AI không có socket)
  const res = gm.applyNightAction(room, def.action, args.targetSeat, null);
  if (!res.ok) return { ok: false, text: res.error || 'Hanh dong khong hop le.', result: res };
  return { ok: true, text: speakFor(name, args, res.result), result: res.result };
}

function speakFor(name, args, data) {
  const seat = args.targetSeat;
  switch (name) {
    case 'werewolf_kill':   return `Phe Soi da chon ghe so ${seat}. Soi nham mat lai.`;
    case 'seer_check': {
      const team = data && data.team;
      const label = team === 'WEREWOLF' ? 'thuoc phe SOI' : 'thuoc phe DAN';
      return `Tien tri, nguoi o ghe so ${seat} ${label}. Hay ghi nho va nham mat lai.`;
    }
    case 'guard_protect':   return `Bao ve da chan cho ghe so ${seat} dem nay.`;
    case 'witch_save':      return `Phu thuy da dung binh cuu cho ghe so ${seat}.`;
    case 'witch_poison':    return `Phu thuy da ra tay voi ghe so ${seat}.`;
    case 'vote':            return `Lang da bo phieu treo co ghe so ${seat}.`;
    default:                return `Da ghi nhan hanh dong cho ghe so ${seat}.`;
  }
}

function getToolSchemas() {
  return Object.values(TOOL_DEFS).map((d) => d.schema);
}

module.exports = { TOOL_DEFS, executeTool, getToolSchemas };
