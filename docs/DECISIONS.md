# DECISIONS — Log quyết định (ADR-lite)

> Mỗi quyết định kiến trúc/sản phẩm quan trọng ghi một mục: bối cảnh → quyết định → hệ quả → điều kiện xét lại.
> Quy tắc: **muốn làm khác một quyết định `accepted` thì phải cập nhật mục đó trước, kèm lý do** — không lặng lẽ làm khác đi.

| # | Quyết định | Trạng thái | Ngày |
|---|---|---|---|
| D1 | PWA, không native app | accepted | 2026-08-12 |
| D2 | Không backend cho MVP; sync = Supabase ở Phase 8 | accepted | 2026-08-12 |
| D3 | Copy code từ extension, không monorepo | accepted | 2026-08-12 |
| D4 | SRS = FSRS (`ts-fsrs`), không port SM-2 | accepted | 2026-08-12 |
| D5 | Open-data-first, AI-second | accepted | 2026-08-12 |
| D6 | IndexedDB (`idb`) cho data, localStorage cho settings | accepted | 2026-08-12 |
| D7 | Vanilla CSS + tokens, không Tailwind | accepted | 2026-08-12 |
| D8 | Schema `VocabCard` tương thích extension 100%, field mới chỉ optional | accepted | 2026-08-12 |
| D9 | Gamification nhẹ: streak/XP/badges/freeze — KHÔNG leagues | accepted | 2026-08-13 |
| D10 | FVDP (GPL) chưa dùng | accepted | 2026-08-13 |
| D11 | Hosting: Cloudflare Pages + Worker proxy cho VOA | proposed | 2026-08-13 |
| D12 | Mistake Notebook là store trung tâm nối mọi kỹ năng | accepted | 2026-08-13 |

---

## D1 — PWA, không native app
**Bối cảnh:** cần chạy cả điện thoại + desktop, một người maintain.
**Quyết định:** PWA (vite-plugin-pwa), installable, offline-first.
**Hệ quả:** không có share target trên iOS, push cần iOS 16.4+, STT không có trên iOS Safari (→ R1, fallback Phase 7).
**Xét lại khi:** nhu cầu nền tảng vượt khả năng PWA (background audio dài, widget thật) VÀ app đã chứng minh được dùng hằng ngày.

## D2 — Không backend cho MVP
**Bối cảnh:** mọi tính năng học chạy được local; AI gọi trực tiếp bằng key user.
**Quyết định:** M1–M2 hoàn toàn không server. Sync + push = Supabase ở Phase 8. Ngoại lệ được phép: Cloudflare Worker *stateless* làm CORS proxy (D11) — không phải "backend có dữ liệu".
**Hệ quả:** import/export thủ công cho đến Phase 8; không thu thập được telemetry (chấp nhận — xem ARCHITECTURE §12).

## D3 — Copy code từ extension, không monorepo
**Bối cảnh:** extension ổn định, đang chạy; gộp workspace CRXJS + PWA tốn công cấu hình.
**Quyết định:** port bằng copy vào `src/core/` + `services/`, ghi nguồn gốc. Bảng mapping: ARCHITECTURE §6.
**Xét lại khi:** sau Phase 8 (hai bên cùng cần sync client) hoặc khi một fix logic phải sửa 2 chỗ quá 3 lần.

## D4 — FSRS thay SM-2
**Bối cảnh:** SM-2 lite của extension hoạt động nhưng lỗi thời; FSRS giảm ~20-30% số lần ôn (Anki đã chuyển mặc định).
**Quyết định:** `ts-fsrs` từ Phase 2. Thẻ SM-2 import được map xấp xỉ sang state FSRS; field SM-2 giữ nguyên để export ngược.
**Hệ quả:** lịch ôn hai bên (app/extension) sẽ lệch nhau cho đến khi extension cũng chuyển (cân nhắc ở Phase 8).

## D5 — Open-data-first, AI-second
**Bối cảnh:** phần lớn "nội dung học" (câu ví dụ, IPA, audio, bài đọc/nghe) có nguồn mở chất lượng cao, 0 token, offline được.
**Quyết định:** AI chỉ cho cá nhân hóa + dịch fallback + chấm/feedback. Danh mục nguồn + license: [DATA.md](DATA.md). Không thêm nguồn ngoài danh mục khi chưa kiểm license.
**Hệ quả:** thêm pipeline `scripts/data/` phải maintain; đổi lại app dùng được không cần key AI (trừ tính năng AI).

## D6 — IndexedDB + localStorage
**Quyết định:** IndexedDB (qua `idb`) cho cards/packs/sessions/dict/mistakes/meta; localStorage cho settings (đọc đồng bộ khi boot, tránh flash theme). Schema versioning: ARCHITECTURE §9.

## D7 — Vanilla CSS + design tokens
**Bối cảnh:** extension dùng vanilla CSS + tokens; hai app nên cùng ngôn ngữ thị giác.
**Quyết định:** không Tailwind/CSS-in-JS. Tokens hợp nhất trong `styles/tokens.css` (DESIGN.md §2).

## D8 — Tương thích `VocabCard` 100%
**Quyết định:** import/export không mất field nào của extension; field mới chỉ được thêm dạng optional. Đây là ràng buộc cứng — unit test bảo vệ (Phase 1 AC).
**Lý do:** dữ liệu học là tài sản của user; extension và app phải đổi dữ liệu cho nhau được vô điều kiện.

## D9 — Gamification nhẹ, không leagues
**Bối cảnh:** research về Duolingo: streak hiệu quả (loss aversion), leagues gây lo âu/áp lực; app cá nhân không có ý nghĩa xếp hạng.
**Quyết định:** streak + freeze, XP/level, badges, daily quests (backlog). Không leagues, không social. Đã ghi vào IDEAS.md mục Rejected.

## D10 — FVDP (GPL) chưa dùng
**Bối cảnh:** từ điển EN-VI mở tốt nhất nhưng GPL; bundle data GPL có thể kéo nghĩa vụ license cho app.
**Quyết định:** nghĩa VI lấy từ Wiktionary/Tatoeba/AI. Chỉ mở lại khi thiếu thật sự — cập nhật mục này trước khi dùng.

## D11 — Hosting: Cloudflare Pages + Worker (proposed)
**Bối cảnh:** cần host tĩnh miễn phí, nhanh ở VN, HTTPS (bắt buộc cho PWA/SW), và chỗ đặt CORS proxy cho VOA (DATA.md §5a).
**Đề xuất:** Cloudflare Pages (deploy từ git, free) + 1 Worker stateless cho proxy. Thay thế tương đương: GitHub Pages (không có Worker) / Vercel.
**Chốt khi:** bắt đầu Phase 0 (Pages) và Phase 5 (Worker).

## D12 — Mistake Notebook là store trung tâm
**Bối cảnh:** lỗi của user phát sinh rải rác ở dictation, speaking, writing, quiz — mỗi nơi tự xử lý thì vòng lặp học đứt.
**Quyết định:** một store `mistakes` duy nhất (schema: ARCHITECTURE §3.2); mọi tính năng chấm lỗi đều ghi vào đó từ khi tính năng đó ra đời (dictation Phase 6, speaking Phase 7, writing Phase 9); màn hình ôn lỗi làm ở Phase 9.
**Hệ quả:** `weakWords` hiện tại trở thành view rút gọn của `mistakes` (giữ key cũ trong `meta` để tương thích extension).
