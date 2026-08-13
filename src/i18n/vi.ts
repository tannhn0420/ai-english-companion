/**
 * Tiếng Việt — locale mặc định và là NGUỒN CHÂN LÝ của key (D13).
 * Thêm string mới ở đây trước; en.ts bị type-check phải đủ key.
 */
export const vi = {
  // Tabs
  tabHome: 'Home',
  tabStudy: 'Ôn tập',
  tabPractice: 'Luyện',
  tabSettings: 'Cài đặt',

  // Home
  homeDeckEmpty: 'Sổ từ của bạn đang mở trang đầu tiên.',
  homeDeckEmptyHint: 'Import từ extension hoặc thêm thẻ đầu tiên.',
  homeDue: 'Hôm nay có {n} từ đến hạn ôn',
  homeNoDue: 'Không còn thẻ đến hạn — tuyệt!',
  homeTotal: '{n} thẻ trong sổ',
  homeReviewNow: '▶ Ôn ngay',
  homeQuiz: 'Quiz',
  homePractice: 'Luyện tập',
  homeAddWords: '＋ Thêm từ',

  // Study hub
  studyTitle: 'Ôn tập',
  studyReview: 'Ôn thẻ (SRS)',
  studyQuizCloze: 'Quiz & Cloze',
  studyDeck: 'Sổ từ (Deck)',
  studyMistakes: 'Ôn lỗi (sổ tay lỗi)',

  // Practice hub
  practiceTitle: 'Luyện',
  practiceTopic: 'Practice theo chủ đề',
  practiceListen: 'Nghe (VOA / packs)',
  practiceDictation: 'Nghe chép chính tả',
  practiceSpeaking: 'Luyện nói',
  practiceJournal: 'Nhật ký + AI sửa',
  practiceMissions: 'Hội thoại nhiệm vụ',

  // Deck
  deckTitle: 'Sổ từ',
  deckCards: '{n} thẻ',
  deckSearch: 'Tìm từ hoặc nghĩa…',
  deckAllTopics: 'Mọi chủ đề',
  deckDueBadge: 'đến hạn',
  deckAdd: 'Thêm thẻ',
  deckEdit: 'Sửa thẻ',
  deckImport: '⬆️ Import',
  deckExportJson: '⬇️ JSON',
  deckExportCsv: '⬇️ CSV',
  deckExportAnki: '⬇️ Anki',
  deckImportDone: 'Đã thêm {added} thẻ, bỏ qua {skipped}',
  deckImportFail: 'File không đọc được — cần JSON/CSV/TSV',
  deckDeleteConfirm: 'Xóa thẻ "{term}"?',
  deckEmptyTitle: 'Sổ từ đang trống.',
  deckEmptyHint: 'Import file export từ extension, hoặc bấm ＋ thêm thẻ đầu tiên.',

  // Card form
  formTerm: 'Từ / cụm từ',
  formMeaning: 'Nghĩa (tiếng Việt)',
  formIpa: 'IPA',
  formExample: 'Ví dụ',
  formTopic: 'Chủ đề',
  formAutoFill: '✨ Tự điền từ từ điển',
  formAutoFillMiss: 'Không thấy trong từ điển',
  formAutoFillOffline: 'Cần mạng để tra từ mới',
  formDefsHint: 'Nghĩa tiếng Anh (tham khảo):',
  formSave: 'Lưu thẻ',
  formCancel: 'Hủy',
  formDelete: 'Xóa',
  listen: 'Nghe',

  // Settings
  settingsTitle: 'Cài đặt',
  settingsAppearance: 'Giao diện',
  settingsTheme: 'Theme',
  settingsThemeDark: '🌙 Tối',
  settingsThemeLight: '☀️ Sáng',
  settingsThemeSwitch: 'đổi',
  settingsLanguage: 'Ngôn ngữ',
  settingsVoice: 'Phát âm',
  settingsVoiceEn: 'Giọng tiếng Anh',
  settingsVoiceVi: 'Giọng tiếng Việt',
  settingsVoiceAuto: 'Tự chọn giọng tự nhiên nhất',
  settingsRate: 'Tốc độ đọc',
  settingsVoiceTest: '🔊 Nghe thử',
  settingsAI: 'AI (provider, API key)',
  settingsLearning: 'Học tập (mục tiêu ngày)',
  settingsData: 'Dữ liệu',
  settingsBackup: '⬇️ Tải backup (JSON)',
  settingsRestore: '⬆️ Khôi phục / import file',
  settingsClear: '🗑️ Xóa toàn bộ thẻ',
  settingsClearConfirm: 'Xóa toàn bộ {n} thẻ? Không hoàn tác được.',
  settingsCredits: 'Nguồn dữ liệu & ghi công',
  settingsCreditsIntro: 'App dùng các nguồn dữ liệu mở sau — xin cảm ơn cộng đồng:',

  // Toasts
  toastSaved: 'Đã lưu',
  toastDeleted: 'Đã xóa',

  // Coming soon / not found
  soonReview: 'Ôn thẻ (SRS)',
  soonQuiz: 'Quiz',
  soonBody: 'Tính năng này sẽ có ở {phase} — xem docs/PHASES.md.',
  notFoundTitle: 'Không tìm thấy trang',
  notFoundBody: 'Đường dẫn không tồn tại.',
  backHome: '← Về Home',
} as const;
