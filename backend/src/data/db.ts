/**
 * data/db.ts — kết nối SQLite (better-sqlite3) singleton + chạy schema.
 * File DB: backend/data/echoes.db (tự tạo). Đồng bộ (synchronous) — đơn giản, đủ nhanh.
 */
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'echoes.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const db: Database.Database = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

/** Chạy schema.sql (idempotent). Gọi 1 lần lúc khởi động. */
export function initSchema(): void {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(sql);
}

initSchema();
