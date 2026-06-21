# AIoneWolf — AI Quản trò (Game Master)

Service "AI Quản trò" cho game Ma Sói online. Dùng **Agora Conversational AI**: nghe người chơi nói qua mic ("Sói cắn người số 3") → bóc lệnh bằng function-calling → gọi REST backend cập nhật state → nói lại kết quả (TTS).

Vai trò AI = **QUẢN TRÒ** điều phối ván game (không phải người chơi).

---

## Kiến trúc

```
   ┌─────────────┐   mic audio    ┌──────────────────────┐   ASR    ┌────────────────────────┐
   │  Người chơi │ ─────────────► │  Agora ConvoAI       │ ───────► │  tool-server.js         │
   │  (browser)  │ ◄───────────── │  Engine (RTC + TTS)  │ ◄─────── │  POST /chat/completions │
   └─────────────┘   TTS audio    └──────────┬───────────┘  câu nói  └───────────┬────────────┘
                                             │ LLM_URL tro vao tool-server         │ boc lenh + thuc thi tool
                                             │ (server-custom-llm)                  │ (server-side tool exec)
                                             │                                      ▼
                                             │                          ┌────────────────────────┐
                          POST /join,/speak, │                          │  gmClient.js (axios)    │
                          /leave (STUB)       │                          │  Bearer GM_SECRET       │
                                             ▼                          └───────────┬────────────┘
                                  ┌──────────────────────┐                          │ REST /gm/*
                                  │  agora/convoai.js     │                          ▼
                                  │  (STUB lifecycle)     │              ┌────────────────────────┐
                                  └──────────────────────┘              │  Backend game (:4000)   │
                                                                        │  /gm/action /advance    │
                                                                        │  /gm/state              │
                                                                        └────────────────────────┘
```

Luồng một câu nói:
1. Người chơi nói mic → Agora ConvoAI **ASR** chuyển thành text.
2. ConvoAI gọi `LLM_URL` = `tool-server.js` `POST /chat/completions` (chuẩn OpenAI).
3. tool-server **bóc lệnh** (hiện tại: intent-parser regex tiếng Việt; sau: LLM thật) → ra `tool_call`.
4. tool-server **thực thi tool ngay tại server** (`tools.executeTool`) → gọi backend REST `/gm/*` qua `gmClient`.
5. tool-server trả câu Quản trò nói (content) → ConvoAI **TTS** đọc cho cả phòng.

---

## Cây thư mục

```
ai/
├── package.json          # name "aionewolf-ai", scripts start/dev/mock
├── .env.example          # PORT, BACKEND_URL, GM_SECRET, AGORA_*, LLM_PROVIDER
├── .gitignore
├── README.md             # file này
├── tool-server.js        # [CHẠY ĐƯỢC] Express :5000, /chat/completions (OpenAI-compatible)
├── intentParser.js       # [CHẠY ĐƯỢC] bóc lệnh tiếng Việt bằng regex (STUB thay LLM)
├── tools.js              # [CHẠY ĐƯỢC] schema function-calling + handler gọi backend
├── gmClient.js           # [CHẠY ĐƯỢC] axios wrapper /gm/*, Bearer GM_SECRET, xử lý 409
├── orchestrator.js       # [CHẠY ĐƯỢC] đạo diễn 1 đêm theo NIGHT_ORDER
├── contracts.js          # [ADAPTER] nạp contracts/gametypes.js mà không sửa file gốc
├── prompts/
│   └── gm.md             # SYSTEM PROMPT Quản trò Ma Sói (tiếng Việt, rùng rợn)
├── agora/
│   └── convoai.js        # [STUB] startAgent/speakInChannel/stopAgent + TODO docs
└── mock/
    ├── fake-backend.js   # [MOCK] backend giả lập /gm/* để chạy độc lập
    └── sim-night.js      # [MOCK] đẩy câu nói tiếng Việt → tool_call + REST (chứng minh luồng)
```

---

## Cách chạy

### 0. Cài deps (chỉ làm 1 lần)

```bash
cd ai
npm install        # express, axios, dotenv
cp .env.example .env
```

### 1. Demo bóc lệnh — KHÔNG cần deps, KHÔNG cần backend

```bash
node mock/sim-night.js
```

In ra: mỗi câu nói tiếng Việt → `tool_call` → REST body dự kiến. Chứng minh intent-parser hoạt động. (Intent-parser thuần JS, chạy ngay.)

### 2. Demo luồng đầy đủ với backend giả lập (cần `npm install`)

```bash
# Terminal 1: backend giả lập
node mock/fake-backend.js          # :4000

# Terminal 2: sim gọi backend thật
node mock/sim-night.js --live      # thấy backend trả kết quả + 409 cho ghế đã chết
```

### 3. Chạy tool-server (cái Agora ConvoAI sẽ trỏ LLM_URL vào)

```bash
# Terminal 1: backend (thật hoặc giả lập)
node mock/fake-backend.js          # :4000

# Terminal 2: tool-server
npm start                          # :5000  POST /chat/completions

# Test bằng HTTP:
curl -X POST http://localhost:5000/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"roomCode":"DEMO","messages":[{"role":"user","content":"Sói cắn người số 3"}]}'
# -> { ... choices[0].message.content: "Phe Soi da chon ghe so 3..." }
```

---

## Kết quả sim-night (mẫu)

```
(2) Người chơi nói: "Sói cắn người số 3"
    → tool_call: werewolf_kill({"roomCode":"DEMO","targetSeat":3})
    → REST: POST /gm/action {"roomCode":"DEMO","actorRole":"WEREWOLF","action":"KILL","targetSeat":3}
    → backend: OK | GM nói: "Phe Soi da chon ghe so 3..."

(7) Người chơi nói: "Soi số 9"           # ghế đã chết
    → backend: KHÔNG HỢP LỆ | GM nói: "Ghe so 9 khong con song hoac khong ton tai."
```

---

## Ranh giới CHẠY-ĐƯỢC vs STUB

| Thành phần                          | Trạng thái   | Ghi chú |
| ----------------------------------- | ------------ | ------- |
| Intent-parser (regex tiếng Việt)    | ✅ CHẠY ĐƯỢC | Thay cho LLM thật để demo bóc lệnh |
| tools.js (schema + handler)         | ✅ CHẠY ĐƯỢC | Map role/action theo contracts/gametypes |
| gmClient.js (REST + xử lý 409)      | ✅ CHẠY ĐƯỢC | Gọi backend thật/giả qua axios |
| orchestrator.js (kịch bản 1 đêm)    | ✅ CHẠY ĐƯỢC | Sinh câu dẫn theo NIGHT_ORDER |
| tool-server /chat/completions       | ✅ CHẠY ĐƯỢC | OpenAI-compatible proxy |
| mock/* (fake-backend, sim-night)    | ✅ CHẠY ĐƯỢC | Demo độc lập |
| **LLM thật** (gpt-4o-mini qua Agora)| 🔲 STUB     | `LLM_PROVIDER=openai` + `OPENAI_API_KEY` (chưa cắm) |
| **Agora ConvoAI Engine** (/join...) | 🔲 STUB     | `agora/convoai.js` — KHÔNG bịa payload, fetch schema thật khi nối |

> Lưu ý: schema REST của Agora (`/join`, `/leave`, `/speak`) **không bịa từ trí nhớ**. Trong `agora/convoai.js` chỉ console.log + TODO trỏ tới tài liệu skill (`references/conversational-ai/`). Khi nối thật phải fetch schema từ OpenAPI spec của Agora.

---

## Để nối Agora thật, USER cần cung cấp

1. **AGORA_APP_ID** — Project App ID (từ https://console.agora.io → Project Management). **Bắt buộc.**
2. **AGORA_APP_CERT** — App Certificate của project đó. **Bắt buộc** (để mint RTC+RTM token cho agent qua `buildTokenWithRtm`). App Certificate không bao giờ rời server.
3. Bật tính năng **Conversational AI** cho project trong Agora Console (và RTM nếu cần transcripts).
4. **LLM key — TÙY CHỌN:**
   - Nếu muốn "bộ não" hiểu ngôn ngữ tự nhiên tốt (thay intent-parser regex): cần **OPENAI_API_KEY** (gpt-4o-mini) và đặt `LLM_PROVIDER=openai`.
   - Nếu chỉ cần demo lệnh đơn giản kiểu "sói cắn số N": **KHÔNG cần LLM key** — intent-parser regex tiếng Việt đã chạy được (`LLM_PROVIDER=stub`).
5. **GM_SECRET** — shared secret khớp với backend (mặc định `dev-gm-secret`).

> Khi nối Agora: fetch schema `/join` thật từ
> `https://docs-md.agora.io/en/conversational-ai/rest-api/agent/join.md`
> rồi điền vào `agora/convoai.js` (chỗ đã đánh dấu TODO). Trỏ `LLM_URL` của ConvoAI vào `http://<host>:5000/chat/completions`.
```

---

## Hợp đồng tuân theo

- `contracts/gametypes.js` — ROLE, NIGHT_ACTION, NIGHT_ORDER, PHASE.
- `contracts/api.md` mục "AI Quản trò → backend" — `POST /gm/action`, `POST /gm/advance-phase`, `GET /gm/state`, header `Bearer GM_SECRET`.
- Skill Agora `references/conversational-ai/` — kiến trúc Custom-LLM proxy, server-custom-llm, lifecycle.
