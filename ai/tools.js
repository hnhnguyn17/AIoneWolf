/**
 * tools.js
 * ─────────────────────────────────────────────────────────────
 * [CHAY DUOC NGAY] Dinh nghia cac "tool" theo chuan OpenAI function-calling
 * + handler thuc thi (server-side) goi dung endpoint backend.
 *
 * Moi tool gom:
 *   - schema:  JSON schema kieu OpenAI ({ type:'function', function:{ name, description, parameters }})
 *              -> day la cai ta khai bao cho LLM that (gpt-4o-mini qua Agora) sau nay.
 *   - handler: async (args, ctx) => { text, result }  — chay tai tool-server (server-side tool exec).
 *
 * Map role/action theo contracts/gametypes.js:
 *   werewolf_kill -> actorRole WEREWOLF, action KILL
 *   seer_check    -> actorRole SEER,     action CHECK
 *   guard_protect -> actorRole GUARD,    action PROTECT
 *   witch_save    -> actorRole WITCH,    action SAVE
 *   witch_poison  -> actorRole WITCH,    action POISON
 *   vote          -> bo phieu treo co ban ngay (action VOTE qua /gm/action)
 *   advance_phase -> POST /gm/advance-phase
 */

'use strict';

const { ROLE, NIGHT_ACTION } = require('./contracts');
const gmClient = require('./gmClient');

// ─── Schema dung chung cho cac tool "1 muc tieu theo so ghe" ──
function targetSeatParam(desc) {
  return {
    type: 'object',
    properties: {
      roomCode: {
        type: 'string',
        description: 'Ma phong dang choi (vd "ABCD"). Lay tu ngu canh van game.',
      },
      targetSeat: {
        type: 'integer',
        description: desc,
        minimum: 1,
      },
    },
    required: ['roomCode', 'targetSeat'],
  };
}

/**
 * Bang dinh nghia tool. Key = ten tool (trung field function.name).
 * `actorRole` + `action` la hang so map sang body /gm/action.
 */
const TOOL_DEFS = {
  werewolf_kill: {
    actorRole: ROLE.WEREWOLF,
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
    actorRole: ROLE.SEER,
    action: NIGHT_ACTION.CHECK,
    schema: {
      type: 'function',
      function: {
        name: 'seer_check',
        description: 'Tien tri soi nguoi choi o ghe so N de biet la phe Soi hay phe Dan.',
        parameters: targetSeatParam('So ghe nguoi Tien tri muon soi.'),
      },
    },
  },

  guard_protect: {
    actorRole: ROLE.GUARD,
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
    actorRole: ROLE.WITCH,
    action: NIGHT_ACTION.SAVE,
    schema: {
      type: 'function',
      function: {
        name: 'witch_save',
        description: 'Phu thuy dung binh cuu de cuu nan nhan bi Soi can (ghe so N). Chi 1 lan/van.',
        parameters: targetSeatParam('So ghe nan nhan ma Phu thuy muon cuu.'),
      },
    },
  },

  witch_poison: {
    actorRole: ROLE.WITCH,
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
    actorRole: null, // bo phieu ban ngay: khong gan voi 1 vai cu the
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
    actorRole: null,
    action: null, // dung endpoint rieng /gm/advance-phase
    schema: {
      type: 'function',
      function: {
        name: 'advance_phase',
        description:
          'Chuyen sang pha tiep theo khi pha hien tai da xong (vd het luot dem -> sang). Tra ve nguoi chet dem qua.',
        parameters: {
          type: 'object',
          properties: {
            roomCode: { type: 'string', description: 'Ma phong.' },
            from: {
              type: 'string',
              description: 'Pha hien tai dang ket thuc (vd "NIGHT"). Xem PHASE trong contracts.',
            },
          },
          required: ['roomCode', 'from'],
        },
      },
    },
  },
};

/**
 * Handler thuc thi 1 tool (server-side). Goi backend qua gmClient.
 * Tra ve { ok, text, result } trong do `text` la cau GM se NOI lai (TTS).
 *
 * @param {string} name    ten tool
 * @param {object} args     tham so (roomCode, targetSeat, from...)
 * @returns {Promise<{ok:boolean, text:string, result?:any}>}
 */
async function executeTool(name, args) {
  const def = TOOL_DEFS[name];
  if (!def) {
    return { ok: false, text: `Khong nhan ra hanh dong "${name}".` };
  }

  // advance_phase dung endpoint rieng.
  if (name === 'advance_phase') {
    const res = await gmClient.advancePhase({
      roomCode: args.roomCode,
      from: args.from,
    });
    if (!res.ok) return { ok: false, text: res.message || 'Khong chuyen duoc pha.', result: res.data };
    const d = res.data || {};
    const deaths = Array.isArray(d.deaths) ? d.deaths : [];
    const who =
      deaths.length === 0
        ? 'Dem qua khong ai thiet mang.'
        : `Dem qua, ${deaths.map((x) => `ghe so ${x.seat}`).join(', ')} da nga xuong.`;
    return {
      ok: true,
      text: `Troi sang. ${who}`,
      result: d,
    };
  }

  // Cac tool con lai -> POST /gm/action.
  const res = await gmClient.postAction({
    roomCode: args.roomCode,
    actorRole: def.actorRole, // co the null voi vote — backend tu hieu theo action
    action: def.action,
    targetSeat: args.targetSeat,
  });

  if (!res.ok) {
    // 409: sai pha / target chet -> AI noi "khong hop le".
    return { ok: false, text: res.message || 'Hanh dong khong hop le.', result: res.data };
  }

  return { ok: true, text: speakFor(name, args, res.data), result: res.data };
}

/**
 * Sinh cau GM noi lai sau khi tool chay xong (TTS).
 * Rieng seer_check: doc lai ket qua phe Soi/Dan cho Tien tri.
 */
function speakFor(name, args, data) {
  const seat = args.targetSeat;
  switch (name) {
    case 'werewolf_kill':
      return `Phe Soi da chon ghe so ${seat}. Soi nham mat lai.`;
    case 'seer_check': {
      const team = data && data.result ? data.result.team : data && data.team;
      const label = team === 'WEREWOLF' ? 'thuoc phe SOI' : 'thuoc phe DAN';
      return `Tien tri, nguoi o ghe so ${seat} ${label}. Hay ghi nho va nham mat lai.`;
    }
    case 'guard_protect':
      return `Bao ve da chan cho ghe so ${seat} dem nay.`;
    case 'witch_save':
      return `Phu thuy da dung binh cuu cho ghe so ${seat}.`;
    case 'witch_poison':
      return `Phu thuy da ra tay voi ghe so ${seat}.`;
    case 'vote':
      return `Lang da bo phieu treo co ghe so ${seat}.`;
    default:
      return `Da ghi nhan hanh dong cho ghe so ${seat}.`;
  }
}

/**
 * Tra ve mang schema OpenAI (de nhet vao request LLM that sau nay).
 */
function getToolSchemas() {
  return Object.values(TOOL_DEFS).map((d) => d.schema);
}

module.exports = {
  TOOL_DEFS,
  executeTool,
  getToolSchemas,
};
