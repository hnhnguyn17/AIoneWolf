# 06 — Hợp đồng Frontend ↔ Backend

> Backend khớp 100% với `frontend/src/lib/{api,socket,contracts}.js` — FE không phải sửa.

## 1. REST endpoints

| Method | Path | Request | Response | FE gọi ở |
|---|---|---|---|---|
| GET | `/health` | — | `{ ok, name, version }` | (kiểm tra) |
| GET | `/auth/nonce` | `?wallet=` | `{ nonce, message }` | api.js `getNonce` |
| POST | `/auth/verify` | `{ wallet, signature, message }` | `{ token, refreshToken, wallet }` | api.js `verifySignature` |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ accessToken }` | (auth refresh) |
| POST | `/auth/logout` | `{ refreshToken }` | `{ ok }` | (logout) |
| GET | `/auth/me` | Bearer JWT | `{ wallet, user }` | api.js `getMe` |
| GET | `/rooms/history` | `?wallet=` | `{ attendance, matches }` | api.js `getHistory` |
| GET | `/agora/token` | `?channel=&uid=` | `{ appId, channel, uid, token, stub }` | lib/agora.js |

## 2. Socket — Client → Server (C2S)

| Sự kiện | Payload | Tác dụng |
|---|---|---|
| `room:create` | `{ name? }` | tạo phòng (host) |
| `room:join` | `{ roomCode, name? }` | vào phòng |
| `room:leave` | — | rời phòng |
| `game:start` | `{ roleConfig?, withBots? }` | bắt đầu ván |
| `night:action` | `{ action, targetSeat }` | hành động đêm |
| `vote:cast` | `{ targetSeat\|null }` | bỏ phiếu |
| `chat:send` | `{ text }` | chat |

## 3. Socket — Server → Client (S2C)

| Sự kiện | Payload | Khi nào |
|---|---|---|
| `room:created` | `{ roomCode }` | sau tạo phòng |
| `room:state` | `RoomState` | mỗi khi phòng đổi |
| `room:needBots` | `{ have, need, missing, message }` | start mà thiếu người |
| `role:assigned` | `{ role, seat }` | chia vai (riêng từng người) |
| `host:roleMap` | `{ map[] }` | bảng vai cho host |
| `phase:changed` | `{ phase, cycle, deadline }` | đổi pha (deadline để FE đếm ngược) |
| `night:prompt` | `{ role, action, options }` | tới lượt vai ban đêm |
| `seer:result` | `{ targetSeat, team }` | Tiên tri soi (riêng) |
| `player:died` | `{ seat, cause }` | người chết |
| `vote:update` | `{ tally, voter }` | cập nhật phiếu |
| `chat:msg` | `{ from, seat, text, ts }` | tin chat |
| `gm:speak` | `{ text }` | GM nói (FE đọc Web Speech) |
| `game:over` | `{ winner }` | hết ván |
| `error_msg` | `{ error }` | lỗi |

## 4. Enum (khớp `contracts/index.ts` ↔ FE `contracts.js`)

- `ROLE`: WEREWOLF, VILLAGER, SEER, GUARD, WITCH
- `TEAM`: WEREWOLF, VILLAGE
- `PHASE`: LOBBY, ASSIGN_ROLES, NIGHT, DAY_ANNOUNCE, DAY_DISCUSS, VOTE, CHECK_WIN, GAME_OVER
- `NIGHT_ACTION`: KILL, PROTECT, CHECK, SAVE, POISON
- `PLAYER_STATUS`: ALIVE, DEAD

## 5. Channel Agora (quy ước)

- `room-<code>-day` — kênh chung cả phòng (voice ban ngày + GM agent)
- `room-<code>-wolves` — kênh Sói (token chỉ cấp cho seat là Sói)
