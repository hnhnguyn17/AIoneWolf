/**
 * data/migrate.ts — chạy schema.sql tạo bảng. `npm run db:migrate`.
 */
import { initSchema } from './db.js';

initSchema();
console.log('[migrate] schema.sql đã chạy — bảng sẵn sàng.');
