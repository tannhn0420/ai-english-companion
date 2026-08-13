# PHASES — AI English Companion

> Roadmap chia phase nhỏ, mỗi phase **ship được và dùng được ngay**. Đánh dấu ✅ khi xong.
> Ước lượng tính theo "buổi" làm việc tập trung (~2-3h) để dễ hình dung, không phải cam kết.
> Ý tưởng mới KHÔNG thêm thẳng vào đây — đi qua [IDEAS.md](IDEAS.md) trước. Quyết định kiến trúc: [DECISIONS.md](DECISIONS.md).

**Trạng thái hiện tại: ✅ Phase 0 xong (đã deploy Cloudflare). Tiếp theo: Phase 1 — Data Core & Deck.**

## Tổng quan Milestones

| Milestone | Phases | Chủ đề | Ước lượng |
|---|---|---|---|
| **M1 — Dùng được hằng ngày** 🎯 | 0–3 | PWA + deck + FSRS + gamification (= MVP) | ~8–10 buổi |
| **M2 — Nội dung & AI** | 4–6 | Practice packs, VOA nghe/đọc song ngữ, dictation | ~7–9 buổi |
| **M3 — Nói & Cloud** | 7–8 | Speaking (STT/iOS fallback), Supabase sync, push | ~7–8 buổi |
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

- [ ] `core/types.ts` (copy từ extension) + `services/db.ts` (idb, schema §3.2 ARCHITECTURE).
- [ ] `core/importExport.ts`: parse JSON (export extension), CSV, TSV; serialize cả 3; dedupe `lang+term`.
  - [ ] Unit tests: file export thật từ extension, file thiếu field SRS, file rác.
- [ ] `scripts/data/`: pipeline build bundle nguồn mở → `public/data/v1/` (ngsl.json, ipa-core.json, sentences-core.json — spec DATA.md §3) + loader trong `services/`.
- [ ] Thêm thẻ mới auto-fill: nghĩa/IPA/audio người thật từ bundle + dictionaryapi.dev (cache vào store `dict`, DATA.md §4); AI chỉ là fallback.
- [ ] Màn hình **Deck**: danh sách thẻ (virtualized nếu > 200), tìm kiếm, lọc theo topic, thêm/sửa/xóa thẻ.
- [ ] Import UI (file picker + kéo thả trên desktop) → báo kết quả `added/skipped`.
- [ ] Export UI (JSON/CSV/Anki TSV) — tải file về.
- [ ] `services/settings.ts` + màn hình Settings tối thiểu: theme, TTS voice + rate (danh sách voice load async), nút backup/restore.
- [ ] `services/tts.ts` port `pickVoice` — nút 🔊 trên mỗi thẻ.

**Acceptance criteria:**
- Import file JSON export từ extension: đủ 100% thẻ, mọi field giữ nguyên (kiểm bằng export lại và diff).
- Export từ web app → import ngược vào extension thành công.
- Thao tác thêm/sửa/xóa phản ánh ngay và bền vững sau reload (IndexedDB).
- Thêm từ phổ biến khi online: IPA + audio tự điền, không tốn call AI nào.

---

## Phase 2 — Review MVP: SRS + Quiz + Cloze (~3 buổi) ⭐ giá trị cốt lõi

- [ ] `core/srs.ts`: FSRS qua `ts-fsrs` (schedule, getDueCards) + migration thẻ SM-2 import từ extension (map interval/ease/reps → stability/difficulty) + unit tests (4 rating, lapse, thẻ SM-2 cũ).
- [ ] Màn hình **Review**: thẻ lật (term → meaning/IPA/example/ảnh), 4 nút rating + **swipe** (trái = again, phải = good), progress bar phiên, TTS tự đọc term (bật/tắt).
- [ ] Chế độ chọn nguồn: Đến hạn / Tất cả / Theo topic (như `ReviewMode` extension).
- [ ] `core/quiz.ts` + `core/cloze.ts` port từ FlashcardsApp (tách khỏi component, unit tests).
- [ ] Cloze ưu tiên nguồn câu theo thứ tự: (1) `context` cá nhân của thẻ → (2) câu Tatoeba trong bundle chứa từ đó → (3) `example`. Hiện xuất xứ câu ("Bạn gặp từ này tại…" / link Tatoeba theo DATA.md §6).
- [ ] Desktop: phím tắt kiểu Anki (Space lật, 1–4 chấm điểm).
- [ ] Chế độ **"Ôn 2 phút"** trên Home: phiên đếm ngược, tự kết thúc bằng summary.
- [ ] Màn hình **Quiz**: MCQ 4 lựa chọn + cloze gõ đáp án; kết quả cuối phiên; sai → ghi nhận (giảm SRS hoặc thêm weak words).
- [ ] Màn hình **Home** bản đầu: số từ đến hạn hôm nay, nút "Ôn ngay" (1 chạm vào Review), streak placeholder.

**Acceptance criteria:**
- Ôn 10 thẻ đến hạn hoàn toàn offline < 2 phút, một tay trên điện thoại.
- Rating cập nhật đúng state FSRS (unit test theo ts-fsrs); thẻ SM-2 import từ extension được hẹn lịch hợp lý, không reset tiến độ.
- Reload giữa phiên không mất tiến độ đã rating.
- Thẻ có `context` hoặc từ thuộc NGSL: cloze dùng câu thật (không phải câu tự chế) kèm dịch VI.

---

## Phase 3 — Gamification & Progress (~2 buổi) → 🎉 MVP hoàn chỉnh

- [ ] `core/gamification.ts`: port XP/level/badges/streak từ PracticeApp (giữ nguyên key `meta` như §3.2).
- [ ] Cộng XP khi hoàn thành phiên Review/Quiz; update streak theo ngày (timezone local).
- [ ] Màn hình **Progress**: level + XP bar, streak, badges, heatmap tháng (`practiceDays`), thống kê deck (tổng/đã thuộc/đến hạn).
- [ ] Home hoàn thiện: streak ring, daily goal (số thẻ/ngày), lời nhắc khi mở app nếu có thẻ đến hạn, Badging API.
- [ ] Streak freeze: tự bảo streak 1 lần/tuần khi lỡ 1 ngày (giữ loss-aversion nhưng không trừng phạt — KHÔNG làm leagues/bảng xếp hạng).
- [ ] Summary cuối phiên: XP kiếm được, thẻ đúng/sai, streak.

**Acceptance criteria:**
- Học 2 ngày liên tiếp → streak = 2; bỏ 1 ngày → reset (đúng logic extension).
- Heatmap khớp lịch sử phiên đã làm.
- **Checkpoint MVP:** tự dùng hằng ngày 1 tuần, sửa các điểm vướng trước khi làm tiếp.

---

## Phase 4 — AI Practice Packs (~3 buổi)

- [ ] `services/ai/`: port gemini.ts + openai.ts (Groq/OpenRouter/OpenAI-compat), provider switch trong Settings + validate key; **model routing theo tier** (`cheap`/`good` — ARCHITECTURE §4.2).
- [ ] `prompts.ts`: port templates GENERATE_PRACTICE, GENERATE_DRILL từ background extension; sửa theo **generate-once-use-many** (1 call ra pack + quiz + dịch VI đầy đủ).
- [ ] Màn hình **Practice**: nhập chủ đề + level → pack (tabs vocab/phrases/dialogue/passage), cache vào `db.packs`, danh sách recent packs.
- [ ] Daily challenge topic (port `dailyTopic()`), luyện từ weak words, lưu từ trong pack vào deck 1 chạm.
- [ ] **Vocab size test** (onboarding + chạy lại trong Settings): sampling ~50 từ theo band NGSL, chọn "biết/không" → ước lượng vốn từ, set level mặc định cho AI.
- [ ] **Web Share Target** (Android): share từ/đoạn từ app khác → mở form tạo thẻ (auto-fill Phase 1 + AI enrich nếu là cụm/câu). iOS không hỗ trợ share target → nút "Dán từ clipboard" trên Home.
- [ ] **Translate-back** (IDEAS W2): hiện câu VI của cặp Tatoeba → user viết bản EN → so bản gốc, tự chấm kiểu Anki (0 token, luyện production).

**Acceptance criteria:**
- Sinh pack trên 4G ở điện thoại < 15s, mở lại pack cũ tức thì (cache, không tốn token); 1 pack = đúng 1 call AI.
- Không có key → các tính năng AI ẩn/disabled kèm hướng dẫn lấy key, phần offline vẫn dùng bình thường.
- Android: share 1 từ từ Chrome vào app → thẻ mới hoàn chỉnh trong ≤ 3 chạm.

---

## Phase 5 — Listen / Audio Mode (~2 buổi)

- [ ] **Quyết định CORS cho VOA** đầu phase (DATA.md §5: Cloudflare Worker proxy / dán thủ công / bundle chọn lọc — khuyến nghị (a)).
- [ ] Nguồn **VOA Learning English** (public domain, credit VOA): danh sách bài + MP3 đọc chậm; cache offline vào IndexedDB.
- [ ] `tts.ts` playlist engine: đọc tuần tự passage/dialogue, mode EN-only / EN→VI, gap chỉnh được, tốc độ chỉnh được.
- [ ] Màn hình **Listen**: chọn bài VOA / pack đã cache → player (play/pause/next/prev câu, highlight câu đang đọc; VOA dùng MP3 gốc thay TTS).
- [ ] **Đọc song ngữ** (parallel reading): text VOA + bản dịch VI (AI dịch 1 lần theo tier `cheap`, cache); chạm câu để nghe.
- [ ] Wake Lock khi đang phát; MediaSession metadata (best-effort trên lock screen).
- [ ] Chế độ "nghe deck": đọc term → nghỉ → meaning cho N thẻ đến hạn (ôn thụ động).

**Acceptance criteria:**
- Nghe hết 1 passage 10 câu không cần chạm màn hình; pause/resume hoạt động.
- Mở 1 bài VOA đã cache khi offline: đọc + nghe bình thường, có dòng credit VOA.
- Ghi rõ hạn chế screen-off (R7) trong UI nếu gặp (MP3 VOA qua `<audio>` không bị giới hạn này — thêm lý do ưu tiên nguồn VOA).

---

## Phase 6 — Dictation Mobile (~2-3 buổi)

- [ ] `core/dictation.ts`: port diff/chấm lỗi từng từ + unit tests.
- [ ] Màn hình **Dictation**: nguồn = passage pack / bài VOA đã cache / câu Tatoeba theo band NGSL / AI sinh theo chủ đề / dán text; nghe từng câu → gõ lại → chấm, reveal hint dần, dịch VI toggle.
- [ ] **Word-tap mode** (mới cho mobile): xáo từ của câu thành chip, chạm theo thứ tự.
- [ ] Từ sai → ghi vào store `mistakes` (schema ARCHITECTURE §3.4, D12 — UI ôn lỗi làm ở Phase 9) + view weak words; lưu session + tiến độ vào `db.dictationSessions`; AI feedback cuối bài (port ASSESS prompt, 1 call cho cả bài).

**Acceptance criteria:**
- Làm 1 bài 5 câu trên điện thoại thuận tay; sai được chấm đúng vị trí từ.
- Session dở dang mở lại đúng chỗ cũ.

---

## Phase 7 — Speaking (~3 buổi, rủi ro cao nhất)

- [ ] `services/stt.ts`: SpeechRecognition (Chrome/Android/desktop) + capability detect.
- [ ] Luyện đọc câu mẫu: so khớp transcript, highlight từ sai (port recordScore/recordWeakWords), chấm điểm; lỗi ghi vào `mistakes` (D12).
- [ ] **iOS fallback**: MediaRecorder ghi âm → nghe lại; nếu có key Gemini → gửi audio cho Gemini chấm phát âm.
- [ ] IELTS assessment: port prompt ASSESS_SPEAKING (4 tiêu chí) từ extension.
- [ ] Pronunciation drill (minimal pairs) port GENERATE_DRILL.

**Acceptance criteria:**
- Android: nói câu mẫu → điểm + từ sai hiển thị đúng.
- iOS: luồng fallback hoàn chỉnh, không dead-end; message rõ ràng vì sao khác Android.

---

## Phase 8 — Cloud Sync + Push (~4-5 buổi, cần quyết định lại trước khi làm)

- [ ] Supabase project: Auth (Google), bảng `cards` + `meta` (RLS theo user), tombstone delete.
- [ ] Client sync: pull-then-push, last-write-wins theo `updatedAt`; chạy khi mở app + sau mỗi phiên.
- [ ] Migration: gán `updatedAt` cho thẻ cũ; xử lý merge lần đầu đăng nhập (local ∪ cloud, dedupe).
- [ ] Web Push: xin quyền, lưu subscription; Edge Function cron gửi "N từ đến hạn" theo `reminderHour`.
- [ ] (Extension) thêm sync client tương tự → hai bên tự đồng bộ, bỏ import/export thủ công.

**Acceptance criteria:**
- Sửa thẻ trên web app → thấy trên extension (và ngược lại) sau lần sync kế tiếp.
- Nhận push đúng giờ trên Android + iOS (PWA đã cài, iOS 16.4+).
- Logout/offline → app vẫn hoạt động đầy đủ ở chế độ local.

---

## Phase 9 — Viết & Sổ tay lỗi (~3 buổi) — mở đầu M4

- [ ] Màn hình **Journal**: prompt gợi ý mỗi ngày (sinh từ topic deck + weak words), viết 3–5 câu; **draft autosave** vào IndexedDB (ARCHITECTURE §10).
- [ ] AI proofread: port prompt + schema `ProofreadResult`/`WritingIssue` từ extension (đã có sẵn, tinh chỉnh rồi); highlight lỗi + giải thích VI (tier `good`, 1 call/bài).
- [ ] `core/mistakes.ts` theo contracts §3.5 + màn hình **Mistakes**: sổ tay lỗi mọi nguồn (dictation P6, speaking P7, writing), lọc theo loại/nguồn.
- [ ] **Ôn lỗi**: mỗi lỗi → cloze ngay chỗ sai (`toClozeCard`), lịch SRS-lite riêng — không trộn vào lịch FSRS của deck.
- [ ] Gamification tính journal là hoạt động ngày (streak/quest).

**Acceptance criteria:**
- Viết bài 5 câu → nhận sửa + giải thích VI trong < 10s; reload giữa chừng không mất draft.
- Lỗi từ dictation và writing hiện chung một sổ tay; ôn lỗi hoạt động như phiên cloze.

---

## Phase 10 — Hội thoại nhiệm vụ (~3 buổi)

- [ ] Thư viện **scenario** có mục tiêu (gọi món, check-in khách sạn, phỏng vấn, small talk với đồng nghiệp…): vai + bối cảnh + điều kiện hoàn thành; seed ~10 scenario tĩnh, thêm mới bằng AI khi user muốn.
- [ ] Chat theo lượt (port CHAT_TURN từ extension): AI đóng vai và bám mục tiêu; trả lời bằng gõ hoặc nói (dùng STT Phase 7 nếu có).
- [ ] Đánh giá cuối phiên (1 call tier `good`): đạt mục tiêu chưa, 3 góp ý, cách nói tốt hơn; lỗi nổi bật ghi vào `mistakes`.
- [ ] Transcript lưu lại; từ/cụm hay trong hội thoại lưu vào deck 1 chạm.

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
