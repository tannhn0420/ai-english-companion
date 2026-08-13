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
  homeDeckEmptyHint: 'Import from the extension or add your first card.',
  homeDue: '{n} words due for review today',
  homeNoDue: 'Nothing due — nice!',
  homeTotal: '{n} cards in your wordbook',
  homeReviewNow: '▶ Review now',
  homeQuiz: 'Quiz',
  homePractice: 'Practice',
  homeAddWords: '＋ Add words',

  // Study hub
  studyTitle: 'Review',
  studyReview: 'Flashcards (SRS)',
  studyQuizCloze: 'Quiz & cloze',
  studyDeck: 'Wordbook (deck)',
  studyMistakes: 'Review mistakes',

  // Practice hub
  practiceTitle: 'Practice',
  practiceTopic: 'Practice by topic',
  practiceListen: 'Listen (VOA / packs)',
  practiceDictation: 'Dictation',
  practiceSpeaking: 'Speaking',
  practiceJournal: 'Journal + AI feedback',
  practiceMissions: 'Conversation missions',

  // Deck
  deckTitle: 'Wordbook',
  deckCards: '{n} cards',
  deckSearch: 'Search term or meaning…',
  deckAllTopics: 'All topics',
  deckDueBadge: 'due',
  deckAdd: 'Add card',
  deckEdit: 'Edit card',
  deckImport: '⬆️ Import',
  deckExportJson: '⬇️ JSON',
  deckExportCsv: '⬇️ CSV',
  deckExportAnki: '⬇️ Anki',
  deckImportDone: 'Added {added} cards, skipped {skipped}',
  deckImportFail: 'Could not read file — JSON/CSV/TSV only',
  deckDeleteConfirm: 'Delete card "{term}"?',
  deckEmptyTitle: 'Your wordbook is empty.',
  deckEmptyHint: 'Import your extension export, or tap ＋ to add a first card.',

  // Card form
  formTerm: 'Term / phrase',
  formMeaning: 'Meaning (Vietnamese)',
  formIpa: 'IPA',
  formExample: 'Example',
  formTopic: 'Topic',
  formAutoFill: '✨ Auto-fill from dictionary',
  formAutoFillMiss: 'Not found in the dictionary',
  formAutoFillOffline: 'Internet needed to look up new words',
  formDefsHint: 'English definitions (reference):',
  formSave: 'Save card',
  formCancel: 'Cancel',
  formDelete: 'Delete',
  listen: 'Listen',

  // Settings
  settingsTitle: 'Settings',
  settingsAppearance: 'Appearance',
  settingsTheme: 'Theme',
  settingsThemeDark: '🌙 Dark',
  settingsThemeLight: '☀️ Light',
  settingsThemeSwitch: 'switch',
  settingsLanguage: 'Language',
  settingsVoice: 'Speech',
  settingsVoiceEn: 'English voice',
  settingsVoiceVi: 'Vietnamese voice',
  settingsVoiceAuto: 'Auto (most natural)',
  settingsRate: 'Speech rate',
  settingsVoiceTest: '🔊 Test',
  settingsAI: 'AI (provider, API key)',
  settingsLearning: 'Learning (daily goal)',
  settingsData: 'Data',
  settingsBackup: '⬇️ Download backup (JSON)',
  settingsRestore: '⬆️ Restore / import file',
  settingsClear: '🗑️ Delete all cards',
  settingsClearConfirm: 'Delete all {n} cards? This cannot be undone.',
  settingsCredits: 'Data sources & credits',
  settingsCreditsIntro: 'This app is built on these open data sources — thank you:',

  // Toasts
  toastSaved: 'Saved',
  toastDeleted: 'Deleted',

  // Coming soon / not found
  soonReview: 'Flashcards (SRS)',
  soonQuiz: 'Quiz',
  soonBody: 'This feature ships in {phase} — see docs/PHASES.md.',
  notFoundTitle: 'Page not found',
  notFoundBody: 'This path does not exist.',
  backHome: '← Back to Home',
};
