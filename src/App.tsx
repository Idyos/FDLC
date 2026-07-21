import './App.css';
import { ThemeProvider } from './components/Theme/theme-provider';
import { Routes, Route } from 'react-router-dom';

// Páginas públicas
import PenyaPage from './pages/public/PenyaPage/penyaPage';

// Páginas admin
import Login from './pages/admin/Login/Login';
import Dashboard from './pages/admin/Dashboard/Dashboard';
import { YearProvider } from './components/shared/Contexts/YearContext';
import MainPage from './pages/public/MainPage/mainPage';
import ProvaPage from './pages/public/ProvaPage/provaPage';
import { AdminRoutes } from './routes/admin/AdminRoutes';
import { AuthProvider } from './routes/admin/AuthContext';
import { FavoritePenyesProvider } from './components/shared/Contexts/FavoritePenyesContext';
import PublicHeader from './components/public/PublicHeader/publicHeader';
import AdminSidebar from './components/admin/AdminSiderbar';
import CreateOrEditProva from './pages/admin/createProva/createOrEditProva';
import PublicBottomNavigation from './components/public/BottomNavBar/publicBottomNavigation';

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
      <PublicBottomNavigation />
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
              <Route element={<AdminRoutes><AdminSidebar /></AdminRoutes>}>
                <Route path="/admin" element={<Dashboard />} />
                <Route path="/admin/prova" element={<ProvaPage />} />
              </Route>
              <Route path="/admin/createProva" element={<AdminRoutes><CreateOrEditProva /></AdminRoutes>} />
              <Route path="/admin/editProva" element={<AdminRoutes><CreateOrEditProva /></AdminRoutes>} />
            </Routes>
          </FavoritePenyesProvider>
        </YearProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
