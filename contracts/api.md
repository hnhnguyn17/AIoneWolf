# Contracts — REST API (HTTP)

Hợp đồng REST giữa các module. Mọi body là JSON. Base URL backend mặc định: `http://localhost:4000`.

---

## 1. Auth bằng ví Solana (frontend → backend)

Ví Phantom = cơ chế xác thực (đăng nhập). Luồng challenge–response chống replay.

### `GET /auth/nonce?wallet=<base58>`
→ `200 { "nonce": "<random>", "message": "AIoneWolf login\nWallet: ...\nNonce: ...\nTime: ..." }`
Client sẽ ký đúng `message` này bằng ví.

### `POST /auth/verify`
Body: `{ "wallet": "<base58>", "signature": "<base58>", "message": "<đã ký>" }`
Backend verify chữ ký ed25519 (tweetnacl) + khớp nonce còn hạn.
→ `200 { "token": "<JWT>", "wallet": "<base58>" }`  | `401 { error }`

JWT chứa `{ wallet }`, dùng cho Socket.io handshake (`auth.token`) và header `Authorization: Bearer`.

---

## 2. AI Quản trò → backend (ai → backend)

AI nghe người chơi nói, bóc lệnh, gọi các endpoint này. Header: `Authorization: Bearer <GM_SECRET>` (shared secret giữa ai và backend).

### `POST /gm/action`
Ghi nhận 1 hành động ban đêm do AI bóc tách được.
Body:
```json
{ "roomCode": "ABCD", "actorRole": "WEREWOLF", "action": "KILL", "targetSeat": 3 }
```
`action` ∈ `KILL | PROTECT | CHECK | SAVE | POISON` (xem contracts/gametypes.NIGHT_ACTION).
→ `200 { "ok": true, "result": { ... } }` — ví dụ CHECK trả `{ "targetSeat":3, "team":"WEREWOLF" }` để AI đọc lại cho Tiên tri.
→ `409 { error }` nếu sai pha / target chết / không hợp lệ.

### `POST /gm/advance-phase`
AI báo "phe X đã xong, chuyển pha".
Body: `{ "roomCode": "ABCD", "from": "NIGHT" }`
→ `200 { "phase": "DAY_ANNOUNCE", "cycle": 2, "deaths": [{ "seat":3, "cause":"WEREWOLF" }] }`

### `GET /gm/state?roomCode=ABCD`
AI lấy snapshot để biết ai còn sống, đang pha nào (chống hallucination — chỉ thao tác người còn sống).
→ `200 RoomState` (role ẩn, nhưng có danh sách seat + status + phase).

---

## 3. Agora token (frontend → backend)  — **STUB, nối thật sau cùng user**

### `GET /agora/token?channel=<name>&uid=<n>&role=<publisher|subscriber>`
Hiện trả MOCK để FE chạy được. Sau này backend dùng App ID + App Certificate sinh RTC token thật.
→ `200 { "appId": "<stub>", "channel": "...", "uid": 0, "token": "<stub-or-null>", "stub": true }`

Quy ước channel cho game:
- `room-<roomCode>-day` : kênh chung (cả phòng), ban ngày mở mic.
- `room-<roomCode>-wolves` : kênh riêng phe Sói, backend CHỈ cấp token cho người là Sói.

---

## 4. Solana NFT mint (backend service nội bộ)  — **STUB devnet**

### `POST /solana/mint-badge`  (gọi nội bộ khi GAME_OVER)
Body: `{ "wallet": "<winner base58>", "badge": "ALPHA_WOLF" }`
→ `200 { "mint": "<address>", "tx": "<sig>", "stub": true }`  (devnet; giai đoạn đầu trả stub).
