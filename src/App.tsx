import './App.css';
import { ThemeProvider } from './components/Theme/theme-provider';
import { ModeToggle } from './components/Theme/mode-toggle';
import { Routes, Route, useLocation } from 'react-router-dom';

// Páginas públicas
import PenyaPage from './pages/public/PenyaPage/penyaPage';
import RankingPage from './pages/public/Ranking/rankingPage';

// Páginas admin
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Penyes from './pages/admin/Penyes';
import Proves from './pages/admin/Proves';
import { YearProvider } from './components/shared/YearContext';
import CreateProva from './pages/admin/createProva/createProva';

// Protección de rutas
// import { AdminRoutes } from './routes/admin/AdminRoutes';

export default function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <YearProvider>
      <ModeToggle />
      <Routes>
        {/* Public */}
        <Route path="/" element={<RankingPage />} />
        <Route path="/penya" element={<PenyaPage />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/penyes" element={<Penyes />} />
        <Route path="/admin/proves" element={<Proves />}/>
        <Route path="/admin/createProva" element={<CreateProva />}/>
        {/* <Route path="/admin" element={<AdminRoutes><Dashboard /></AdminRoutes>} />
        <Route path="/admin/penyes" element={<AdminRoutes><Penyes /></AdminRoutes>} />
        <Route path="/admin/proves" element={<AdminRoutes><Proves /></AdminRoutes>} /> */}
      </Routes>
      </YearProvider>
    </ThemeProvider>

  );
}