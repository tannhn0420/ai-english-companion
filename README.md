# AI English Companion

Web app (PWA) học tiếng Anh mọi lúc — trên điện thoại lẫn máy tính. Là **companion app** của [ai-translator-ext](../ai-translator-ext/) (Chrome Extension):

- **Extension** = nơi *thu thập*: lưu từ vựng khi đọc web, dịch, hover-gloss.
- **Web app này** = nơi *ôn luyện*: flashcards SRS, quiz, luyện nghe/nói/chép chính tả, gamification — dùng được offline, cài lên màn hình chính điện thoại.

## Trạng thái

🚧 **Đang ở giai đoạn planning.** Chưa có code — đọc tài liệu trong `docs/` trước khi bắt đầu.

| Tài liệu | Nội dung |
|---|---|
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Mục tiêu, user stories, phạm vi MVP, non-goals |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, cấu trúc thư mục, data model, chiến lược sync |
| [docs/PHASES.md](docs/PHASES.md) | Roadmap theo phase, tasks + acceptance criteria |
| [docs/DESIGN.md](docs/DESIGN.md) | UI/UX spec mobile-first, màn hình, design tokens |
| [docs/DATA.md](docs/DATA.md) | Nguồn dữ liệu mở (Tatoeba, NGSL, Wiktionary, VOA…), license, pipeline bundle |
| [docs/IDEAS.md](docs/IDEAS.md) | Ngân hàng ý tưởng + chấm điểm ưu tiên (backlog/icebox/rejected) |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Log quyết định kiến trúc (ADR-lite) — đọc trước khi muốn "làm khác đi" |

## Nguyên tắc cốt lõi

1. **Học được trong 2 phút** — mở app là ôn được ngay, không setup, không menu rườm rà.
2. **Offline-first** — deck từ vựng nằm trong IndexedDB, ôn tập không cần mạng; chỉ tính năng AI mới cần mạng.
3. **Dữ liệu tương thích extension** — import/export JSON dùng chung schema `VocabCard`, không lock-in.
4. **Không backend ở MVP** — API key AI do người dùng tự cung cấp, gọi trực tiếp từ browser. Cloud sync là phase sau.
