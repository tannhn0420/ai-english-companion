import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TabBar from './components/TabBar';
import HomeScreen from './screens/Home/HomeScreen';
import StudyHub from './screens/Study/StudyHub';
import PracticeHub from './screens/Practice/PracticeHub';
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
            <Route path="/practice" element={<PracticeHub />} />
            <Route path="/settings" element={<SettingsScreen />} />
            {/* Đích của manifest shortcuts — thành màn thật ở Phase 2 */}
            <Route path="/review" element={<ComingSoon titleKey="soonReview" phase="Phase 2" />} />
            <Route path="/quiz" element={<ComingSoon titleKey="soonQuiz" phase="Phase 2" />} />
            <Route path="*" element={<ComingSoon titleKey="notFoundTitle" />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </BrowserRouter>
  );
}
