# 03 — Player & RoleRegistry (OOP + functional)

> Quyết định thiết kế: **composition over inheritance**. Player CHỨA role, không kế thừa.

## 1. Vì sao KHÔNG kế thừa (Werewolf extends Player)

| Vấn đề | Inheritance gãy | Composition |
|---|---|---|
| Vai đổi giữa ván (AFK→bot, hóa Sói) | phải hủy object, tạo lại → mất id/state | gán `player.role = X` |
| 50+ vai catalog | thành 50 subclass rỗng | 50 entry data |
| Resolve đêm cross-cutting | không nhét gọn vào `Werewolf.resolve()` | resolveNight tập trung |

→ Người chơi **CÓ một vai**, không **PHẢI là** một vai.

## 2. class Player (OOP — có identity + vòng đời)

```ts
class Player {
  id          // "wallet_..." (người) hoặc "bot_3" (bot) — GIỐNG NHAU về data
  seat, name, wallet
  role        // ← CHỈ 1 field, đổi được (composition)
  team
  status      // ALIVE / DEAD
  roleState   // state cá nhân: Phù thủy → { potionHeal, potionPoison }
  isBot()     // = id.startsWith('bot_')  — không cần subclass
  toPublic()  // serialize sạch, KHÔNG lộ vai người khác
}
```

Bot và người **giống hệt nhau về data**. Khác biệt = "nguồn quyết định hành động"
(người = socket; bot = botService), KHÔNG nằm ở Player.

## 3. RoleRegistry (functional — "1 nơi chung")

Mỗi vai = 1 module bảo trợ: tên, điểm, state init, hành vi đêm.

```ts
// domain/roles/witch.ts
export const Witch: RoleModule = {
  role: 'WITCH', team: 'VILLAGE', label: 'Phù thủy', points: 4,
  initState: () => ({ potionHeal: true, potionPoison: true }),  // state cá nhân
  night: { action: 'SAVE', validate(...), apply(...) },          // input + buffer
};
```

| RoleModule lo | RoleModule KHÔNG lo |
|---|---|
| metadata (tên, phe, điểm) | resolve đêm (→ GameRoom tập trung) |
| initState (state cá nhân) | UI (→ FE tự quản component) |
| night: validate + ghi buffer | tính ai chết (cross-cutting) |

**Thêm 1 vai** = thêm 1 file `roles/<role>.ts` + 1 entry registry + 1 component FE.

## 4. 5 vai lõi hiện có

| Vai | Điểm | Đêm | State riêng |
|---|---|---|---|
| Sói (WEREWOLF) | −6 | KILL (vote đa số) | — |
| Tiên tri (SEER) | +7 | CHECK (soi phe) | — |
| Bảo vệ (GUARD) | +3 | PROTECT (không 2 đêm liền) | lastGuardedSeat |
| Phù thủy (WITCH) | +4 | SAVE / POISON | 2 bình (1 lần/ván) |
| Dân thường (VILLAGER) | +1 | — (bị động) | — |

Catalog SRS có 50+ vai; 5 vai trên có logic backend. Còn lại mở rộng dần qua registry.

## 5. Bot = Player + service ngoài (không kế thừa)

```
class Player { isBot() }          ← chỉ 1 cờ
botService (service ngoài)        ← "bộ não" — nhận gameService + llm tiêm vào
   onPhase(room) → doNight()      ← đọc state, hành động hộ bot đúng lượt
```

→ Player KHÔNG biết LLM. botService đọc Player rồi hành động hộ. Low coupling.
