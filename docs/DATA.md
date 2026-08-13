# DATA — Nguồn dữ liệu mở & Pipeline

> Chiến lược: **nội dung học lấy từ nguồn mở trước, AI chỉ dùng để cá nhân hóa và chấm/feedback.**
> License đã kiểm tra 08/2026. Không đưa nguồn mới vào app khi chưa ghi vào bảng §2 (kèm license).

## 1. Vai trò còn lại của AI

1. **Cá nhân hóa**: sinh practice pack theo chủ đề riêng; dịch VI cho nội dung chưa có bản dịch sẵn.
2. **Chấm & feedback**: viết, nói, dictation feedback, IELTS assessment.
3. **KHÔNG dùng AI** cho: tra nghĩa/IPA/audio phát âm, câu ví dụ, sinh cloze/quiz/distractors — các nguồn dưới đây cover đủ, 0 token và offline được.

## 2. Danh mục nguồn

| Nguồn | License | Attribution | Dùng cho |
|---|---|---|---|
| [Tatoeba](https://tatoeba.org/en/downloads) (câu EN + dịch VI; tải qua tatoeba.org hoặc [ManyThings EN-VI](https://www.manythings.org/anki/)) | CC-BY 2.0 FR (một phần CC0) | Ghi công Tatoeba + **giữ sentence id** để link về câu gốc | Câu ví dụ thật, nguồn cloze, câu dictation, distractors quiz |
| [NGSL 1.2](https://www.newgeneralservicelist.com/) (2.809 từ lõi, phủ ~92% văn bản phổ thông) + NAWL + NGSL-Spoken | CC BY-SA 4.0 | Browne, Culligan & Phillips | Xếp hạng "từ đáng học trước", band từ vựng, vocab size test, tính coverage bài đọc |
| [cmudict-ipa](https://github.com/menelik3/cmudict-ipa) (CMUdict chuyển IPA, ~134k từ) | BSD (CMUdict) | Ghi công CMU | IPA offline, không gọi AI |
| [dictionaryapi.dev](https://dictionaryapi.dev) / [WiktApi](https://wiktapi.dev/) (Wiktionary REST) | Data Wiktionary: CC BY-SA | Ghi công Wiktionary | Tra từ hiếm khi online: nghĩa, IPA, **URL audio người thật** → cache |
| Audio phát âm Wiktionary trên Wikimedia Commons (upload.wikimedia.org, CORS mở) | CC BY-SA / tùy file | Theo file | Phát âm người thật thay TTS trên flashcard |
| [VOA Learning English](https://learningenglish.voanews.com/p/6861.html) (bài + MP3 đọc chậm 1/3, từ vựng intermediate) | **Public domain** (trừ ảnh AP/Reuters) | Credit "VOA Learning English" | Bài đọc/nghe graded, dictation, shadowing, parallel reading |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) (tần suất từ OpenSubtitles) | MIT / CC | hermitdave | Bổ sung xếp hạng từ theo hội thoại thực (phim) |
| [FVDP Hồ Ngọc Đức](https://www.informatik.uni-leipzig.de/~duc/Dict/install.html) / [OVDP](https://sourceforge.net/projects/ovdp/) (từ điển Anh-Việt) | ⚠️ **GPL** | — | **CHƯA dùng.** Bundle data GPL có thể kéo theo nghĩa vụ license cho app. Ưu tiên nghĩa VI từ Wiktionary/Tatoeba/AI. Chỉ quyết lại khi thật sự thiếu (ghi vào đây) |

## 3. Bundle build-time — `scripts/data/` → `public/data/v1/`

Script Node chạy thủ công (không chạy trong `npm run build`), tải nguồn → lọc → emit JSON tĩnh, được SW precache. **Budget tổng ≤ 1,5 MB (gzip)** — vượt là phải cắt, không nới.

| File | Nội dung | Spec lọc | Ước lượng gzip |
|---|---|---|---|
| `ngsl.json` | 2.809 từ NGSL: `{word, rank, band}` (band 1–5 theo rank) + NAWL flag | Nguyên bản | ~40 KB |
| `ipa-core.json` | IPA cho từ thuộc NGSL ∪ NAWL, từ cmudict-ipa | Chỉ 1 biến thể phát âm chính/từ | ~60 KB |
| `sentences-core.json` | ~8.000 cặp câu Tatoeba `{id, en, vi}` | EN 4–12 từ; content words ⊆ NGSL band 1–4 (cho phép tên riêng); có dịch VI; dedupe; mỗi từ NGSL giữ tối đa 5 câu chứa nó | ~400 KB |

- Output versioned theo thư mục (`v1/`, `v2/`…) — đổi data là đổi path, SW tự bust cache.
- Script phải **deterministic** (cùng input → cùng output) và ghi nguồn + ngày tải vào file `manifest.json` cạnh output.
- Cloze/quiz engine tra `sentences-core.json` theo index từ → câu (build index lúc load, giữ trong memory).

## 4. API runtime (online, cache-first)

- Từ **ngoài** NGSL bundle: tra `dictionaryapi.dev` (hoặc WiktApi nếu cần structured hơn) → lưu kết quả (nghĩa, IPA, audio URL) vào store `dict` trong IndexedDB — tra 1 lần, dùng mãi.
- Audio người thật: URL Wikimedia Commons (CORS mở, fetch thẳng được) → cache blob vào IndexedDB nếu user đánh dấu thẻ đó.
- Khi thêm thẻ mới trong Deck: auto-fill nghĩa/IPA/audio từ nguồn này trước, AI chỉ là fallback (từ lóng, cụm từ, nghĩa theo ngữ cảnh).

## 5. VOA pipeline (Phase 5) — ⚠️ open question CORS

`learningenglish.voanews.com` nhiều khả năng không có CORS header cho fetch từ browser. Quyết định ở **đầu Phase 5**, chọn 1 trong 3:

- **(a) Cloudflare Worker proxy** (free tier): worker ~30 dòng chỉ forward + thêm CORS header. Không phải "backend có state" — chấp nhận được với nguyên tắc no-backend. **Khuyến nghị.**
- **(b) Dán link/text thủ công**: user copy bài vào app (giống DictationApp của extension đang làm với URL/raw text). Không cần hạ tầng, UX kém hơn.
- **(c) Bundle chọn lọc**: đóng gói N bài VOA (public domain) vào `public/data/` mỗi lần release. Offline hoàn toàn nhưng nội dung tĩnh.

Audio MP3 của VOA: thử fetch trực tiếp (CDN có thể mở CORS); nếu không thì đi qua (a).

## 6. Tuân thủ license (bắt buộc, không phải nice-to-have)

- Settings có màn **"Nguồn dữ liệu & ghi công"**: liệt kê Tatoeba (CC-BY), NGSL (CC BY-SA), Wiktionary (CC BY-SA), CMUdict (BSD), VOA, FrequencyWords — kèm link.
- Câu Tatoeba hiển thị trong UI học có nút/link nhỏ dẫn về `tatoeba.org/en/sentences/show/{id}` (đây là lý do bundle phải giữ `id`).
- `ngsl.json` là bản redistribute có chỉnh sửa (thêm band) → theo CC BY-SA, file data này mang cùng license — chỉ ảnh hưởng file data, không ảnh hưởng license code app.
- Nội dung VOA hiển thị kèm dòng "Nguồn: VOA Learning English".
