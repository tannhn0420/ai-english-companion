import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import DeckScreen from './screens/Deck/DeckScreen';
import HomeScreen from './screens/Home/HomeScreen';
import StudyHub from './screens/Study/StudyHub';
import PracticeHub from './screens/Practice/PracticeHub';
import QuizScreen from './screens/Quiz/QuizScreen';
import ReviewScreen from './screens/Review/ReviewScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import ComingSoon from './screens/ComingSoon';

export default function App() {
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
            <Route path="*" element={<ComingSoon titleKey="notFoundTitle" />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </BrowserRouter>
  );
}
