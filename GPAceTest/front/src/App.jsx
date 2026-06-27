import { BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import './index.css';
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import CoursePlannerPage from './pages/CoursePlannerPage';
import FgoPlannerPage from './pages/FgoPlannerPage';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursePlannerPage />} />
          <Route path="/fgo" element={<FgoPlannerPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
    </Router>
  );
}

export default App;
