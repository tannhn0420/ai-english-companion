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
  homeDeckEmptyHint: 'Import từ extension hoặc thêm thẻ đầu tiên ở Phase 1.',
  homeReviewNow: '▶ Ôn ngay',
  homeQuiz: 'Quiz',
  homePractice: 'Luyện tập',

  // Study hub
  studyTitle: 'Ôn tập',
  studyReview: 'Ôn thẻ (SRS)',
  studyQuizCloze: 'Quiz & Cloze',
  studyDeck: 'Quản lý Deck',
  studyMistakes: 'Ôn lỗi (sổ tay lỗi)',

  // Practice hub
  practiceTitle: 'Luyện',
  practiceTopic: 'Practice theo chủ đề',
  practiceListen: 'Nghe (VOA / packs)',
  practiceDictation: 'Nghe chép chính tả',
  practiceSpeaking: 'Luyện nói',
  practiceJournal: 'Nhật ký + AI sửa',
  practiceMissions: 'Hội thoại nhiệm vụ',

  // Settings
  settingsTitle: 'Cài đặt',
  settingsAppearance: 'Giao diện',
  settingsTheme: 'Theme',
  settingsThemeDark: '🌙 Tối',
  settingsThemeLight: '☀️ Sáng',
  settingsThemeSwitch: 'đổi',
  settingsLanguage: 'Ngôn ngữ',
  settingsVoice: 'Phát âm (giọng, tốc độ)',
  settingsAI: 'AI (provider, API key)',
  settingsLearning: 'Học tập (mục tiêu ngày)',
  settingsData: 'Dữ liệu (import/export/backup)',
  settingsCredits: 'Nguồn dữ liệu & ghi công',

  // Coming soon / not found
  soonReview: 'Ôn thẻ (SRS)',
  soonQuiz: 'Quiz',
  soonBody: 'Tính năng này sẽ có ở {phase} — xem docs/PHASES.md.',
  notFoundTitle: 'Không tìm thấy trang',
  notFoundBody: 'Đường dẫn không tồn tại.',
  backHome: '← Về Home',
} as const;
