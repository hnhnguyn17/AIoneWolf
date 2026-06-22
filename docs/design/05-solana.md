# 05 — Solana (Auth + NFT)

> Mảng chắc ăn nhất. Đăng nhập ví đã chạy; NFT mint khả thi 100% trên devnet.

## 1. Đăng nhập ví (không mật khẩu) — ĐÃ CHẠY

```
FE: bấm kết nối ví Phantom
 → GET /auth/nonce?wallet=    → server cấp nonce (crypto.randomBytes, TTL 5')
 → Phantom ký message
 → POST /auth/verify          → server verify ed25519 → cấp JWT (access 1h + refresh)
 → lần sau gửi kèm Bearer JWT, không ký lại
```

Bảo mật đã siết:
- nonce dùng `crypto.randomBytes` (KHÔNG Math.random).
- jti refresh token = `crypto.randomUUID`.
- nonce dùng 1 lần, hết hạn 5 phút.

File: `services/solana/walletAuth.ts`.

## 2. NFT thành tích — khả thi, hiện chưa cắm thật

| Hạng mục | Quyết định |
|---|---|
| Chuẩn NFT | Metaplex Core (1 account/NFT, ~0.003 SOL, soulbound native) |
| Phí gas | server trả (gasless) — người chơi chỉ cần địa chỉ để nhận |
| ELO/điểm | off-chain (DB) — không lên chain |
| Mạng | devnet (SOL free) cho demo |

Mốc đúc: streak thắng 20 → "Alpha Wolf" tier 1; 50 → tier 2; 100 → tier 3.
Hạng theo ELO (SRS 5.3.1): Tân Binh / Thợ Săn / Ma Sói / Chúa Tể — `domain/elo.ts:rankOf()`.

## 3. ⚠️ Bảo mật bắt buộc trước khi mint thật

Server trả phí → endpoint mint bị spam = **rút cạn SOL ví server**. 3 chốt:
1. `/mint-badge` phải **requireAuth** + chỉ mint cho `req.wallet` (không nhận wallet từ body).
2. Server **tự xác minh mốc từ DB** (không tin client gửi "tôi đạt mốc").
3. Rate-limit + cảnh báo khi SOL ví server cạn.

→ Devnet vô hại; đây là điều kiện ra mainnet. Hiện chưa viết endpoint mint (chờ pha sau).

## 4. Công thức ELO (SRS 5.3.2) — `domain/elo.ts`

```
ΔELO = (chuẩn × hệ số vai) + khuyến khích
  chuẩn:  thắng +15 / thua −10
  hệ số:  Dân thường 1.0 / Dân có năng lực 1.3 / Sói 1.5
  khuyến khích: sống tới cuối & thắng +5 ; sống nhưng thua −2
```
