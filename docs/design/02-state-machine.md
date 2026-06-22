# 02 — State Machine & Vòng đời ván

> GameRoom TỰ ÔM state và TỰ CHẠY hàm theo state. Mỗi hàm GÁC CỬA theo state
> = **1 cửa mutation duy nhất** (chữa gốc "game như script").

## 1. Vòng đời phòng (`ROOM_STATUS`)

```
WAITING ──startGame()──► IN_GAME ──checkWin().over──► ENDED
  │                         │                          │
người vào/ra          chơi ngày/đêm              tổng kết ELO
addPlayer()           (phase bên dưới)           ghi matches/attendance
```

## 2. Pha trong ván (`phase`, chỉ khi IN_GAME)

Theo sơ đồ trạng thái SRS (ASSIGN → **NIGHT trước**):

```
       startGame (chia vai)
            │
            ▼
        ┌─ NIGHT ◄───────────────┐   các vai hành động (qua NightConductor đơn giản)
        │   │ resolveNight()      │
        │   ▼                     │
        │ DAY_ANNOUNCE            │   GM công bố người chết
        │   │ beginDiscuss()      │
        │   ▼                     │
        │ DAY_DISCUSS             │   thảo luận (voice/chat)
        │   │ beginVote()         │
        │   ▼                     │
        │ VOTE                    │   bỏ phiếu treo cổ (NÚT, không phải giọng)
        │   │ resolveVote()       │
        │   ▼                     │
        └─ checkWin ──chưa xong───┘   beginNight() → cycle++
            │ xong
            ▼
        GAME_OVER
```

## 3. 1 cửa mutation — mỗi hàm gác cửa

Mọi thay đổi state đi qua method của GameRoom, **kiểm tra state trước khi chạy**:

```ts
applyNightAction(actorId, action, targetSeat, roundId) {
  if (this.status !== IN_GAME || this.phase !== NIGHT)   // ← gác cửa state
    return { ok: false, error: 'Không phải ban đêm.' };
  if (roundId !== this.roundId)                           // ← gác cửa race
    return { ok: false, error: 'stale-round' };
  ...
}
```

## 4. Ba cơ chế chống bug (đã verify bằng test)

| Cơ chế | Vấn đề chặn | Cách làm |
|---|---|---|
| **roundId guard** | race: timer/người/bot fire ở round cũ | `roundId = "${cycle}:${phase}"`; mọi mutation mang theo, lệch → no-op |
| **multi-wolf vote** | 3 Sói ghi đè 1-slot → chỉ con cuối tính | mỗi Sói 1 phiếu vào `wolfBuffer`; `resolveNight` đếm đa số |
| **killSeat idempotent** | đệ quy (lover-chain) + double-resolve | `if (đã DEAD) return;` — giết lại = no-op |

## 5. resolveNight TẬP TRUNG (không phân tán theo vai)

Vì Sói × Bảo vệ × Phù thủy **cùng tác động 1 nạn nhân** (cross-cutting), kết quả đêm
KHÔNG để mỗi vai tự quyết. RoleModule chỉ ghi **ý định** vào `nightBuffer`; GameRoom đọc
toàn bộ buffer rồi tính:

```
chốt nạn nhân Sói (đếm đa số phiếu)
  → bị Bảo vệ chắn HOẶC Phù thủy cứu? → sống
  → cộng nạn nhân Phù thủy độc (xuyên giáp)
  → killSeat() cho từng người (idempotent)
```

## 6. Persist theo mốc

| Mốc | Ghi DB |
|---|---|
| Tạo phòng | `rooms` (WAITING) |
| Người vào | `attendance` (active=1) |
| Chia vai | `attendance.role` |
| Hết ván | `users` (ELO) + `matches` + `attendance` (leftAt) + `rooms` (ENDED) |
| Vào rồi ra sớm | `attendance` tạo rồi đánh dấu leftAt |

> Persist do **tầng service** gọi repository — GameRoom KHÔNG đụng DB (low coupling).
