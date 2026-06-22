# 🐺 Echoes of the Lycan

Game **Ma Sói online** tích hợp **AI Quản trò** (Agora ConvoAI + LLM), **voice realtime**
(Agora RTC) và **đăng nhập ví / NFT thành tích** (Solana). Frontend React, backend
Express + TypeScript.

> 📄 Tài liệu yêu cầu gốc (SRS): `docs/SRS - Echoes of the Lycan.pdf`
> (bản README-SRS cũ kèm sơ đồ: `docs/SRS-readme-cu.md`)
> 📐 Tài liệu thiết kế kỹ thuật: [`docs/design/`](docs/design/)

## Cấu trúc dự án

```
agora_solana/
├── backend/      Express + TypeScript — game core + AI + Agora + Solana  (cổng 3636)
├── frontend/     React + Vite — UI người chơi                             (cổng 3000)
├── docs/
│   ├── SRS - Echoes of the Lycan.pdf   tài liệu yêu cầu gốc
│   └── design/                          tài liệu thiết kế kỹ thuật
└── README.md
```

## Chạy nhanh

**Backend** (game core chạy ngay, AI/Agora tắt mặc định):
```bash
cd backend
npm install
npm run db:migrate     # tạo bảng SQLite
npm run db:seed        # (tùy chọn) user demo cho leaderboard
npm run dev            # http://localhost:3636
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev            # http://localhost:3000
```

## Tính năng & trạng thái

| Mảng | Trạng thái | Ghi chú |
|---|---|---|
| Vòng game (ngày/đêm/vote/win) | ✅ chạy + test | state machine, 1 cửa mutation |
| 5 vai lõi | ✅ | Sói, Tiên tri, Bảo vệ, Phù thủy, Dân |
| Bot | ✅ | hành động đêm theo vai |
| Đăng nhập ví Solana | ✅ | ed25519 + JWT |
| Lịch sử / ELO | ✅ | off-chain SQLite |
| AI Quản trò (LLM) | 🟡 khung + flag tắt | bật qua `LLM_ENABLED=1` |
| Agora voice + ConvoAI | 🟡 khung + flag tắt | bật qua `AGORA_AGENT_ENABLED=1` |
| NFT mint | ⏳ pha sau | auth đã có; endpoint mint chưa cắm |

## Tài liệu thiết kế

| Tài liệu | Nội dung |
|---|---|
| [01 — Kiến trúc tổng thể](docs/design/01-kien-truc-tong-the.md) | phân lớp, công nghệ, GRASP |
| [02 — State machine](docs/design/02-state-machine.md) | vòng đời ván, chống bug |
| [03 — Player & Role (OOP)](docs/design/03-roles-oop.md) | composition, RoleRegistry |
| [04 — AI Pipeline](docs/design/04-ai-pipeline.md) | GM, bot, Agora, chi phí |
| [05 — Solana](docs/design/05-solana.md) | auth, NFT, ELO |
| [06 — Hợp đồng FE↔BE](docs/design/06-hop-dong-fe-be.md) | REST + socket events |

## Công nghệ

**Backend**: TypeScript · Express · socket.io · better-sqlite3 · Zod · tweetnacl/JWT · agora-token
**Frontend**: React · Vite · socket.io-client · agora-rtc-sdk-ng · @solana/wallet-adapter
