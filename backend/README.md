# Backend — Echoes of the Lycan

Express + TypeScript. Game core + AI Quản trò + Agora + Solana auth. Cổng `3636`.

## Lệnh

```bash
npm install
npm run db:migrate      # tạo bảng (data/echoes.db)
npm run db:seed         # user demo (db:clean để xóa sạch)
npm run dev             # tsx watch — dev
npm run typecheck       # tsc --noEmit
npm run build           # → dist/
npm start               # chạy dist/
```

## Cấu trúc `src/`

```
config/      env (Zod) + hằng số
contracts/   enum + tên sự kiện (1 nguồn, khớp FE)
domain/      LUẬT GAME thuần (OOP) — KHÔNG biết socket/db
  ├─ GameRoom.ts      trái tim: state machine, 1 cửa mutation, resolveNight
  ├─ Player.ts        người/bot (composition: chứa role)
  ├─ RoomManager.ts   quản các phòng
  ├─ roles/           RoleRegistry — mỗi vai 1 file
  ├─ deck/elo/winCheck.ts
data/        SQLite (better-sqlite3) + repositories
services/    ĐIỀU PHỐI: gameService + ai/ (gm,bot,llm) + agora/ + solana/
api/         REST routes + middleware
socket/      handlers realtime (8 sự kiện C2S)
app.ts       composition root (nối mọi thứ)
server.ts    entry
```

## Cờ `.env` (xem `.env.example`)

| Cờ | Mặc định | Tác dụng |
|---|---|---|
| `LLM_ENABLED` | 0 | bật LLM cho GM/bot |
| `LLM_PROVIDER` | ollama | ollama / groq / openai |
| `AGORA_AGENT_ENABLED` | 0 | bật ConvoAI agent audio thật |
| `PUBLIC_URL` | trống | có = custom-LLM, trống = managed |
| `REQUIRE_AUTH` | 0 | bắt buộc đăng nhập ví |

Mặc định mọi AI/Agora TẮT → game core chạy ngay không cần key.

## Thiết kế

Xem [`../docs/design/`](../docs/design/) — kiến trúc, state machine, OOP, AI, Solana, hợp đồng FE↔BE.
