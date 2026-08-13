# IDEAS — Ngân hàng ý tưởng & khung ưu tiên

> Mọi ý tưởng mới đi vào đây TRƯỚC, được chấm điểm, rồi mới xếp vào phase trong [PHASES.md](PHASES.md).
> Mục đích: dự án lớn không chết vì thiếu ý tưởng, mà chết vì làm sai thứ tự — file này giữ thứ tự đúng.

## Khung chấm điểm

- **Giá trị (V)** 1–5: tác động lên việc *thật sự giỏi tiếng Anh hơn* (không phải "nghe cho vui").
- **Công sức (E)**: S (< 1 buổi) / M (1–3 buổi) / L (> 3 buổi).
- **Token**: 0 (thuần local/data mở) / $ (AI có kiểm soát) / $$ (AI mỗi lần dùng).
- **Trạng thái**: `phase-N` (đã xếp lịch) / `backlog` (duyệt, chờ xếp) / `icebox` (chưa duyệt / hoãn vô hạn) / `rejected` (kèm lý do).

## 1. Từ vựng & Ghi nhớ

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| V1 | FSRS scheduler | Thuật toán SRS hiện đại của Anki, giảm ~20-30% lần ôn | 5 | M | 0 | `phase-2` |
| V2 | Cloze từ câu thật (context cá nhân → Tatoeba) | Học từ trong ngữ cảnh thật thay câu tự chế | 5 | M | 0 | `phase-2` |
| V3 | Auto-fill thẻ từ từ điển mở (nghĩa/IPA/audio người thật) | dictionaryapi.dev + bundle, AI chỉ fallback | 4 | M | 0 | `phase-1` |
| V4 | Vocab size test theo band NGSL | Onboarding 2 phút ước lượng vốn từ, set level | 4 | M | 0 | `phase-4` |
| V5 | Leech detection + AI mnemonic | Thẻ fail ≥ 4 lần → gắn cờ, AI sinh mẹo nhớ (1 call/thẻ, cache); tùy chọn suspend | 4 | S | $ | `backlog` |
| V6 | Review forecast | Lịch dự báo số thẻ đến hạn hôm nay/mai/tuần này (từ data FSRS) — trong Progress | 3 | S | 0 | `backlog` |
| V7 | Cram session | Ôn gấp theo topic trước khi cần (họp, thuyết trình) — KHÔNG ghi vào lịch FSRS | 3 | S | 0 | `backlog` |
| V8 | Collocations | Học cụm từ đi kèm (make a decision); nguồn: câu Tatoeba chứa cụm + AI giải thích | 4 | M | $ | `backlog` |
| V9 | Word family | decide → decision → decisive: nhóm thẻ theo family (data Wiktionary có related forms) | 3 | M | 0 | `icebox` |
| V10 | Confusable pairs | Cặp từ hay nhầm (affect/effect, lend/borrow): list tuyển chọn + cloze phân biệt | 3 | S | 0 | `icebox` |
| V11 | Idiom / phrasal verb of the day | 1 idiom mỗi ngày trên Home, lưu vào deck 1 chạm | 2 | S | $ | `icebox` |
| V12 | Gắn audio người thật hàng loạt | Quét deck, tải audio Wiktionary cho thẻ chưa có (DATA.md §4) | 3 | S | 0 | `backlog` |
| V13 | Starter packs NGSL | "Gói từ khởi động": N từ NGSL band kế tiếp chưa có trong sổ → thẻ mới mỗi ngày (0 token, data sẵn). Nảy ra khi user tưởng bundle là deck (2026-08-13) | 3 | S | 0 | `icebox` |

## 2. Nghe

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| L1 | Audio mode / playlist TTS | Nghe passage/dialogue liên tục, EN→VI | 4 | M | 0 | `phase-5` |
| L2 | Nguồn VOA Learning English | Bài + MP3 người thật đọc chậm, public domain, cache offline | 5 | M | 0 | `phase-5` |
| L3 | Đọc song ngữ (parallel reading) | Text VOA + dịch VI cache, chạm câu để nghe | 4 | M | $ | `phase-5` |
| L4 | Dictation (gõ + word-tap) | Nghe chép chính tả, biến thể chạm từ cho mobile | 5 | M | $ | `phase-6` |
| L5 | Listening comprehension quiz | 3–5 câu hỏi hiểu bài cho mỗi bài VOA (sinh kèm lúc dịch — generate-once) | 4 | S | $ | `backlog` |
| L6 | Minimal-pair listening test | Nghe → chọn ship/sheep (ngược với drill nói); dùng pairs từ DrillPack | 3 | S | 0 | `backlog` |
| L7 | Podcast digest buổi sáng | Ghép 5 thẻ due + 1 đoạn VOA thành "bản tin" nghe 5 phút | 3 | M | $ | `icebox` |

## 3. Nói

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| S1 | Chấm đọc câu mẫu (STT) | So khớp transcript, highlight từ sai, weak words | 5 | L | 0 | `phase-7` |
| S2 | iOS fallback (ghi âm + Gemini audio chấm) | Không dead-end trên iOS | 4 | M | $ | `phase-7` |
| S3 | IELTS speaking assessment | 4 tiêu chí, port từ extension | 4 | S | $$ | `phase-7` |
| S4 | Pronunciation drill (minimal pairs) | Port GENERATE_DRILL | 4 | S | $ | `phase-7` |
| S5 | Shadowing với audio VOA | Phát câu → đọc theo → nghe lại bản ghi A/B với bản gốc | 4 | M | 0 | `backlog` |
| S6 | Conversation missions | Role-play có mục tiêu ("gọi món", "phỏng vấn") — AI đánh giá hoàn thành mục tiêu, feedback cuối; khác chat tự do: có cấu trúc, có điều kiện thắng | 5 | L | $$ | `phase-10` |

## 4. Viết (mảng mới)

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| W1 | Daily journal + AI proofread | Viết 3–5 câu mỗi ngày theo prompt gợi ý → AI sửa (port `ProofreadResult`/`WritingIssue` từ extension — đã có sẵn schema + prompt) | 5 | M | $ | `phase-9` |
| W2 | Translate-back với Tatoeba | Hiện câu VI → user dịch sang EN → so với bản EN gốc của chính cặp câu đó, tự chấm kiểu Anki. **0 token, luyện production, dùng data sẵn có** | 5 | S | 0 | `phase-4` |
| W3 | Sentence production | Đặt câu với từ vừa học → AI chấm ngắn (tier cheap) | 4 | S | $ | `backlog` |
| W4 | Email/message templates luyện viết công việc | Viết email theo tình huống, AI sửa theo văn phong formal | 3 | M | $ | `icebox` |

## 5. Sổ tay lỗi — "Mistake Notebook" (mảng mới, chất keo nối mọi kỹ năng)

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| M1 | Mistake store trung tâm | MỌI lỗi từ dictation/speaking/writing/quiz đổ về một store: `{nguồn, câu gốc, lỗi, sửa, loại lỗi}` | 5 | M | 0 | `phase-9` |
| M2 | Ôn lại lỗi như thẻ SRS | Lỗi thành thẻ ôn riêng (dạng cloze chính chỗ sai) — vòng lặp khép kín: sai ở đâu, ôn đúng chỗ đó | 5 | M | 0 | `phase-9` |
| M3 | AI phân loại lỗi + mini-lesson | Gom lỗi theo loại (mạo từ, thì, giới từ…) → bài giảng nhỏ đúng lỗi hay gặp nhất | 4 | M | $ | `backlog` |
| M4 | Thống kê lỗi trong Progress | "Tháng này bạn sai giới từ nhiều nhất" | 3 | S | 0 | `backlog` |

## 6. Động lực & Thói quen

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| G1 | Streak + freeze, XP/level/badges | Loss aversion nhẹ nhàng, không leagues | 4 | M | 0 | `phase-3` |
| G2 | Chế độ "Ôn 2 phút" | Cam kết nhỏ xây thói quen | 4 | S | 0 | `phase-2` |
| G3 | Daily quests | 3 nhiệm vụ nhỏ/ngày (10 thẻ + 1 bài nghe + 1 câu viết) → thưởng XP bonus; kéo user đi đủ kỹ năng thay vì chỉ ôn thẻ | 4 | M | 0 | `backlog` |
| G4 | Weekly recap | Chủ nhật: "tuần này 45 từ mới, 6/7 ngày, mạnh nhất: du lịch" — có thể AI viết 2 câu nhận xét | 3 | S | $ | `backlog` |
| G5 | Streak wager | Đặt cược streak (Duolingo: +14% D14 retention) | 2 | S | 0 | `icebox` |
| G6 | Push nhắc theo ngưỡng thẻ due | "12 từ đến hạn" khi vượt ngưỡng, không phải giờ cố định | 4 | M | 0 | `phase-8` |

## 7. Cá nhân hóa & Thông minh

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| P1 | Coverage meter i+1 | Chấm % từ đã biết của bài đọc bất kỳ → gợi ý bài 80–90% comprehensible (mô hình LingQ, chạy trên deck + band NGSL) | 5 | M | 0 | `backlog` |
| P2 | Weak words xuyên kỹ năng | Từ sai ở dictation ưu tiên xuất hiện ở quiz/cloze/speaking | 4 | S | 0 | `phase-4` |
| P3 | Gợi ý chủ đề theo lịch sử | Practice topic gợi ý từ topic các thẻ gần đây + weak words | 3 | S | 0 | `icebox` |
| P4 | CEFR progress tracking | Ước lượng CEFR từ vocab test + kết quả bài tập, vẽ đường tiến bộ theo tháng | 3 | M | 0 | `icebox` |

## 8. Hạ tầng & Dữ liệu

| # | Ý tưởng | Mô tả | V | E | Token | Trạng thái |
|---|---|---|---|---|---|---|
| I1 | Bundle data mở (NGSL/Tatoeba/IPA) | Pipeline scripts/data | 5 | M | 0 | `phase-1` |
| I2 | Hosting Cloudflare Pages + Worker proxy VOA | Free, nhanh, Worker giải quyết CORS (DATA.md §5a) | 4 | S | 0 | `phase-0` (Pages) / `phase-5` (Worker) |
| I3 | CI GitHub Actions (lint + test) | Chạy từ khi có unit tests Phase 1 | 3 | S | 0 | `backlog` |
| I4 | Auto-backup | Nhắc export định kỳ; desktop dùng File System Access API ghi thẳng file backup | 4 | S | 0 | `backlog` |
| I5 | Supabase sync + Web Push | 2 chiều extension ↔ app | 5 | L | 0 | `phase-8` (M1.5 — ngay sau Phase 3) |
| I6 | Local neural TTS (Kokoro WebGPU ~80MB) | Chỉ nếu Web Speech không đủ; đánh giá sau Phase 5 | 2 | L | 0 | `icebox` |
| I7 | FVDP EN-VI offline | GPL — chỉ quyết lại nếu thiếu nghĩa VI thật sự | 2 | M | 0 | `icebox` |

## Rejected (giữ lại để khỏi bàn lại)

| Ý tưởng | Lý do bỏ |
|---|---|
| Leagues / bảng xếp hạng / social | App cá nhân; research ghi nhận leagues gây lo âu; cần backend + user base |
| Chat AI tự do (không mục tiêu) | Đốt token, giá trị học mơ hồ; thay bằng S6 conversation missions có cấu trúc |
| Native app (React Native/Flutter) | PWA đáp ứng đủ; chi phí duy trì 2 codebase không xứng |
| Courses soạn sẵn | Nội dung đến từ deck cá nhân + data mở + AI; không cạnh tranh với app khóa học |
| Multi-language (ngoài EN↔VI) | Phá vỡ mọi giả định data (NGSL, Tatoeba filter, prompt) — ít nhất đến khi app trưởng thành |

## Quy trình dùng file này

1. Ý tưởng mới → thêm vào bảng đúng nhóm, trạng thái `icebox`.
2. Muốn làm → chấm V/E/Token, đổi sang `backlog`, thêm dòng tương ứng vào Backlog của PHASES.md.
3. Xếp lịch → đổi thành `phase-N` và ghi task cụ thể vào phase đó.
4. Mỗi lần kết thúc milestone (PHASES.md): rà lại backlog/icebox một lượt, thăng/giáng trạng thái.
