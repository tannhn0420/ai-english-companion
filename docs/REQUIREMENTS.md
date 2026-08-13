# REQUIREMENTS — AI English Companion

> Web app (PWA) học tiếng Anh EN ↔ VI, dùng mọi lúc trên điện thoại + máy tính.
> Companion của Chrome Extension `ai-translator-ext`.

## 1. Bối cảnh & Vấn đề

Extension `ai-translator-ext` đã làm tốt việc **thu thập** (lưu từ khi đọc web, dịch trang, practice packs) nhưng bị giới hạn:

- Chỉ chạy trên Chrome desktop → không học được lúc di chuyển, giờ nghỉ, trên giường.
- Thời gian "rảnh 2–5 phút" (xếp hàng, chờ xe) là thời điểm ôn từ hiệu quả nhất — extension không chạm tới được.
- Dữ liệu học (deck từ vựng, streak, weak words) bị nhốt trong `chrome.storage` của một máy.

**Giải pháp:** một PWA nhẹ, mobile-first, dùng chung data schema với extension, tập trung vào **ôn luyện** thay vì thu thập.

## 2. Người dùng mục tiêu

| Persona | Mô tả | Nhu cầu chính |
|---|---|---|
| **Người đi làm học TA** (chính) | Đọc tài liệu EN trên desktop (dùng extension), muốn tận dụng thời gian rảnh trên điện thoại | Ôn từ đã lưu, phiên ngắn 2–5 phút, nghe passive khi đi đường |
| **Người luyện IELTS/giao tiếp** | Cần luyện nghe – nói – từ vựng theo chủ đề | Practice packs, dictation, speaking, feedback AI |

Ngôn ngữ UI: **song ngữ — tiếng Việt (mặc định) và English**, đổi trong Settings (D13). Giải nghĩa/giải thích lỗi ưu tiên tiếng Việt; nội dung học là tiếng Anh.

## 3. User Stories theo Epic

### Epic A — Ôn từ vựng (SRS) ⭐ giá trị cốt lõi
- A1. Là người học, tôi muốn **import deck từ extension** (file JSON/CSV) để ôn trên điện thoại.
- A2. Tôi muốn **ôn flashcards đến hạn** với thao tác vuốt (trái = quên, phải = nhớ) nhanh gọn một tay.
- A3. Tôi muốn làm **quiz trắc nghiệm** và **cloze** (điền từ vào chỗ trống) từ chính deck của mình.
- A4. Tôi muốn **thêm/sửa/xóa thẻ** ngay trên app (kèm nghĩa, IPA, ví dụ, chủ đề).
- A5. Tôi muốn nghe **phát âm** (TTS) của từ và câu ví dụ.
- A6. Tôi muốn **export** deck (JSON/CSV/Anki TSV) — dữ liệu là của tôi.
- A7. Khi thêm từ mới, tôi muốn nghĩa/IPA/**audio phát âm người thật** được tự điền từ từ điển mở (không tốn AI) — xem [DATA.md](DATA.md).
- A8. (Android) Tôi muốn **share** từ/đoạn văn từ app khác vào app để tạo thẻ nhanh; trên iOS thay bằng dán từ clipboard.

### Epic B — Động lực học (gamification)
- B1. Tôi muốn thấy **streak** ngày học liên tiếp để không bỏ ngày nào.
- B2. Tôi muốn có **XP / level / badges** khi hoàn thành phiên ôn.
- B3. Tôi muốn xem **heatmap lịch học** và thống kê (số từ đã thuộc, đến hạn, tỉ lệ đúng).
- B4. Mở app là thấy ngay "hôm nay có N từ đến hạn" + nút bắt đầu ôn 1-chạm.

### Epic C — Luyện tập theo chủ đề (AI)
- C1. Tôi muốn nhập chủ đề + level và được AI tạo **practice pack** (vocab / phrases / dialogue / passage) — giống extension.
- C2. Tôi muốn có **chủ đề gợi ý mỗi ngày** (daily challenge).
- C3. Tôi muốn luyện từ **weak words** (từ hay sai) của mình.
- C4. Tôi muốn lưu từ hay trong pack vào deck SRS bằng 1 chạm.
- C5. Lần đầu dùng, tôi muốn **vocab size test** nhanh (~2 phút, sampling theo band NGSL) để app ước lượng vốn từ và đặt level phù hợp.

### Epic D — Luyện nghe
- D1. Tôi muốn **audio mode**: app đọc passage/dialogue liên tục bằng TTS (EN → nghỉ → VI hoặc EN-only) như podcast, dùng khi đi đường.
- D2. Tôi muốn **dictation**: nghe câu rồi gõ lại, app chấm lỗi từng từ.
- D3. Trên điện thoại, tôi muốn biến thể **word-tap dictation**: nghe câu rồi chạm các từ theo đúng thứ tự (đỡ phải gõ).
- D4. Từ sai trong dictation được ghi vào **weak words**.

### Epic E — Luyện nói
- E1. Tôi muốn đọc to câu mẫu và được **chấm phát âm** (so khớp qua speech-to-text) — như extension.
- E2. Trên iOS (không có SpeechRecognition), tôi muốn ít nhất **ghi âm và nghe lại**, hoặc gửi audio cho AI chấm.
- E3. Tôi muốn **IELTS speaking assessment** (4 tiêu chí) như extension.

### Epic F — Đồng bộ & nhắc nhở
- F1. (MVP) Import/export file JSON thủ công, tương thích 100% format extension.
- F2. (Sau) Đăng nhập và **sync cloud** hai chiều giữa extension ↔ web app ↔ nhiều thiết bị.
- F3. (Sau) **Push notification**: "Bạn có 12 từ đến hạn ôn" theo giờ đã đặt.

### Epic G — Viết & Sổ tay lỗi (M4)
- G1. Tôi muốn **viết nhật ký 3–5 câu mỗi ngày** theo prompt gợi ý và được AI sửa lỗi kèm giải thích tiếng Việt (như writing assistant của extension).
- G2. Tôi muốn **mọi lỗi** của mình (nghe chép, nói, viết, quiz) được gom về **một sổ tay lỗi** duy nhất, phân loại theo kiểu lỗi.
- G3. Tôi muốn **ôn lại chính lỗi của mình** dưới dạng điền-vào-chỗ-sai, theo lịch riêng.
- G4. Tôi muốn luyện **dịch ngược**: đọc câu tiếng Việt, viết bản tiếng Anh, so với câu gốc (Tatoeba — không tốn AI).

### Epic H — Hội thoại nhiệm vụ (M4)
- H1. Tôi muốn **role-play có mục tiêu** (gọi món, phỏng vấn, small talk…) với AI đóng vai, thắng/thua rõ ràng — không phải chat lan man.
- H2. Cuối phiên tôi muốn biết: đạt mục tiêu chưa, 3 điểm cần sửa, và cách nói tốt hơn; lỗi nổi bật tự vào sổ tay lỗi.
- H3. Tôi muốn lưu từ/cụm hay gặp trong hội thoại vào deck bằng 1 chạm.

## 4. Phạm vi MVP (Phase 0–3)

**Có trong MVP:**
- PWA installable + offline (Epic A đầy đủ, Epic B đầy đủ).
- Import/export tương thích extension (F1).
- TTS phát âm.
- UI song ngữ VI/EN (D13), dark/light theme, mobile-first + dùng tốt trên desktop.

**Sau MVP:** Epic C, D (M2) → E, F2, F3 (M3) → G, H (M4) — chi tiết milestone trong [PHASES.md](PHASES.md); ý tưởng chưa xếp lịch nằm ở [IDEAS.md](IDEAS.md).

**Non-goals (không làm):**
- ❌ Native app (React Native/Flutter) — PWA đủ.
- ❌ Backend/server ở MVP — không có gì cần server cho đến phase sync.
- ❌ Ngôn ngữ khác ngoài EN ↔ VI.
- ❌ Nội dung học soạn sẵn (courses) — nội dung đến từ deck cá nhân + AI tạo theo yêu cầu.
- ❌ Social features (bảng xếp hạng, bạn bè).

## 5. Ràng buộc & Rủi ro kỹ thuật

| # | Ràng buộc | Ảnh hưởng / Đối sách |
|---|---|---|
| R1 | **iOS Safari không có Web SpeechRecognition** | Epic E phải có fallback: MediaRecorder ghi âm → nghe lại, hoặc gửi audio đến Gemini (hỗ trợ audio input) để chấm. Không chặn MVP vì Epic E ở phase sau. |
| R2 | **TTS voice trên mobile** chất lượng/danh sách voice khác desktop, load bất đồng bộ | Port logic `pickVoice` từ extension; luôn có fallback `lang='en-US'`; cho user chọn voice trong Settings. |
| R3 | **Web Push cần server** gửi notification | F3 gộp vào phase Supabase (Edge Functions). Trước đó: nhắc nhở khi mở app + Badging API. |
| R4 | **API key của user lưu client-side** | Giống extension (chấp nhận được — key của chính user). Cảnh báo rõ trong Settings; không bao giờ gửi key đi đâu ngoài API provider. |
| R5 | **iOS PWA**: push cần iOS 16.4+, storage có thể bị evict nếu lâu không dùng | Yêu cầu "Add to Home Screen"; nhắc user export backup định kỳ; `navigator.storage.persist()`. |
| R6 | **CORS**: gọi AI API trực tiếp từ browser | Gemini / Groq / OpenRouter đều hỗ trợ CORS với API key. OpenAI-compatible tùy endpoint — ghi rõ trong Settings. |
| R7 | **Screen-off TTS** (audio mode): SpeechSynthesis có thể bị pause khi tắt màn hình trên mobile | Chấp nhận ở bản đầu (màn hình mở + wake lock). Nguồn nghe VOA dùng MP3 qua `<audio>` nên không bị giới hạn này. |
| R8 | **Tuân thủ license dữ liệu mở** (Tatoeba CC-BY, NGSL CC BY-SA, Wiktionary CC BY-SA, VOA credit) | Màn "Nguồn dữ liệu & ghi công" trong Settings; giữ id câu Tatoeba để link attribution; FVDP (GPL) không dùng khi chưa quyết — chi tiết [DATA.md](DATA.md) §6. |

## 6. Tiêu chí thành công

- Mở app → bắt đầu ôn ≤ **2 chạm**, thời gian tải lần 2 (đã cache) < 1s.
- Một phiên ôn 10 thẻ hoàn thành được trong < 2 phút, hoàn toàn offline.
- Import file export từ extension: **0 mất mát dữ liệu** (mọi field của `VocabCard` giữ nguyên, kể cả trạng thái SRS).
- Lighthouse PWA: installable pass; Performance ≥ 90 trên mobile.
- Bản thân tác giả dùng hằng ngày ≥ 2 tuần không quay lại thói quen cũ 🙂
