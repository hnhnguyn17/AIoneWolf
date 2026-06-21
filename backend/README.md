# AIoneWolf — Backend

Server real-time cho game Ma Sói: Express 5 + Socket.io + state machine Ma Sói + auth ví Solana. Là **Source of Truth** của game state (chống hack client).

## Chạy

```bash
cd backend
npm install
cp .env.example .env      # chỉnh secret
npm start                 # http://localhost:4000
```

Kiểm chứng state machine (không cần cài deps):
```bash
npm run sim               # chạy trọn 1 ván giả lập, in ra console
```

## Cấu trúc

```
backend/
├── index.js                 # điểm vào: Express + Socket.io, gắn routes
├── contracts.js             # adapter nạp ../contracts (single source of truth)
├── game/                    # ⭐ STATE MACHINE Ma Sói
│   ├── GameRoom.js          #   class 1 phòng (state + luật)
│   ├── index.js             #   RoomManager (Map các phòng)
│   ├── roles.js             #   chia bài Fisher-Yates theo preset
│   ├── phases.js            #   giải quyết đêm (chắn→cắn→soi→cứu/độc)
│   ├── voting.js            #   đếm phiếu treo cổ (xử lý hòa)
│   └── winCheck.js          #   điều kiện thắng Dân/Sói
├── socket/handlers.js       # các event FE <-> BE (xem contracts/events.js)
├── auth/walletAuth.js       # đăng nhập ví: nonce + verify ed25519 + JWT
├── routes/
│   ├── gm.js                # REST cho AI Quản trò gọi vào
│   └── agora.js             # cấp Agora token (STUB)
├── services/solana/mintBadge.js  # verify chữ ký + mint NFT (STUB)
└── mock/sim-game.js         # giả lập 1 ván để nghiệm thu
```

## REST API

| Method | Path | Mô tả |
|---|---|---|
| GET | `/auth/nonce?wallet=` | xin message để ký |
| POST | `/auth/verify` | verify chữ ký ví → JWT |
| POST | `/gm/action` | AI ghi nhận hành động đêm (Bearer GM_SECRET) |
| POST | `/gm/advance-phase` | AI chuyển pha (đêm→sáng→vote→check) |
| GET | `/gm/state?roomCode=` | AI lấy snapshot |
| POST | `/gm/speak` | AI nói (phát `gm:speak` ra FE) |
| GET | `/agora/token` | **STUB** cấp token voice |
| POST | `/solana/mint-badge` | **STUB** mint NFT winner |

## Socket.io events
Client→Server và Server→Client lấy từ `contracts/events.js` (C2S / S2C). Role được gửi RIÊNG cho từng người qua `role:assigned`.

## Phần còn STUB (nối sau)
- **Agora token** (`routes/agora.js`): cần App ID + App Certificate để sinh token thật.
- **Solana mint** (`services/solana/mintBadge.js`): nối Metaplex Umi devnet. `verifySignature` thì đã thật.
