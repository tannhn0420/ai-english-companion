import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import MiniPlayer from './components/MiniPlayer';
import TabBar from './components/TabBar';
import { syncNow } from './services/sync';
import DeckScreen from './screens/Deck/DeckScreen';
import HomeScreen from './screens/Home/HomeScreen';
import StudyHub from './screens/Study/StudyHub';
import PracticeHub from './screens/Practice/PracticeHub';
import DictationScreen from './screens/Dictation/DictationScreen';
import JournalScreen from './screens/Journal/JournalScreen';
import ListenScreen from './screens/Listen/ListenScreen';
import MistakesScreen from './screens/Mistakes/MistakesScreen';
import PracticeTopicScreen from './screens/Practice/PracticeTopicScreen';
import ProgressScreen from './screens/Progress/ProgressScreen';
import QuizScreen from './screens/Quiz/QuizScreen';
import ReviewScreen from './screens/Review/ReviewScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import ShareScreen from './screens/ShareScreen';
import VocabTestScreen from './screens/VocabTest/VocabTestScreen';
import ComingSoon from './screens/ComingSoon';

export default function App() {
  // Sync khi mở app (đã đăng nhập thì kéo/đẩy, chưa thì thoát êm)
  useEffect(() => {
    void syncNow().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/study" element={<StudyHub />} />
            <Route path="/deck" element={<DeckScreen />} />
            <Route path="/practice" element={<PracticeHub />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/review" element={<ReviewScreen />} />
            <Route path="/quiz" element={<QuizScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/practice/topic" element={<PracticeTopicScreen />} />
            <Route path="/listen" element={<ListenScreen />} />
            <Route path="/dictation" element={<DictationScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="/mistakes" element={<MistakesScreen />} />
            <Route path="/vocabtest" element={<VocabTestScreen />} />
            <Route path="/share" element={<ShareScreen />} />
            <Route path="*" element={<ComingSoon titleKey="notFoundTitle" />} />
          </Routes>
        </main>
        <MiniPlayer />
        <TabBar />
      </div>
    </BrowserRouter>
  );
}
