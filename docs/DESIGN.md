# DESIGN — AI English Companion

> UI/UX spec. Mobile-first, một tay, phiên ngắn. Kế thừa ngôn ngữ thị giác của extension (navy đậm + tím) để hai app cảm giác cùng một hệ.

## 1. Nguyên tắc

1. **2 chạm đến giá trị**: mở app → "Ôn ngay" → đang học. Mọi tính năng chính cách Home đúng 1 chạm.
2. **Một tay**: hành động chính nằm nửa dưới màn hình; swipe thay cho nút nhỏ; touch target ≥ 44px.
3. **Phiên ngắn mặc định**: mặc định 10 thẻ/phiên; luôn thoát giữa chừng được mà không mất tiến độ.
4. **Không rườm rà**: không onboarding dài, không modal chồng modal, tối đa 1 popup tại một thời điểm.
5. **Desktop = cột giữa**: giữ layout mobile trong container max-width, thêm side rail thay TabBar. Không thiết kế riêng cho desktop.

## 2. Design Tokens (`styles/tokens.css`)

Hợp nhất từ các bộ token đang phân mảnh của extension (index.css / practice.css / flashcards.css) thành MỘT bộ duy nhất. Dark là mặc định (giống extension), light qua `[data-theme="light"]`.

| Token | Dark (default) | Light | Dùng cho |
|---|---|---|---|
| `--bg` | `#0f0f23` | `#f4f6fb` | Nền app |
| `--bg-2` | `#12122a` | `#eef0f7` | Nền phụ, header |
| `--card` | `#1a1a3e` | `#ffffff` | Card, sheet |
| `--border` | `#2a2a4e` | `#e4e7f1` | Viền |
| `--text` | `#e2e8f0` | `#1f2937` | Chữ chính |
| `--text-2` | `#94a3b8` | `#475569` | Chữ phụ |
| `--muted` | `#64748b` | `#94a3b8` | Chữ mờ, placeholder |
| `--accent` | `#a78bfa` | `#7c3aed` | Hành động chính, active tab, link |
| `--accent-2` | `#8b5cf6` | `#6d28d9` | Hover/pressed của accent |
| `--ok` | `#34d399` | `#059669` | Đúng, thành công, streak |
| `--warn` | `#fbbf24` | `#d97706` | Cảnh báo, thẻ sắp quên |
| `--bad` | `#f87171` | `#dc2626` | Sai, lỗi, nút Again |
| `--radius` | `14px` | | Card, nút lớn |
| `--radius-s` | `8px` | | Chip, input |
| `--shadow` | `0 8px 24px rgb(0 0 0 / .35)` | nhạt hơn | Sheet, card nổi |

- Font: system stack (`-apple-system, Segoe UI, Roboto…`) — không load webfont (offline + tốc độ).
- Cỡ chữ: base 16px; term trên flashcard 28–32px; hỗ trợ `prefers-reduced-motion`.
- Contrast: mọi cặp chữ/nền đạt WCAG AA (theme extension đã đạt, giữ nguyên).

## 3. Điều hướng

```
┌─────────────────────────────┐
│         (content)           │
│                             │
├─────────────────────────────┤
│  🏠 Home  📇 Ôn  🎯 Luyện  ⚙️ │   ← TabBar (mobile, ẩn khi trong phiên học)
└─────────────────────────────┘
```

- **4 tab**: Home · Ôn tập (Review/Quiz/Cloze/Ôn lỗi/Deck) · Luyện (Practice/Listen/Dictation/Speaking/Journal/Missions) · Cài đặt.
- Tab "Ôn tập" và "Luyện" là màn hình hub nhỏ liệt kê các chế độ — tránh TabBar 7 mục.
- Progress đi từ Home (chạm vào streak/level) — không chiếm tab.
- **Trong phiên học** (Review/Quiz/Dictation): fullscreen, ẩn TabBar, chỉ có nút ✕ thoát (lưu tiến độ) + progress bar mỏng trên đỉnh.
- Desktop (≥ 768px): TabBar → side rail trái, content max-width 560px căn giữa.

## 4. Spec từng màn hình

### 4.1 Home (widget-style)

```
┌──────────────────────────┐
│ 🔥 12 ngày   ⭐ Lv 5      │  ← chạm vào → Progress
│                          │
│   Hôm nay có 12 từ       │
│   đến hạn ôn             │
│  ┌────────────────────┐  │
│  │     ▶ Ôn ngay      │  │  ← nút lớn, 1 chạm vào Review
│  └────────────────────┘  │
│                          │
│  [🎯 Quiz] [✍️ Cloze]     │  ← quick actions
│  [🎧 Nghe] [🎙️ Chủ đề hôm nay]│
│                          │
│  Mục tiêu hôm nay ▓▓▓░ 7/10 │
└──────────────────────────┘
```

Không có feed, không danh sách dài. Nếu không còn thẻ đến hạn: chúc mừng + gợi ý Quiz/Practice.

### 4.2 Review (flashcard SRS)

- Thẻ chiếm ~70% màn hình: mặt trước = term (+IPA, nút 🔊, tự đọc nếu bật); chạm để lật → meaning, example, ảnh.
- **Swipe** sau khi lật: trái = Again (đỏ), phải = Good (xanh); kéo lộ màu nền tương ứng. 4 nút rating vẫn hiện dưới thẻ (Again/Hard/Good/Easy + thời gian hẹn lại, như extension: "10p / 1d / 3d…").
- Progress bar phiên trên đỉnh; đếm còn lại.
- Kết phiên: card summary — số thẻ, đúng/sai, XP, streak; nút "Ôn tiếp 10 thẻ" nếu còn.

### 4.3 Quiz / Cloze

- MCQ: câu hỏi = meaning (hoặc term), 4 lựa chọn dạng nút lớn full-width; chạm → tô ✅/❌ + đáp án đúng; tự chuyển sau 800ms.
- Cloze: câu example khuyết từ, input + bàn phím; Enter kiểm tra; nút "Gợi ý" (hiện chữ cái đầu) và "Hiện đáp án".
- Điểm chạy trên đỉnh; kết phiên giống Review.

### 4.4 Deck

- Search bar dính đỉnh + filter chip theo topic; danh sách thẻ compact (term — meaning, badge due).
- Chạm thẻ → sheet chi tiết (sửa/xóa/nghe); nút ➕ FAB thêm thẻ mới.
- Import/Export trong menu ⋯ (JSON/CSV/Anki), kéo-thả file trên desktop.

### 4.5 Practice (Phase 4)

- Input chủ đề + level chip (beginner/intermediate/advanced) → nút "Tạo bài luyện".
- Kết quả: tabs Vocab / Phrases / Dialogue / Passage (giữ cấu trúc PracticeApp extension, bỏ bớt panel phụ).
- Recent packs dạng chip — mở lại tức thì từ cache.

### 4.6 Listen (Phase 5)

- Player tối giản: câu đang đọc chữ lớn ở giữa (câu trước/sau mờ), controls ▶︎ ⏸ ⏮ ⏭ + tốc độ + mode EN / EN→VI.
- Nguồn: passage/dialogue từ pack đã cache, hoặc "đọc deck" (term → meaning).

### 4.7 Dictation (Phase 6)

- Mode gõ: audio controls + input + chấm lỗi tô màu từng từ (đúng xanh/sai đỏ/thiếu gạch) — port UI logic từ extension.
- Mode word-tap: các chip từ xáo trộn, chạm theo thứ tự nghe được; sai rung nhẹ.

### 4.8 Progress

- Hero: level ring + XP bar; streak + freeze (nếu làm); hàng badges (khóa = mờ).
- Heatmap tháng (ô = ngày, đậm theo số phiên) + line nhỏ tỉ lệ đúng 30 ngày.
- Thống kê deck: tổng / đã thuộc (reps ≥ 2) / đến hạn.

### 4.9 Journal (Phase 9)

- Mở màn là prompt hôm nay ("Hãy kể về…" — sinh từ topic deck/weak words) + textarea lớn, đếm câu; draft autosave hiển thị trạng thái "đã lưu nháp".
- Sau khi gửi: bài viết render lại với lỗi gạch chân màu theo loại; chạm lỗi → sheet giải thích VI + bản sửa; nút "Lưu tất cả lỗi vào sổ tay".
- Lịch sử bài viết theo ngày (gắn với heatmap Progress).

### 4.10 Mistakes — Sổ tay lỗi (Phase 9)

- Danh sách lỗi nhóm theo loại (ngữ pháp/chính tả/giới từ/nghe…), mỗi mục: câu sai → câu đúng, badge nguồn (✍️/🎧/🎙️).
- Nút "Ôn lỗi" → phiên cloze đục đúng chỗ sai, flow giống Review.
- Filter theo nguồn/loại; swipe để archive lỗi đã nắm.

### 4.11 Missions — Hội thoại nhiệm vụ (Phase 10)

- Danh sách scenario dạng card: bối cảnh, vai của bạn, mục tiêu (VD: "Gọi món + hỏi món chay + xin hóa đơn").
- Trong phiên: chat bubble; mục tiêu hiển thị dạng checklist mờ trên đỉnh, sáng dần khi đạt; input gõ + nút 🎙️ (nếu có STT).
- Kết phiên: đạt/chưa đạt mục tiêu, 3 góp ý, "cách nói tốt hơn"; nút lưu từ hay vào deck.

### 4.12 Settings

- Nhóm: Giao diện (theme) · Phát âm (voice EN/VI, tốc độ, nghe thử) · AI (provider, key, model, validate — kèm cảnh báo R4) · Học tập (mục tiêu ngày, cỡ phiên, tự đọc thẻ) · Dữ liệu (import/export/backup, số thẻ, nút xóa hết + confirm) · **Nguồn dữ liệu & ghi công** (bắt buộc theo R8/DATA.md §6).

## 5. Interaction & polish

- Chuyển màn hình: không animation phức tạp; thẻ lật dùng CSS 3D flip nhanh (200ms), tôn trọng `prefers-reduced-motion`.
- Haptics: `navigator.vibrate(10)` khi rating/đáp án (Android; iOS bỏ qua êm).
- Âm đúng/sai: tắt mặc định, bật trong Settings.
- Empty states có hướng dẫn hành động: Deck trống → "Import từ extension hoặc thêm thẻ đầu tiên" kèm nút.
- Toast 1 dòng đáy màn hình (trên TabBar); không dùng alert.
- Loading AI: skeleton + dòng trạng thái vui ("Đang soạn bài về *coffee*…"); mọi lỗi API có retry + message tiếng Việt thân thiện (giữ convention extension).
