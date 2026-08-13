# ARCHITECTURE — AI English Companion

> Quyết định kỹ thuật và cấu trúc dự án. Đọc cùng [REQUIREMENTS.md](REQUIREMENTS.md), [PHASES.md](PHASES.md) và [DATA.md](DATA.md) (nguồn dữ liệu mở).

## 1. Tech Stack

| Lớp | Lựa chọn | Lý do |
|---|---|---|
| UI | **React 18 + TypeScript (strict)** | Cùng stack với extension → port code trực tiếp |
| Build | **Vite + vite-plugin-pwa** (Workbox) | Nhanh, precache app shell, auto-update SW |
| Routing | **react-router-dom** (BrowserRouter) | ~6 màn hình, cần deep-link (`/review`, `/deck`) |
| State | **React Context + useReducer** | Như extension, không thêm dependency |
| Styling | **Vanilla CSS + CSS variables** (design tokens) | Port tokens từ extension, không CSS framework |
| Local DB | **IndexedDB qua thư viện `idb`** (~1.5 kB) | Deck có thể vài nghìn thẻ + ảnh data-URL → vượt localStorage; `idb` chỉ là Promise wrapper mỏng |
| Settings | **localStorage** | Nhỏ, đọc đồng bộ khi boot (theme không bị flash) |
| SRS engine | **FSRS qua `ts-fsrs`** (MIT, TS thuần) | Thuật toán Anki hiện dùng làm mặc định — giảm ~20-30% số lần ôn so với SM-2 cho cùng mức nhớ. Quyết từ đầu để không phải migrate data SRS sau |
| Dữ liệu học | **Bundle nguồn mở** (NGSL, Tatoeba EN-VI, CMUdict-IPA) + API từ điển miễn phí | Nội dung 0-token, offline. Chi tiết nguồn, license, pipeline: [DATA.md](DATA.md) |
| AI | Gọi **trực tiếp từ browser** (fetch) | Gemini/Groq/OpenRouter hỗ trợ CORS + API key của user. Không cần proxy/backend |
| TTS | **Web Speech API** (SpeechSynthesis) | Port `utils/voice.ts` từ extension |
| STT | **SpeechRecognition** (Chrome/Android) | iOS fallback: MediaRecorder → Gemini audio (Phase 7) |
| Sync (sau) | **Supabase** (Auth + Postgres + Edge Functions) | Free tier đủ dùng, có luôn nền tảng cho Web Push |

**Không dùng:** Next.js (không cần SSR), Tailwind (giữ đồng nhất với extension), Redux/Zustand (thừa), React Native (non-goal).

## 2. Cấu trúc thư mục

```
ai-english-companion/
├── CLAUDE.md
├── README.md
├── docs/                        # REQUIREMENTS / ARCHITECTURE / PHASES / DESIGN
├── public/
│   ├── icons/                   # PWA icons (192, 512, maskable)
│   └── data/                    # bundle nguồn mở (v1/ngsl.json, sentences-core.json…) — sinh bởi scripts/data
├── scripts/
│   └── data/                    # build-time pipeline: tải + lọc dữ liệu mở → public/data/ (spec: DATA.md §3)
├── src/
│   ├── main.tsx                 # bootstrap + SW registration
│   ├── App.tsx                  # Router + layout shell + theme
│   ├── screens/                 # mỗi màn hình một thư mục (component + css)
│   │   ├── Home/                # dashboard widget: due count, streak, quick actions
│   │   ├── Review/              # flashcards SRS (swipe)
│   │   ├── Quiz/                # trắc nghiệm + cloze
│   │   ├── Deck/                # quản lý thẻ, tìm kiếm, import/export
│   │   ├── Practice/            # AI practice packs (Phase 4)
│   │   ├── Listen/              # audio mode (Phase 5)
│   │   ├── Dictation/           # (Phase 6)
│   │   ├── Speaking/            # (Phase 7)
│   │   ├── Journal/             # viết nhật ký + AI proofread (Phase 9)
│   │   ├── Mistakes/            # sổ tay lỗi + ôn lỗi (Phase 9)
│   │   ├── Missions/            # hội thoại nhiệm vụ (Phase 10)
│   │   ├── Progress/            # XP/level/badges/heatmap
│   │   └── Settings/            # API key, TTS voice, theme, backup, ghi công nguồn dữ liệu
│   ├── components/              # UI dùng chung: TabBar, Sheet, SwipeCard, ProgressRing, Toast…
│   ├── core/                    # ⭐ LOGIC THUẦN — không import React/DOM/chrome.*
│   │   ├── types.ts             # VocabCard, PracticePack… (copy nguyên từ extension)
│   │   ├── srs.ts               # FSRS (ts-fsrs): schedule(card, rating) + migration thẻ SM-2 từ extension
│   │   ├── quiz.ts              # sinh câu hỏi MCQ từ deck
│   │   ├── cloze.ts             # sinh câu cloze từ example/context
│   │   ├── gamification.ts      # XP, level curve, badge rules, streak
│   │   ├── dictation.ts         # so khớp câu, diff từng từ, đếm lỗi
│   │   ├── mistakes.ts          # chuẩn hóa lỗi mọi nguồn → thẻ ôn lỗi (D12, Phase 9)
│   │   └── importExport.ts      # parse/serialize JSON + CSV + TSV (Anki)
│   ├── services/                # side-effects: IO, network, browser APIs
│   │   ├── db.ts                # IndexedDB wrapper (idb): cards, sessions, meta
│   │   ├── settings.ts          # localStorage settings, typed
│   │   ├── ai/
│   │   │   ├── client.ts        # provider-agnostic complete(prompt, opts)
│   │   │   ├── gemini.ts        # port từ extension
│   │   │   ├── openai.ts        # port từ extension (Groq/OpenRouter/OpenAI-compat)
│   │   │   └── prompts.ts       # prompt templates: practice pack, feedback, assess
│   │   ├── tts.ts               # port voice.ts: pickVoice, speak, playlist engine
│   │   └── stt.ts               # SpeechRecognition wrapper + capability detect
│   ├── hooks/                   # useDeck, useSettings, useTTS, useStreak…
│   └── styles/
│       ├── tokens.css           # design tokens (port từ extension, xem DESIGN.md)
│       └── base.css             # reset + typography + utilities
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

**Quy tắc phụ thuộc (dependency rule):**

```
screens → hooks/components → services → core
core KHÔNG import từ bất kỳ lớp nào khác (pure TS, test được bằng unit test thuần).
services KHÔNG import React.
```

Lý do tách `core/`: đây chính là phần port từ extension và là phần sẽ dùng chung nếu sau này hai project gộp monorepo. Giữ nó thuần → copy qua lại không đau đớn.

## 3. Data Model

### 3.1 `VocabCard` — giữ nguyên schema extension (tương thích import/export 100%)

```ts
interface VocabCard {
  id: string;
  term: string;
  lang: 'en' | 'vi';
  meaning: string;
  ipa?: string;
  example?: string;
  context?: string;
  sourceUrl?: string;
  topic?: string;
  image?: string;        // data URL đã downscale
  createdAt: number;
  // SRS (SM-2 lite)
  due: number;           // timestamp ms
  interval: number;      // ngày
  ease: number;
  reps: number;
  lapses: number;
  // MỚI (chỉ web app, optional để không phá tương thích):
  updatedAt?: number;    // phục vụ sync last-write-wins ở Phase 8; default = createdAt khi import
  stability?: number;    // FSRS state — khởi tạo từ interval/ease/reps khi import thẻ SM-2
  difficulty?: number;   // FSRS state
}
```

- **Import** nhận: JSON export của extension (mảng `VocabCard`), CSV, TSV. Card thiếu field SRS → khởi tạo mặc định (`due = now`, `interval = 0`, `ease = 2.5`, `reps = 0`, `lapses = 0`).
- Thẻ SM-2 từ extension được **map sang state FSRS** khi import (interval/ease/reps → stability/difficulty xấp xỉ); field SM-2 cũ giữ nguyên để export ngược không mất gì.
- **Export** ra JSON/CSV/TSV đúng format extension đang xuất (extension import lại được).
- **Dedupe** theo `lang + term.trim().toLowerCase()` — giống `importVocabCards` của extension.

### 3.2 IndexedDB (database `aec`, version 1)

| Store | keyPath | Indexes | Nội dung |
|---|---|---|---|
| `cards` | `id` | `due`, `topic` | Deck từ vựng |
| `packs` | `key` (= `topic|level`) | — | Cache practice packs đã sinh (token-free khi mở lại) |
| `dictationSessions` | `id` | — | Bài dictation + tiến độ từng câu |
| `dict` | `term` | — | Cache tra cứu từ điển mở (nghĩa/IPA/audio URL — DATA.md §4), tra 1 lần dùng mãi |
| `mistakes` | `id` | `due`, `type` | Sổ tay lỗi trung tâm (D12 — mọi lỗi từ dictation/speaking/writing/quiz), schema §3.4 |
| `journal` | `id` | `date` | Bài viết nhật ký + kết quả proofread (Phase 9) |
| `meta` | `key` | — | Key-value: `practiceStats`, `dailyChallenge` (streak), `practiceDays` (heatmap), `weakWords`, `xp`, `badges` |

Các key trong `meta` **giữ nguyên tên và shape** như extension đang lưu trong `chrome.storage.local` (`practiceStats`, `dailyChallenge {lastDone, streak}`, `practiceDays {date → {attempts, sumScore}}`, weak words map) → phase sync sau này map 1-1.

### 3.3 Settings (localStorage, key `aec-settings`)

Subset của `AppSettings` extension — chỉ giữ phần liên quan học tập:

```ts
interface AppSettings {
  provider: 'gemini' | 'groq' | 'openrouter' | 'openai';
  apiKey: string;              // key của provider đang chọn (mỗi provider 1 field như extension)
  model: string;
  ttsVoiceEn: string; ttsVoiceVi: string; ttsRate: number;
  theme: 'dark' | 'light';
  dailyGoal: number;           // số thẻ mục tiêu/ngày (mới)
  reminderHour?: number;       // giờ nhắc (dùng từ Phase 8)
}
```

### 3.4 `Mistake` — sổ tay lỗi trung tâm (D12)

```ts
interface Mistake {
  id: string;
  source: 'dictation' | 'speaking' | 'writing' | 'quiz' | 'conversation';
  original: string;      // thứ user đã viết/nói/gõ
  corrected: string;     // bản đúng
  errorSpan?: string;    // đoạn sai cụ thể (để đục lỗ khi ôn)
  type?: 'grammar' | 'spelling' | 'word-choice' | 'preposition' | 'tense' | 'listening';
  note?: string;         // giải thích ngắn tiếng Việt (từ AI hoặc rule)
  createdAt: number;
  // Ôn lỗi (SRS-lite, tách khỏi lịch FSRS của deck)
  due?: number;
  reps?: number;
}
```

Mọi tính năng chấm lỗi **ghi vào store này ngay từ phase nó ra đời** (dictation P6, speaking P7, writing P9); UI ôn lỗi làm ở Phase 9. `weakWords` trở thành view rút gọn của `mistakes` (giữ key trong `meta` để tương thích extension).

### 3.5 Contracts của `core/` (ký trước khi code — unit test theo đúng chữ ký này)

```ts
// srs.ts
schedule(card: VocabCard, rating: ReviewRating, now: number): VocabCard;
getDueCards(deck: VocabCard[], now: number, limit?: number): VocabCard[];
fromSm2(card: VocabCard): VocabCard;              // map thẻ SM-2 extension → state FSRS

// cloze.ts — ưu tiên nguồn câu: context cá nhân → Tatoeba (bundle) → example
buildCloze(card: VocabCard, sentences: SentenceIndex): ClozeQ | null;

// quiz.ts
buildQuiz(deck: VocabCard[], opts: { size: number; topic?: string; weakFirst?: boolean }): QuizQ[];

// gamification.ts — thuần, mọi side-effect (lưu, toast) ở ngoài
applySession(state: GamifyState, result: SessionResult, todayISO: string):
  { state: GamifyState; earnedXp: number; newBadges: BadgeId[] };

// dictation.ts
gradeSentence(expected: string, typed: string): WordDiff[];   // đúng/sai/thiếu theo từ

// mistakes.ts
fromDictation(diff: WordDiff[], sentence: string): Mistake[];
fromProofread(issues: WritingIssue[], original: string): Mistake[];
toClozeCard(m: Mistake): ClozeQ;                  // ôn lỗi = cloze ngay chỗ sai

// importExport.ts
parseImport(filename: string, text: string): VocabCard[];     // JSON/CSV/TSV, throw lỗi có message VI
serialize(deck: VocabCard[], format: 'json' | 'csv' | 'tsv'): string;
```

`now`/`todayISO` luôn là **tham số**, không gọi `Date.now()` bên trong core — để test deterministic và tránh bug timezone.

## 4. Luồng chính

### 4.1 Review (SRS)

```
Home ─"Ôn ngay"→ Review
  db.cards.getByIndex('due' ≤ now) → hàng đợi
  mỗi thẻ: hiện term → flip → rating (again/hard/good/easy — swipe hoặc nút)
  core/srs.schedule(card, rating) → db.put(card)
  hết hàng đợi → summary (XP kiếm được, streak update) → Progress
```

Offline hoàn toàn. Không gọi AI.

### 4.2 AI call (Practice pack, feedback…)

```
Screen → services/ai/client.complete({ system, prompt, json: true })
       → provider module (gemini.ts | openai.ts) → fetch trực tiếp
       → parse JSON (retry 1 lần nếu malformed) → screen render + cache vào db.packs
```

Prompt templates port nguyên văn từ `background/index.ts` của extension (GENERATE_PRACTICE, ASSESS_SPEAKING, GENERATE_DRILL…) — đã được tinh chỉnh sẵn, không viết lại.

Ba nguyên tắc tiết kiệm token:

- **Generate-once-use-many**: 1 call sinh pack đầy đủ (vocab/phrases/dialogue/passage + câu hỏi quiz + bản dịch VI) — pack đó nuôi 4 màn hình Practice/Listen/Dictation/Quiz. Dictation chấm AI feedback 1 call cuối bài cho cả bài, không chấm từng câu.
- **Model routing theo tier**: `client.complete({ tier: 'cheap' | 'good' })` — gloss/dịch nhanh → model rẻ/nhanh (Flash, Groq); feedback/assessment → model tốt. Mapping tier→model theo provider nằm trong `services/ai/client.ts`.
- **Tra cứu từ KHÔNG dùng AI**: nghĩa/IPA/audio lấy từ bundle + API từ điển mở (DATA.md §4); AI chỉ là fallback cho từ lóng/cụm/nghĩa theo ngữ cảnh.

### 4.3 Audio mode (Phase 5)

```
Pack passage/dialogue → tts.playlist([{text, lang}...], { mode: 'en-vi' | 'en-only', gap: ms })
  SpeechSynthesis đọc tuần tự, utterance.onend → next
  Wake Lock API giữ màn hình khi đang phát; MediaSession API hiện control trên lock screen (best-effort)
```

### 4.4 Sync (Phase 8 — thiết kế trước, làm sau)

- Supabase Auth (Google) → bảng `cards` (cột = fields của VocabCard + `user_id`, `updated_at`, `deleted` tombstone) + bảng `meta`.
- Chiến lược: **last-write-wins theo `updatedAt`**, đồng bộ pull-then-push khi mở app và sau mỗi phiên ôn.
- Extension tham gia sau bằng cách thêm cùng client sync (đó là lý do `core/` phải thuần).
- Push reminder: Supabase Edge Function chạy cron → Web Push đến subscription đã đăng ký.

## 5. PWA

- `vite-plugin-pwa`: precache app shell (HTML/JS/CSS/icons), `registerType: 'autoUpdate'`.
- Runtime caching: KHÔNG cache AI API calls (POST, luôn cần fresh); cache ảnh minh họa nếu là remote URL.
- `manifest`: `display: 'standalone'`, theme màu theo token, icons 192/512 + maskable, shortcuts ("Ôn ngay", "Quiz").
- `navigator.storage.persist()` khi user import deck lần đầu (chống evict trên iOS).
- Badging API (`navigator.setAppBadge(dueCount)`) khi được hỗ trợ.

## 6. Quan hệ với extension (chiến lược tái dùng code)

**Giai đoạn này: copy, không monorepo.** Hai repo độc lập; phần port đặt trong `core/` + `services/ai|tts` với ghi chú nguồn gốc. Lý do: extension đang ổn định, gộp monorepo bây giờ tốn công cấu hình (CRXJS + PWA chung workspace) mà chưa có nhu cầu sửa hai bên đồng thời.

Danh sách port từ `ai-translator-ext`:

| Từ extension | Sang web app | Ghi chú |
|---|---|---|
| `src/types/index.ts` (VocabCard, PracticePack, DrillPack, SpeakingAssessment…) | `core/types.ts` | Copy nguyên, bỏ phần Chrome messaging |
| Logic SRS trong flashcards (getDueCards, chọn phiên) | `core/srs.ts` | Scheduler thay bằng FSRS (`ts-fsrs`), không port SM-2; chỉ giữ logic chọn thẻ |
| Quiz/cloze generators trong `FlashcardsApp.tsx` | `core/quiz.ts`, `core/cloze.ts` | Tách khỏi component |
| `parseImport`/`exportAs` trong `FlashcardsApp.tsx` | `core/importExport.ts` | |
| Chấm điểm dictation trong `DictationApp.tsx` | `core/dictation.ts` | |
| XP/streak/badges trong `PracticeApp.tsx` | `core/gamification.ts` | |
| `services/gemini.ts`, `services/openai.ts` | `services/ai/*` | Bỏ chrome.*, giữ prompt templates |
| `utils/voice.ts` (pickVoice) | `services/tts.ts` | |
| Design tokens CSS | `styles/tokens.css` | Xem DESIGN.md |

Khi phase sync hoàn thành và hai bên cần sửa logic chung thường xuyên → cân nhắc monorepo (pnpm workspace, package `@aec/core`). Ghi nhận là quyết định hoãn, không phải quên.

## 7. Testing & chất lượng

- **Unit test (Vitest)** cho toàn bộ `core/` — srs, quiz, cloze, dictation diff, importExport, gamification, mistakes. Đây là nơi bug gây hại nhất (mất tiến độ SRS của user). Test theo contracts §3.5.
- **Migration test**: mỗi lần tăng DB version phải có test mở fixture data của version cũ (bao gồm file export thật từ extension) và xác nhận đọc/nâng cấp đúng — xem §9.
- Screens/components: test bằng tay theo checklist mỗi phase (xem PHASES.md); cân nhắc Playwright smoke test (mở app → ôn 1 thẻ → reload còn dữ liệu) từ M2.
- ESLint + `tsc --noEmit` chạy trong `npm run lint`.
- CI: GitHub Actions (lint + test) bật từ cuối M1, khi đã có unit tests đáng chạy.

## 8. Hosting & Deployment (D11 — proposed, chốt khi bắt đầu Phase 0)

- **Cloudflare Pages**: deploy tĩnh từ git, free, HTTPS mặc định (bắt buộc cho SW/PWA), nhanh ở VN. Thay thế tương đương: GitHub Pages / Vercel.
- **1 Cloudflare Worker stateless** (`voa-proxy`, Phase 5): chỉ forward request đến whitelist host VOA + thêm CORS header; không lưu gì — không vi phạm D2 (no-backend).
- Không có secret nào phía client ngoài API key user tự nhập; repo không chứa key.
- Deploy flow: push `master` → Pages build (`npm run build`) → live. Preview deploy theo branch khi cần.

## 9. Schema versioning & migration

- Hằng số `DB_VERSION` trong `services/db.ts`; **mọi** thay đổi store/index → tăng version + viết upgrade callback (`idb` `upgrade(db, oldVersion)`) chạy tuần tự từng bậc.
- Không đổi nghĩa/kiểu field cũ — chỉ thêm field optional (nhất quán với D8). Xóa field = ngừng ghi nhưng vẫn đọc được.
- Mỗi migration kèm **fixture test**: file JSON data thật của version trước (kể cả export từ extension) phải mở được và giữ nguyên số thẻ.
- Bundle data versioned theo thư mục (`public/data/v1/`); app đọc `manifest.json` của bundle. Settings có `settingsVersion`, migrate khi boot.

## 10. Error handling & offline conventions

- **Không bao giờ mất input của user**: journal draft, câu dictation đang gõ, form thẻ đang nhập — autosave draft vào IndexedDB, sống sót reload/crash.
- Lỗi AI phân 4 loại, mỗi loại một hướng xử lý cố định: key sai/401 → link mở Settings; 429/quota → gợi ý retry sau hoặc đổi provider; mất mạng → thông báo tính năng cần mạng (phần offline vẫn chạy); JSON hỏng → retry 1 lần kèm nhắc format, rồi mới báo lỗi.
- Mọi màn hình định nghĩa rõ **offline-state**: nút cần mạng bị disabled + lý do ngắn; không có spinner vô hạn; mọi toast lỗi tiếng Việt kèm action (Thử lại / Mở Settings).
- Tính năng có gửi dữ liệu cho AI đánh badge "AI" nhỏ trên nút (minh bạch — xem §12).

## 11. Performance budgets (kiểm ở mỗi cuối phase)

| Chỉ số | Ngân sách |
|---|---|
| Initial JS (gzip) | ≤ 150 KB — route screens lazy-load toàn bộ |
| Mỗi route chunk | ≤ 50 KB |
| CSS toàn app | ≤ 20 KB |
| Bundle data (`public/data/`) | ≤ 1,5 MB, KHÔNG chặn first paint — SW precache nền, màn hình cần thì fetch |
| TTI (Android tầm trung, CPU 4x throttle) | < 2 s |
| Đọc deck 2.000 thẻ từ IndexedDB | < 100 ms (có perf test trong Vitest) |
| Lighthouse PWA + Performance | ≥ 90 |

Vượt budget = bug, xử lý trước khi đóng phase — không nợ lại.

## 12. Privacy & bảo mật

- Toàn bộ dữ liệu học nằm local cho đến Phase 8; cloud sync là **opt-in**, logout vẫn dùng đầy đủ chế độ local.
- **Không analytics/tracking bên thứ ba.** Mọi số liệu (streak, XP, thống kê lỗi) chỉ phục vụ hiển thị cho chính user.
- API key: chỉ trong localStorage, chỉ gửi đến đúng endpoint của provider đã chọn; cảnh báo R4 trong Settings; không bao giờ đưa lên cloud sync (Phase 8).
- Dữ liệu gửi cho AI = nội dung học/bài viết user chủ động submit, không kèm định danh; tính năng nào gửi thì UI ghi rõ (badge "AI").
- Phase 8: Supabase bật RLS per-user cho mọi bảng; tombstone thay vì xóa cứng để sync đúng.
