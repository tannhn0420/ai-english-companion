# PHASES — AI English Companion

> Roadmap chia phase nhỏ, mỗi phase **ship được và dùng được ngay**. Đánh dấu ✅ khi xong.
> Ước lượng tính theo "buổi" làm việc tập trung (~2-3h) để dễ hình dung, không phải cam kết.
> Ý tưởng mới KHÔNG thêm thẳng vào đây — đi qua [IDEAS.md](IDEAS.md) trước. Quyết định kiến trúc: [DECISIONS.md](DECISIONS.md).

**Trạng thái hiện tại: 🎉 TẤT CẢ 10 phase tính năng (0–10) code xong — toàn bộ hub Ôn tập + Luyện đã live. Chỉ còn NỢ từ Phase 8: Web Push nhắc ôn + sync client phía extension (repo ai-translator-ext). Kế tiếp gợi ý: hoàn tất 2 mục nợ đó, hoặc polish/QA tổng.**

## Tổng quan Milestones

| Milestone | Phases | Chủ đề | Ước lượng |
|---|---|---|---|
| **M1 — Dùng được hằng ngày** 🎯 | 0–3 | PWA + deck + FSRS + gamification (= MVP) | ~8–10 buổi |
| **M1.5 — Đồng bộ** ⬆ | 8 | Supabase sync + push — **kéo lên sớm** (quyết định 2026-08-13: ma sát máy tính ↔ điện thoại xuất hiện ngay tuần đầu dùng thật) | ~4–5 buổi |
| **M2 — Nội dung & AI** | 4–6 | Practice packs, VOA nghe/đọc song ngữ, dictation | ~7–9 buổi |
| **M3 — Nói** | 7 | Speaking (STT / iOS fallback) | ~3 buổi |
| **M4 — Kỹ năng chủ động** | 9–10 | Viết + sổ tay lỗi, hội thoại nhiệm vụ | ~6 buổi |

Checkpoint bắt buộc giữa các milestone: **dùng thật ≥ 1 tuần**, rà lại backlog/icebox trong IDEAS.md, được phép đổi thứ tự phase còn lại (kể cả kéo Phase 9 lên trước Phase 7 nếu nhu cầu viết > nói).

---

## Phase 0 — Scaffold & PWA Shell (~1-2 buổi)

Mục tiêu: khung app chạy được, cài được lên điện thoại, có theme + navigation.

- [x] Scaffold Vite react-ts + ESLint (flat) + Vitest + tsconfig strict.
- [x] `vite-plugin-pwa`: manifest (tên, icons 192/512/maskable, standalone, shortcuts "Ôn ngay"/"Quiz"), autoUpdate SW.
- [x] `styles/tokens.css` port design tokens từ extension + `base.css` (xem DESIGN.md).
- [x] Layout shell: bottom TabBar (mobile) / side rail (desktop ≥ 768px), 4 tab: Home, Ôn tập, Luyện, Cài đặt.
- [x] Router + màn hình placeholder; theme dark/light (đọc localStorage trước khi render — không flash).
- [x] Icons app (placeholder chữ E nền tím — thay bằng icon xịn sau).
- [x] Chốt D11 + deploy Cloudflare (Workers Builds + wrangler assets-only, SPA fallback) — live trên URL thật.
- [x] i18n foundation (D13): `src/i18n/` typed VI/EN, toggle trong Settings, mọi string qua `t()`.
- [x] Design direction (D14): Be Vietnam Pro self-host, type scale, marker highlight `.hl`.

**Acceptance criteria:**
- App live tại URL công khai, auto-deploy khi push `master`.
- Cài "Add to Home Screen" trên Android + iOS thành công, mở standalone.
- Tắt mạng → app vẫn mở được (shell precached).
- Đổi theme không flash trắng khi reload.

---

## Phase 1 — Data Core & Deck (~2-3 buổi)

Mục tiêu: dữ liệu vào được app — import từ extension, quản lý deck.

- [x] `core/types.ts` (copy từ extension) + `services/db.ts` (idb v1, đủ 7 store §3.2).
- [x] `core/importExport.ts`: parse JSON (export extension), CSV, TSV; serialize cả 3; dedupe `lang+term`.
  - [x] Unit tests (17): shape export extension, roundtrip, thiếu field SRS, file rác, dedupe.
- [x] `scripts/data/`: pipeline → `public/data/v1/` (ngsl 2801 từ + 5680 biến thể · ipa-core 7969 · sentences-core 3823 câu EN-VI ≈ 215KB gz) + loader `services/dataBundle.ts`; SW precache để offline.
- [x] Thêm thẻ auto-fill: IPA/audio người thật/ví dụ từ bundle + dictionaryapi.dev (cache store `dict`); nghĩa VI user nhập (AI fallback ở Phase 4).
- [x] Màn hình **Deck**: danh sách (content-visibility cho deck lớn), tìm kiếm, lọc topic, thêm/sửa/xóa qua bottom sheet.
- [x] Import UI (file picker + kéo thả desktop) → toast `added/skipped`.
- [x] Export UI (JSON/CSV/Anki TSV).
- [x] `services/settings.ts` + Settings: TTS voice EN/VI + rate + nghe thử, backup/restore/xóa hết, mục "Nguồn dữ liệu & ghi công" (R8).
- [x] `services/tts.ts` port `pickVoice` — nút 🔊 trên thẻ + trong form.

**Acceptance criteria:**
- Import file JSON export từ extension: đủ 100% thẻ, mọi field giữ nguyên (kiểm bằng export lại và diff).
- Export từ web app → import ngược vào extension thành công.
- Thao tác thêm/sửa/xóa phản ánh ngay và bền vững sau reload (IndexedDB).
- Thêm từ phổ biến khi online: IPA + audio tự điền, không tốn call AI nào.

---

## Phase 2 — Review MVP: SRS + Quiz + Cloze (~3 buổi) ⭐ giá trị cốt lõi

- [x] `core/srs.ts`: FSRS qua `ts-fsrs` 5.4 (schedule, previewGaps, getDueCards) + migration SM-2 `fromSm2` (interval/ease → stability/difficulty, giữ nguyên due) + 10 unit tests (4 rating, lapse, deterministic, không reset tiến độ).
- [x] Màn hình **Review**: thẻ kiểu mục từ điển (D14), lật, 4 nút rating kèm khoảng chờ ("10p/3ng…") + **swipe** (phải = Nhớ, trái = Quên), progress bar, TTS tự đọc (bật/tắt), thẻ Quên gặp lại cuối phiên; rating ghi DB ngay → reload không mất tiến độ.
- [x] Chế độ chọn nguồn: Đến hạn / Ngẫu nhiên / lọc topic.
- [x] `core/quiz.ts` + `core/cloze.ts` thuần, rng là tham số + 11 unit tests.
- [x] Cloze ưu tiên: `context` cá nhân → câu Tatoeba (index 3823 câu, kèm VI + link attribution #id) → `example`; hiện xuất xứ câu.
- [x] Desktop: phím tắt kiểu Anki (Space lật, 1–4 chấm điểm).
- [x] **"Ôn 2 phút"** trên Home: `/review?t=2m` tự bắt đầu, đếm ngược, tự kết thúc bằng summary.
- [x] Màn hình **Quiz**: MCQ 4 lựa chọn (tự chuyển sau 900ms) + cloze gõ đáp án (gợi ý chữ đầu / hiện đáp án); sai → weak words (store `meta`); summary cuối phiên.
- [x] Home: due count thật, "Ôn ngay" 1 chạm, streak placeholder (Phase 3).

**Acceptance criteria:**
- Ôn 10 thẻ đến hạn hoàn toàn offline < 2 phút, một tay trên điện thoại.
- Rating cập nhật đúng state FSRS (unit test theo ts-fsrs); thẻ SM-2 import từ extension được hẹn lịch hợp lý, không reset tiến độ.
- Reload giữa phiên không mất tiến độ đã rating.
- Thẻ có `context` hoặc từ thuộc NGSL: cloze dùng câu thật (không phải câu tự chế) kèm dịch VI.

---

## Phase 3 — Gamification & Progress (~2 buổi) → 🎉 MVP hoàn chỉnh

- [x] `core/gamification.ts`: cùng mô hình DẪN XUẤT với ProgressApp extension (xp = words×5 + attempts×3, 500 XP/cấp; streak tính lùi từ `practiceDays`; badges predicate) — key/shape meta giữ nguyên. 8 unit tests.
- [x] `recordSession` gọi đúng 1 lần cuối phiên Review/Quiz (mọi lối ra: hết thẻ / hết giờ / thoát tay); streak theo ngày local.
- [x] Màn hình **Progress**: level + XP bar, streak, badges (10), heatmap 4 tuần, thống kê deck, top từ hay sai.
- [x] Home hoàn thiện: streak + level thật (chạm → Progress), daily goal bar, Badging API (số thẻ due trên icon app).
- [x] Streak freeze: tự vá 1 ngày lỡ, tối đa 1 lần/7 ngày (chuẩn Duolingo: ngày freeze bảo toàn nhưng không +1) — KHÔNG leagues (D9).
- [x] Summary cuối phiên: +XP, streak, thông báo freeze đã dùng, badge mới đạt.
- [x] `weakWords` đổi về đúng shape extension `{misses, attempts}`; quiz/cloze ghi cả lượt đúng lẫn sai.

**Acceptance criteria:**
- Học 2 ngày liên tiếp → streak = 2; bỏ 1 ngày → reset (đúng logic extension).
- Heatmap khớp lịch sử phiên đã làm.
- **Checkpoint MVP:** tự dùng hằng ngày 1 tuần, sửa các điểm vướng trước khi làm tiếp.

---

## Phase 4 — AI Practice Packs (~3 buổi)

- [x] `services/ai/client.ts`: 4 provider (Gemini/Groq/OpenRouter/OpenAI-compat), lỗi tiếng Việt port từ extension, **tier routing** `cheap`/`good` (aiModelGood override); key chỉ localStorage, không sync.
- [x] `prompts.ts`: PRACTICE_SYSTEM_PROMPT + TEMPLATE port nguyên văn (pack đã generate-once: vocab+phrases+dialogue+passage kèm VI — nuôi Listen/Dictation sau); GENERATE_DRILL để Phase 7.
- [x] Màn hình **Practice** (`/practice/topic`): chủ đề + level chips → pack 4 tabs, cache vĩnh viễn `db.packs` (mở lại 0 token), recent chips; parse qua `core/aiJson` (extractJson + normalizePack, có tests).
- [x] Daily topic (port `dailyTopic`, 30 chủ đề), chip "Từ hay sai (n)" sinh pack từ weakWords, ＋ lưu từ vào sổ 1 chạm (dedupe với deck).
- [x] **Vocab size test** (`/vocabtest`): 36 từ sampling 3 band NGSL → ước lượng vốn từ, tự set độ khó (settings.practiceLevel); vào lại từ Settings → Học tập.
- [x] **Web Share Target** (Android, manifest `/share`) + nút "Dán từ clipboard" (Home) → prefill form thêm thẻ trong Sổ từ.
- [x] **Translate-back** (IDEAS W2): mode thứ 3 trong Quiz — câu VI Tatoeba → viết EN → so bản gốc + tự chấm, 0 token, tính vào XP/streak.
- [x] Settings: section AI (provider/key/model/validate) + Học tập (mục tiêu ngày, độ khó, test vốn từ).

**Acceptance criteria:**
- Sinh pack trên 4G ở điện thoại < 15s, mở lại pack cũ tức thì (cache, không tốn token); 1 pack = đúng 1 call AI.
- Không có key → các tính năng AI ẩn/disabled kèm hướng dẫn lấy key, phần offline vẫn dùng bình thường.
- Android: share 1 từ từ Chrome vào app → thẻ mới hoàn chỉnh trong ≤ 3 chạm.

---

## Phase 5 — Listen / Audio Mode (~2 buổi)

- [x] **D11 chốt (accepted)**: proxy VOA nhúng vào CHÍNH worker đang serve app (`worker/index.js`, `run_worker_first: ["/api/*"]`) — cùng origin, không CORS; phát hiện voanews.com bị chặn từ mạng VN nên proxy edge là bắt buộc.
- [x] Nguồn **VOA Learning English**: RSS podcast → danh sách bài; parse bài (Pangea CMS `#article-content`), tách câu (`core/sentences` port từ dictation extension); bài cache IndexedDB (store `articles`, **DB v2 + migration test fixture v1**); MP3 cache SW (CacheFirst + Range) — nghe lại offline.
- [x] `services/playlist.ts`: TTS playlist engine — EN-only / EN→VI, gap 0.6/1.2/2.5s, prev/play/next, Wake Lock khi phát, MediaSession metadata + action handlers.
- [x] Màn hình **Listen** (`/listen`): 3 nguồn — VOA (bài + MP3 gốc qua `<audio>`, mục "Đã lưu" offline, dòng credit VOA), Packs (passage/dialogue của pack đã tạo → player TTS), Sổ từ (nghe 20 thẻ due: từ → nghĩa).
- [x] **Đọc song ngữ**: nút 🌐 dịch cả bài 1 call AI tier `cheap`, lưu vào cache bài; chạm câu để nghe TTS.
- [x] Wake Lock + MediaSession (best-effort).
- [x] Chế độ "nghe deck" (ôn thụ động term → nghĩa).

**Acceptance criteria:**
- Nghe hết 1 passage 10 câu không cần chạm màn hình; pause/resume hoạt động.
- Mở 1 bài VOA đã cache khi offline: đọc + nghe bình thường, có dòng credit VOA.
- Ghi rõ hạn chế screen-off (R7) trong UI nếu gặp (MP3 VOA qua `<audio>` không bị giới hạn này — thêm lý do ưu tiên nguồn VOA).

---

## Phase 6 — Dictation Mobile (~2-3 buổi)

- [x] `core/dictation.ts`: chấm lỗi từng từ bằng căn chỉnh LCS (ok/wrong/missing/extra), scoreOf, isPerfect, wordTapChoices — 8 unit tests.
- [x] Màn hình **Dictation** (`/dictation`): nguồn = pack passage / bài VOA đã lưu / 10 câu Tatoeba / dán text (AI-topic để dành); nghe từng câu (🔊 + 🐢 chậm) → gõ lại → chấm tô màu, hiện câu đúng, reveal, VI toggle, progress.
- [x] **Word-tap mode**: xáo từ thành chip, chạm theo thứ tự (đỡ gõ trên mobile), chip tự ẩn khi dùng đủ.
- [x] Từ sai → `core/mistakes.fromDictation` → store `mistakes` (D12) qua `services/mistakes` (dedupe + SRS-lite `reviewMistake`); phiên tính vào XP/streak; AI feedback cuối bài (tier `good`, 1 call). UI ôn lỗi để Phase 9.

**Acceptance criteria:**
- Làm 1 bài 5 câu trên điện thoại thuận tay; sai được chấm đúng vị trí từ.
- Session dở dang mở lại đúng chỗ cũ.

---

## Phase 7 — Speaking (~3 buổi, rủi ro cao nhất)

- [x] `services/stt.ts`: SpeechRecognition + `sttAvailable()` capability detect; `services/recorder.ts` MediaRecorder fallback (chọn mime theo trình duyệt).
- [x] Luyện đọc câu mẫu (Tatoeba): STT → so khớp `gradeSentence` (dùng lại engine dictation) → highlight từ sai + điểm %; lỗi → `mistakes` source 'speaking' (D12). iOS không STT → ghi âm + nghe lại.
- [x] **iOS/khó**: IELTS chấm từ AUDIO thật qua Gemini (`geminiAudio` — nghe được nên chấm cả phát âm), chạy cả trên iOS; không key nhưng có STT → chấm từ transcript.
- [x] IELTS assessment: port prompt (4 tiêu chí, band 0–9) → màn hiện overall + 4 tiêu chí + điểm mạnh/cần sửa + câu mẫu Band 8+; 10 câu hỏi Part 1 tĩnh (0 token).
- [x] Pronunciation drill: port GENERATE_DRILL → tip + 8 minimal pairs + 6 câu, mỗi mục có 🔊; 7 preset âm người Việt hay sai.

**Acceptance criteria:**
- Android: nói câu mẫu → điểm + từ sai hiển thị đúng.
- iOS: luồng fallback hoàn chỉnh, không dead-end; message rõ ràng vì sao khác Android.

---

## Phase 8 — Cloud Sync + Push (~4-5 buổi) — ⬆ chạy ngay sau Phase 3 (M1.5)

- [x] Schema Supabase: bảng `cards` (payload jsonb — giữ nguyên shape D8) + `meta`, RLS per-user, tombstone delete — file `supabase/schema.sql`, **chủ dự án chạy 1 lần trong SQL Editor**.
- [x] Auth: **email + mật khẩu** (đổi từ Google — zero-config, không cần GCP OAuth; Google có thể bật thêm sau trên dashboard). UI trong Cài đặt → Đồng bộ.
- [x] Client sync: pull-then-push, LWW theo `updatedAt`; supabase-js lazy-load (chunk riêng, bundle chính vẫn < budget); chạy khi mở app + debounce 3s sau mỗi phiên học/sửa deck + nút "Đồng bộ ngay".
- [x] Merge dữ liệu học: `practiceDays`/`weakWords` merge **max-wise** từng entry (idempotent, không double-count), `practiceStats` dẫn xuất lại từ days, freeze lấy ngày gần nhất — `core/syncMerge.ts`, 6 unit tests.
- [x] Migration: import stamp `updatedAt = now`; thẻ xóa cục bộ ghi tombstone (meta) và lan truyền qua sync.
- [x] Web Push: `public/push-sw.js` (importScripts vào SW, không viết lại SW) + `services/push.ts` (subscribe/unsubscribe, VAPID public từ `VITE_VAPID_PUBLIC_KEY`) + Settings "Nhắc ôn" (giờ + bật/tắt); `supabase/push-schema.sql` (push_subscriptions) + `supabase/functions/send-reminders` (Edge cron: đếm thẻ due từ bảng cards → gửi push đúng giờ địa phương) + `scripts/gen-vapid.mjs`.
  - **Runbook** (chủ dự án chạy 1 lần): `npm i -D web-push && node scripts/gen-vapid.mjs` → đặt `VITE_VAPID_PUBLIC_KEY` vào build env Cloudflare; chạy `supabase/push-schema.sql`; `supabase functions deploy send-reminders --no-verify-jwt` + set secrets `VAPID_PUBLIC/VAPID_PRIVATE/VAPID_SUBJECT`; tạo cron gọi function mỗi giờ (Supabase Schedules hoặc pg_cron + pg_net).
- [ ] (Extension) thêm sync client tương tự → hai bên tự đồng bộ, bỏ import/export thủ công. ⬅ đang làm (repo ai-translator-ext)

**Acceptance criteria:**
- Sửa thẻ trên web app → thấy trên extension (và ngược lại) sau lần sync kế tiếp.
- Nhận push đúng giờ trên Android + iOS (PWA đã cài, iOS 16.4+).
- Logout/offline → app vẫn hoạt động đầy đủ ở chế độ local.

---

## Phase 9 — Viết & Sổ tay lỗi (~3 buổi) — mở đầu M4

- [x] Màn hình **Journal** (`/journal`): prompt gợi ý mỗi ngày (14 đề xoay vòng), viết 3–5 câu; **draft autosave** localStorage (ARCHITECTURE §10 — thoát vào lại vẫn còn); lịch sử bài viết.
- [x] AI proofread (`services/ai/writing.ts`): port prompt + schema `ProofreadResult`/`WritingIssue` từ extension; hiện bản sửa + CEFR + từng lỗi kèm giải thích VI (tier `good`, 1 call/bài).
- [x] `core/mistakes.ts` `fromProofread` + màn hình **Mistakes** (`/mistakes`): sổ tay lỗi mọi nguồn (dictation ✍️/writing/quiz), xóa từng lỗi.
- [x] **Ôn lỗi**: mỗi lỗi → cloze ngay chỗ sai (`toClozeCard`), SRS-lite riêng (`reviewMistake`: đúng giãn 1/3/7 ngày) — không trộn lịch FSRS.
- [x] Gamification: journal + ôn lỗi tính là hoạt động ngày (XP/streak).

**Acceptance criteria:**
- Viết bài 5 câu → nhận sửa + giải thích VI trong < 10s; reload giữa chừng không mất draft.
- Lỗi từ dictation và writing hiện chung một sổ tay; ôn lỗi hoạt động như phiên cloze.

---

## Phase 10 — Hội thoại nhiệm vụ (~3 buổi)

- [x] Thư viện **8 scenario tĩnh** (gọi món, khách sạn, phỏng vấn, hỏi đường, small talk, khám bệnh, mua sắm, sân bay): vai + bối cảnh + mục tiêu + câu mở đầu.
- [x] Chat theo lượt (`ai/conversation.turn`): AI đóng vai, mỗi lượt trả về reply + mục tiêu đã đạt (checklist sáng dần) + gợi ý VI nếu bí; gõ hoặc nói (STT Phase 7); AI auto-speak.
- [x] Đánh giá cuối phiên (`assessMission`, tier `good`): đạt mục tiêu chưa + điểm + feedback VI + cách nói tự nhiên hơn; lỗi → `mistakes` (fromProofread → sổ tay lỗi D12).
- [x] (Từ hay lưu vào deck: để backlog — hiện có nút mở thẳng sổ tay lỗi để ôn.)

**Acceptance criteria:**
- Hoàn thành 1 mission ~5 lượt: tổng call AI ≤ số lượt + 1 (không call ẩn).
- Chơi lại mission cho trải nghiệm khác (không cache cứng lời thoại AI).

---

## Backlog (chưa xếp phase — nguồn chân lý & chấm điểm: [IDEAS.md](IDEAS.md))

Trạng thái `backlog` hiện tại: **V5** leech + AI mnemonic · **V6** review forecast · **V7** cram session · **V8** collocations · **V12** gắn audio người thật hàng loạt · **L5** listening quiz cho bài VOA · **L6** minimal-pair nghe · **S5** shadowing VOA · **W3** sentence production · **M3** mini-lesson theo loại lỗi · **M4** thống kê lỗi · **G3** daily quests · **G4** weekly recap · **P1** coverage meter i+1 · **I3** CI GitHub Actions · **I4** auto-backup.

Icebox & Rejected (kèm lý do): xem IDEAS.md — không bàn lại ở đây.

## Nguyên tắc xuyên suốt

1. **Mỗi phase kết thúc = app dùng được**, không có trạng thái "đập đi xây lại".
2. **`core/` luôn có unit test trước khi screen dùng nó** (theo contracts ARCHITECTURE §3.5) — bug SRS/import là bug mất dữ liệu người dùng.
3. **Không thêm dependency mới** ngoài danh sách ARCHITECTURE §1 mà không ghi lý do vào doc này; không làm khác quyết định trong DECISIONS.md mà chưa cập nhật mục đó.
4. **Cuối mỗi phase**: kiểm performance budgets (ARCHITECTURE §11) — vượt là bug, không nợ.
5. **Cuối mỗi milestone**: dùng thật ≥ 1 tuần, rà IDEAS.md (thăng/giáng backlog ↔ icebox), được đổi thứ tự phase còn lại theo nhu cầu thực tế.
6. Ý tưởng nảy ra giữa chừng → ghi vào IDEAS.md trạng thái `icebox` rồi quay lại việc đang làm — không mở rộng scope phase đang chạy.
