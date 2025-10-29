import './App.css';
import { ThemeProvider } from './components/Theme/theme-provider';
import { ModeToggle } from './components/Theme/mode-toggle';
import { Routes, Route } from 'react-router-dom';

// Páginas públicas
import PenyaPage from './pages/public/PenyaPage/penyaPage';

// Páginas admin
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Penyes from './pages/admin/Penyes';
import Proves from './pages/admin/Proves';
import { YearProvider } from './components/shared/Contexts/YearContext';
import CreateProva from './pages/admin/createProva/createProva';
import BracketTest from './pages/public/BracketTestPackage/BracketTest';
import MainPage from './pages/public/MainPage/mainPage';
import ProvaPage from './pages/public/ProvaPage/provaPage';
import { AdminRoutes } from './routes/admin/AdminRoutes';
import { AuthProvider } from './routes/admin/AuthContext';

// Protección de rutas
// import { AdminRoutes } from './routes/admin/AdminRoutes';

export default function App() {
  // const location = useLocation();
  // const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <YearProvider>
        <ModeToggle />
        <Routes>
          {/* Public */}
          <Route path="/" element={<MainPage />} />
          <Route path="/penya" element={<PenyaPage />} />
          <Route path="/prova" element={<ProvaPage />} />
          <Route path="/bracket" element={<BracketTest />} />

          {/* Admin */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminRoutes><Dashboard /></AdminRoutes>} />
          <Route path="/admin/penyes" element={<AdminRoutes><Penyes /></AdminRoutes>} />
          <Route path="/admin/proves" element={<AdminRoutes><Proves /></AdminRoutes>} />
          <Route path="/admin/prova" element={<AdminRoutes><ProvaPage /></AdminRoutes>} />
          <Route path="/admin/createProva" element={<AdminRoutes><CreateProva /></AdminRoutes>} />

        </Routes>
        </YearProvider>
      </AuthProvider>
    </ThemeProvider>

  );
}