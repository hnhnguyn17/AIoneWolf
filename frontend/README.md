# VOIR_ABYSS — Frontend (AIoneWolf / Ma Sói on Solana)

React + Vite + TailwindCSS. Theme cyber-gothic **VOIR_ABYSS** (neon cyan trên nền
obsidian đen). Đăng nhập bằng ví **Phantom** (extension web, Wallet Standard,
cluster **devnet**) qua challenge–response ký message → JWT.

## Cài & chạy

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 (Vite mở sẵn trình duyệt)
npm run build    # build production → dist/
npm run preview  # xem thử bản build
```

## Chế độ MOCK (không cần backend)

Đặt biến môi trường `VITE_MOCK=1` để chạy **không cần server**. Khi đó
`src/lib/socket.js` dùng `src/lib/mockServer.js` — một "server giả" tự **diễn 1
ván demo**: chia role → đổi pha NGÀY/ĐÊM → vài câu **GM_SPEAK** → người chết →
vote → game over. Nhờ vậy `npm run dev` thấy game "diễn" ngay.

PowerShell:

```powershell
$env:VITE_MOCK = "1"; npm run dev
```

Bash / .env:

```bash
# frontend/.env.local
VITE_MOCK=1
```

Cách xem nhanh: **Login → Explore as Guest → Lobby → Initiate Descent**. Timeline
mock tự chạy; mở console để thấy log `[mock C2S]`, `[socket] MOCK mode`,
`[agora:stub]`.

### Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|------|----------|---------|
| `VITE_MOCK` | (off) | `1`/`true` → bật mock server, không cần backend |
| `VITE_BACKEND_URL` | `http://localhost:4000` | REST + Socket.io backend |
| `VITE_SOLANA_RPC` | devnet public | RPC endpoint cho ví |

## Map màn hình ↔ mockup (temp.txt)

| Màn (file) | Mô tả | Mockup (dòng) |
|-----------|-------|---------------|
| `screens/LoginScreen.jsx` | Enter the Abyss — connect/sign Phantom | ~2278 |
| `screens/LobbyScreen.jsx` | Tạo/Join phòng bằng mã + danh sách người chơi | (mới, theo theme) |
| `screens/GameBoardDay.jsx` | Digital Cathedral ban ngày: vòng tròn avatar + Chronicle + Vote | ~1307 / ~1667 / ~3022 |
| `screens/NightScreen.jsx` | Night Phase: tối, chat khoá, phe Sói | ~361 / ~1790 |
| `screens/ProfileVault.jsx` | Operative Profile: The Vault (NFT) + Solana Ledger + ELO | ~770 / ~971 / ~1230 |

### Components (`src/components/`)

- `AvatarCircle` — bố trí avatar quanh vòng tròn (tự tính góc đồng hồ).
- `PlayerAvatar` — 1 avatar: sống/chết, đang nói, được chọn vote.
- `ChronicleLog` — panel chat/log (system/alert/gm/chat) + ô nhập (khoá khi đêm).
- `VoteBar` — thanh hành động Vote + đếm mục tiêu + timer.
- `PhaseIndicator` — nhãn pha hiện tại theo `PHASE`.
- `MicIndicator` — trạng thái mic/spatial audio (tâm bàn).
- `GMSpeechBubble` — bong bóng lời Game Master (AI quản trò) giữa bàn.
- `WalletButton` — re-export nút ví đã style theo theme.

## Mock / Stub — đang giả lập gì

- **`lib/socket.js`** — wrapper socket.io-client, dùng đúng event `C2S`/`S2C`
  trong `lib/contracts.js`. Tự chọn THẬT hay MOCK theo `VITE_MOCK`.
- **`lib/mockServer.js`** — server giả: phát event S2C theo timeline, phản hồi
  C2S cơ bản (create/join/start/chat/vote). **Thay bằng backend thật** khi sẵn
  sàng — chỉ cần tắt `VITE_MOCK`.
- **`lib/agora.js`** — STUB voice/spatial audio (`joinChannel`/`leave`/`muteAll`/
  `setMic`/`setRemoteVolume`). Hiện chỉ `console.log` + `TODO`. Ráp SDK voice
  (Agora.io/LiveKit/WebRTC) sau theo các `TODO` trong file.
- **`screens/ProfileVault.jsx`** — dữ liệu NFT/Ledger/ELO là **mẫu** (placeholder),
  sau nối on-chain/backend.

## Kiến trúc state

`lib/useGameSession.js` gom toàn bộ state 1 ván từ socket (players, phase, cycle,
chronicle, gmSpeech, role, vote) và expose `sendChat`/`castVote`/`startGame`.
`App.jsx` route theo `phase`: ĐÊM → `NightScreen`, còn lại → `GameBoardDay`
(state giữ nguyên khi đổi pha nên log/lịch sử không mất).

## Cây thư mục (src)

```
src/
├── App.jsx                # router theo state: login → lobby → game/profile
├── main.jsx               # Providers: Wallet → Auth → App (+ Buffer polyfill)
├── index.css              # global styles VOIR_ABYSS
├── components/
│   ├── AvatarCircle.jsx
│   ├── PlayerAvatar.jsx
│   ├── ChronicleLog.jsx
│   ├── VoteBar.jsx
│   ├── PhaseIndicator.jsx
│   ├── MicIndicator.jsx
│   ├── GMSpeechBubble.jsx
│   └── WalletButton.jsx
├── lib/
│   ├── api.js             # REST client (auth nonce/verify)
│   ├── auth.jsx           # AuthProvider (challenge–response → JWT)
│   ├── base58.js          # encode chữ ký ed25519 → base58
│   ├── contracts.js       # ROLE/PHASE/C2S/S2C (khớp backend)
│   ├── wallet.jsx         # Solana wallet providers (devnet)
│   ├── socket.js          # wrapper socket.io (+ chế độ MOCK)
│   ├── mockServer.js      # server giả: diễn 1 ván demo
│   ├── agora.js           # STUB voice/spatial audio
│   └── useGameSession.js  # hook gom state 1 ván
└── screens/
    ├── LoginScreen.jsx
    ├── LobbyScreen.jsx
    ├── GameBoardDay.jsx
    ├── NightScreen.jsx
    └── ProfileVault.jsx
```
