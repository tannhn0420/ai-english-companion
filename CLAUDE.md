# AI English Companion - PWA học tiếng Anh

## Project Overview
Web app (PWA) học tiếng Anh EN ↔ VI mọi lúc trên điện thoại + máy tính. Companion app của Chrome Extension `ai-translator-ext` (repo cùng cấp: `../ai-translator-ext`): extension thu thập từ vựng khi đọc web, app này để ôn luyện (SRS flashcards, quiz, nghe, dictation, nói) — offline-first, gamified.

**Trạng thái: Phase 0 scaffold xong (PWA shell + TabBar + theme + icons, build/lint/test pass); còn deploy Cloudflare Pages. Tiếp theo: Phase 1 trong docs/PHASES.md.**

## Docs (đọc trước khi làm)
- `docs/REQUIREMENTS.md` — mục tiêu, user stories, phạm vi MVP, non-goals, ràng buộc (R1–R7)
- `docs/ARCHITECTURE.md` — stack, cấu trúc thư mục, data model, dependency rule, danh sách code port từ extension
- `docs/PHASES.md` — roadmap phase 0→8 + backlog, tasks + acceptance criteria; đánh dấu ✅ khi xong
- `docs/DESIGN.md` — design tokens, điều hướng, spec từng màn hình
- `docs/DATA.md` — nguồn dữ liệu mở (Tatoeba, NGSL, Wiktionary, VOA…), license + attribution, pipeline `scripts/data/`
- `docs/IDEAS.md` — ngân hàng ý tưởng có chấm điểm; ý tưởng mới thêm vào đây (icebox) trước, KHÔNG thêm thẳng vào PHASES
- `docs/DECISIONS.md` — ADR log; muốn làm khác một quyết định `accepted` phải cập nhật mục đó trước, kèm lý do

## Tech Stack
- React 18 + TypeScript strict + Vite + vite-plugin-pwa (Workbox, autoUpdate)
- react-router-dom; state = Context + useReducer (không Redux/Zustand)
- Vanilla CSS + design tokens trong `src/styles/tokens.css` (không Tailwind)
- IndexedDB qua `idb` (stores: cards/packs/dictationSessions/dict/meta); settings = localStorage
- SRS: **FSRS qua `ts-fsrs`** (không phải SM-2); thẻ SM-2 import từ extension được map sang state FSRS
- Nội dung học 0-token từ bundle nguồn mở `public/data/` (NGSL, Tatoeba EN-VI, IPA) sinh bởi `scripts/data/` — xem docs/DATA.md
- AI: Gemini / Groq / OpenRouter / OpenAI-compat, gọi fetch trực tiếp từ browser, key user tự cung cấp; generate-once-use-many + model tier `cheap`/`good`; KHÔNG dùng AI cho tra từ/IPA/audio
- TTS: Web Speech API; STT: SpeechRecognition (iOS không có → fallback, xem R1)
- Test: Vitest cho `src/core/` (bắt buộc — logic SRS/import là dữ liệu người dùng)

## Quy tắc kiến trúc (quan trọng)
```
screens → hooks/components → services → core
```
- `src/core/` = logic thuần, KHÔNG import React/DOM/chrome/services. Unit test đầy đủ.
- `src/services/` = IO/browser APIs, KHÔNG import React.
- Schema `VocabCard` phải giữ tương thích import/export 100% với extension (xem ARCHITECTURE §3.1). Field mới chỉ được thêm dạng optional.
- Key trong store `meta` giữ nguyên tên/shape như extension (`practiceStats`, `dailyChallenge`, `practiceDays`…) để phase sync map 1-1.
- Không thêm dependency mới ngoài ARCHITECTURE §1 mà không ghi lý do vào PHASES.md.
- Không thêm nguồn dữ liệu ngoài danh mục DATA.md §2 khi chưa kiểm tra license; dữ liệu dùng trong UI phải kèm attribution theo DATA.md §6.

## Port code từ extension
Khi cần logic đã có (SRS, quiz/cloze, dictation diff, gamification, AI clients, pickVoice, prompt templates): **đọc và port từ `../ai-translator-ext/src/`**, đừng viết lại từ đầu. Bảng mapping đầy đủ ở ARCHITECTURE §6.

## Key Commands
```bash
npm run dev       # dev server (test mobile: dùng --host để mở LAN)
npm run build     # production build (dist/)
npm run preview   # test PWA/SW sau build (SW không chạy đúng trong dev)
npm run test      # Vitest (core/)
npm run lint      # ESLint + tsc --noEmit
```

## Code Conventions
- Giống extension: components PascalCase, hooks `use*` camelCase, services camelCase
- TypeScript strict; không `any` trần
- UI text tiếng Việt, nội dung học tiếng Anh; error message thân thiện tiếng Việt
- Mobile-first: touch target ≥ 44px, thao tác chính một tay, xem DESIGN.md §1
- Theme dark mặc định qua `[data-theme]`, đọc localStorage TRƯỚC khi render để không flash
