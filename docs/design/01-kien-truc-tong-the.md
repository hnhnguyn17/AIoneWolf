# 01 — Kiến trúc tổng thể

> Echoes of the Lycan — game Ma Sói online (voice + AI Quản trò + Solana NFT).
> Backend dựng lại bằng **TypeScript + Express**, kiến trúc OOP + functional, phân lớp rõ.

## 1. Bức tranh tổng

```
┌─────────────┐   socket.io + REST   ┌──────────────────────────────┐
│  Frontend   │ ◄──────────────────► │   Backend (Express + TS)      │
│ React/Vite  │                      │                               │
│ port 3000   │   Agora RTC voice    │  ┌── api/    REST layer mỏng  │
└─────────────┘ ◄───┐                │  ┌── socket/ realtime game    │
        │           │                │  ┌── services/ điều phối + AI │
        ▼           │                │  ┌── domain/  LUẬT GAME (OOP)  │
┌─────────────┐     │                │  └── data/    SQLite repos     │
│ Agora Cloud │ ◄───┘                └──────────────────────────────┘
│ RTC+ConvoAI │                              │
└─────────────┘                              ▼
┌─────────────┐                      ┌──────────────┐
│   Solana    │ ◄─── wallet auth ─── │  echoes.db   │
│  (devnet)   │      + NFT mint      │  (SQLite)    │
└─────────────┘                      └──────────────┘
```

## 2. Phân lớp (dependency 1 chiều)

```
api / socket  →  services  →  domain + data
   (mỏng)       (điều phối)    (luật + lưu trữ)
```

| Lớp | Thư mục | Trách nhiệm | Biết gì |
|---|---|---|---|
| **domain** | `src/domain/` | LUẬT GAME thuần (OOP). GameRoom, Player, RoleRegistry, elo, winCheck | KHÔNG biết socket/db/express |
| **data** | `src/data/` | SQLite + repositories | chỉ DB |
| **services** | `src/services/` | điều phối: mutate domain + emit socket + persist + gọi AI | biết cả domain lẫn io |
| **api** | `src/api/` | REST endpoints (auth, history, agora token) | mỏng, gọi service |
| **socket** | `src/socket/` | realtime game (8 sự kiện C2S → service) | mỏng, gọi service |
| **contracts** | `src/contracts/` | enum + tên sự kiện — 1 nguồn, khớp FE | — |
| **config** | `src/config/` | env (Zod) + hằng số | — |

**Nguyên tắc GRASP áp dụng:**
- **Low Coupling**: `domain` KHÔNG import socket/db. Side-effect đi qua callback (`RoomHooks`) + tầng service.
- **High Cohesion**: mỗi lớp 1 việc. GameRoom gom state + hành vi của phòng; service gom điều phối.
- **Information Expert**: ai giữ data thì xử lý — Player tự `isAlive()`, GameRoom tự `resolveNight()` (vì giữ buffer).

## 3. Ba thực thể OOP cốt lõi

```
GameRoom (1 phòng = 1 ván)  ── ôm state status/phase/cycle + players[]
   └─ Player[] (người/bot)  ── composition: CHỨA role (đổi được), không kế thừa
        └─ role → RoleRegistry  ── "1 nơi chung": tên/điểm/state/hành vi mỗi vai
```

Xem chi tiết: [02-state-machine.md](02-state-machine.md), [03-roles-oop.md](03-roles-oop.md).

## 4. Công nghệ

| Mảng | Chọn | Lý do |
|---|---|---|
| Ngôn ngữ | TypeScript (strict) | type an toàn, bắt lỗi compile-time |
| Web | Express + socket.io | game realtime |
| Module | ESM + moduleResolution Bundler | không cần đuôi `.js` khi import |
| DB | better-sqlite3 | có @types, đồng bộ, ổn định, 1 file |
| Validate | Zod | env + payload |
| Auth | ed25519 (tweetnacl) + JWT | đăng nhập ví không mật khẩu |
| Voice/AI | Agora RTC + ConvoAI | xem [04-ai-pipeline.md](04-ai-pipeline.md) |
| Blockchain | Solana web3 + Metaplex Core | xem [05-solana.md](05-solana.md) |

## 5. Chạy

```bash
cd backend
npm install
npm run db:migrate     # tạo bảng
npm run db:seed        # (tùy chọn) user demo
npm run dev            # chạy dev (tsx watch) — http://localhost:3636
```

Mọi tính năng AI/Agora mặc định TẮT (flag trong `.env`) → game core chạy ngay không cần key.
