/**
 * contracts/index.ts — re-export 1 cửa cho toàn backend.
 * 1 NGUỒN sự thật, khớp frontend/src/lib/contracts.js.
 */
export * from './roles.js';
export * from './phases.js';
export * from './presets.js';
export * from './events.js';

export const CONTRACT_VERSION = '2.0.0';
