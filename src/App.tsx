import './App.css';
import { ThemeProvider } from './components/Theme/theme-provider';
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
import MainPage from './pages/public/MainPage/mainPage';
import ProvaPage from './pages/public/ProvaPage/provaPage';
import { AdminRoutes } from './routes/admin/AdminRoutes';
import { AuthProvider } from './routes/admin/AuthContext';
import { FavoritePenyesProvider } from './components/shared/Contexts/FavoritePenyesContext';
import PublicHeader from './components/public/PublicHeader/publicHeader';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <YearProvider>
          <FavoritePenyesProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<PublicLayout><MainPage /></PublicLayout>} />
              <Route path="/penya" element={<PublicLayout><PenyaPage /></PublicLayout>} />
              <Route path="/prova" element={<PublicLayout><ProvaPage /></PublicLayout>} />

              {/* Admin */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<AdminRoutes><Dashboard /></AdminRoutes>} />
              <Route path="/admin/penyes" element={<AdminRoutes><Penyes /></AdminRoutes>} />
              <Route path="/admin/proves" element={<AdminRoutes><Proves /></AdminRoutes>} />
              <Route path="/admin/prova" element={<AdminRoutes><ProvaPage /></AdminRoutes>} />
              <Route path="/admin/createProva" element={<AdminRoutes><CreateProva /></AdminRoutes>} />
            </Routes>
          </FavoritePenyesProvider>
        </YearProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
