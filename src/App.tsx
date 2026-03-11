import './App.css';
import { ThemeProvider } from './components/Theme/theme-provider';
import { Routes, Route } from 'react-router-dom';

// Páginas públicas
import PenyaPage from './pages/public/PenyaPage/penyaPage';

// Páginas admin
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import { YearProvider } from './components/shared/Contexts/YearContext';
import CreateProva from './pages/admin/createProva/createProva';
import EditProva from './pages/admin/editProva/editProva';
import MainPage from './pages/public/MainPage/mainPage';
import ProvaPage from './pages/public/ProvaPage/provaPage';
import { AdminRoutes } from './routes/admin/AdminRoutes';
import { AuthProvider } from './routes/admin/AuthContext';
import { FavoritePenyesProvider } from './components/shared/Contexts/FavoritePenyesContext';
import PublicHeader from './components/public/PublicHeader/publicHeader';
import AdminLayout from './components/admin/AdminLayout';

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
              <Route element={<AdminRoutes><AdminLayout /></AdminRoutes>}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/prova" element={<ProvaPage />} />
              </Route>
              <Route path="/admin/createProva" element={<AdminRoutes><CreateProva /></AdminRoutes>} />
              <Route path="/admin/editProva" element={<AdminRoutes><EditProva /></AdminRoutes>} />
            </Routes>
          </FavoritePenyesProvider>
        </YearProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
