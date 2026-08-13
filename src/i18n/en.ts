import type { vi } from './vi';

/** English — phải đủ mọi key của vi.ts (type-check ép buộc, D13). */
export const en: Record<keyof typeof vi, string> = {
  // Tabs
  tabHome: 'Home',
  tabStudy: 'Review',
  tabPractice: 'Practice',
  tabSettings: 'Settings',

  // Home
  homeDeckEmpty: 'Your wordbook is on its first page.',
  homeDeckEmptyHint: 'Import from the extension or add your first card in Phase 1.',
  homeReviewNow: '▶ Review now',
  homeQuiz: 'Quiz',
  homePractice: 'Practice',

  // Study hub
  studyTitle: 'Review',
  studyReview: 'Flashcards (SRS)',
  studyQuizCloze: 'Quiz & cloze',
  studyDeck: 'Manage deck',
  studyMistakes: 'Review mistakes',

  // Practice hub
  practiceTitle: 'Practice',
  practiceTopic: 'Practice by topic',
  practiceListen: 'Listen (VOA / packs)',
  practiceDictation: 'Dictation',
  practiceSpeaking: 'Speaking',
  practiceJournal: 'Journal + AI feedback',
  practiceMissions: 'Conversation missions',

  // Settings
  settingsTitle: 'Settings',
  settingsAppearance: 'Appearance',
  settingsTheme: 'Theme',
  settingsThemeDark: '🌙 Dark',
  settingsThemeLight: '☀️ Light',
  settingsThemeSwitch: 'switch',
  settingsLanguage: 'Language',
  settingsVoice: 'Speech (voice, rate)',
  settingsAI: 'AI (provider, API key)',
  settingsLearning: 'Learning (daily goal)',
  settingsData: 'Data (import/export/backup)',
  settingsCredits: 'Data sources & credits',

  // Coming soon / not found
  soonReview: 'Flashcards (SRS)',
  soonQuiz: 'Quiz',
  soonBody: 'This feature ships in {phase} — see docs/PHASES.md.',
  notFoundTitle: 'Page not found',
  notFoundBody: 'This path does not exist.',
  backHome: '← Back to Home',
};
