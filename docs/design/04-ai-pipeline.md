# 04 — AI Pipeline (GM + Bot + Agora)

> Tách bạch: **STATE (sự thật) → LLM (diễn đạt) → Agora (cái miệng)**.

## 1. Nguyên tắc

```
GAME STATE  = backend code, deterministic (ai chết, vote, đêm mấy) — KHÔNG random
LLM         = biến sự kiện khô → câu nói tự nhiên (tùy chọn, có thể tắt)
Agora       = /speak đọc ra tiếng (TTS) + ASR nghe người chơi
```

GM **không quyết định gì** về ván — chỉ là CÁI LOA: nghe event Room phát rồi diễn đạt.

## 2. GM = cái loa của Room (không có state riêng)

```
Room đổi state → phát event → GmService nghe → narrate → phát ra 2 đường:
   onGameStart       │                          ├─ emit gm:speak (FE Web Speech — LUÔN có)
   onNightResolved   │                          └─ convoai.speak (Agora — nếu agent bật)
   onVoteResolved    │
   onGameOver        │   lời = LLM sinh (nếu bật) hoặc câu cứng fallback
```

## 3. Phân bổ LLM (quan trọng)

| Nhân vật | Dùng LLM | Lý do |
|---|---|---|
| **GM** | ÍT | phần lớn câu cố định; LLM chỉ "diễn cho hay" vài câu |
| **Bot** | NHIỀU | suy luận, nhập vai, phản biện — đây mới là chỗ ngốn LLM |

`LLM_ENABLED=0` → cả hai dùng câu cứng, game core chạy bình thường, không gọi mạng.

## 4. Agora — 2 chế độ

| | MANAGED | CUSTOM-LLM |
|---|---|---|
| Não LLM | của Agora (gpt-4o-mini) | của mình (`/ai/chat/completions`) |
| Cần tunnel (PUBLIC_URL)? | ❌ | ✅ |
| GM bám luật ván? | hạn chế (đẩy bằng /speak) | có (nhồi game state) |
| Khi nào dùng | demo nhanh | GM tự nắm diễn biến |

ConvoAI agent = 1 audio task, đếm vào trần **20 PCU/App ID** → giữ **1 GM/ván**.

## 5. Bot không là agent Agora (né chi phí)

```
Người chơi  → voice thật (Agora RTC)
GM          → 1 ConvoAI agent (audio) — nếu bật
Bot         → LLM text → chat:msg → FE Web Speech đa giọng (0 PCU)
```

→ Bot KHÔNG mỗi con 1 agent audio (12 bot = 12 PCU = đắt + chạm trần). Web Speech FE miễn phí.

## 6. Cờ điều khiển (`.env`)

| Cờ | Mặc định | Tác dụng |
|---|---|---|
| `LLM_ENABLED` | 0 | GM/bot dùng LLM hay câu cứng |
| `LLM_PROVIDER` | ollama | ollama (local, free) / groq / openai |
| `AGORA_AGENT_ENABLED` | 0 | bật ConvoAI agent audio thật (đốt phút) |
| `PUBLIC_URL` | trống | có = custom-LLM, trống = managed |

## 7. Bài học (đã ghi memory)

- **Đốt 49 phút Agora mà câm**: agent join nhưng không ai bật mic → cờ AGORA_AGENT_ENABLED chặn.
- **Giọng máy "nói đều" lộ bot**: bot nên gõ text (người nói voice), hoặc Web Speech + biến tấu pitch/tốc độ.
- **ASR là "tai" của bot**: bot phản biện cần transcript text từ ASR — không có ASR thì bot chỉ cãi với người gõ chat.
