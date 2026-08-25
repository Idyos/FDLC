import './App.css';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from './components/Theme/theme-provider';
import { Routes, Route } from 'react-router-dom';
import { YearProvider } from './components/shared/Contexts/YearContext';
import { AdminRoutes } from './routes/admin/AdminRoutes';
import { AuthProvider } from './routes/admin/AuthContext';
import { FavoritePenyesProvider } from './components/shared/Contexts/FavoritePenyesContext';
import PublicHeader from './components/public/PublicHeader/publicHeader';
import PublicBottomNavigation from './components/public/BottomNavBar/publicBottomNavigation';
import PublicSideNavigation from './components/public/SideNavBar/publicSideNavigation';
import PublicFooter from './components/public/Footer/publicFooter';
import DonationButton from './components/public/donationButton';
import LoadingAnimation from './components/shared/loadingAnim';
import ScrollToTop from './components/shared/ScrollToTop';

// Páginas públicas — cada una en su propio chunk
const MainPage = lazy(() => import('./pages/public/MainPage/mainPage'));
const PenyaPage = lazy(() => import('./pages/public/PenyaPage/penyaPage'));
const ProvaPage = lazy(() => import('./pages/public/ProvaPage/provaPage'));

// Páginas admin — quedan fuera del bundle público (incluye xlsx, jszip, framer-motion admin, etc.)
const Login = lazy(() => import('./pages/admin/Login/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard/Dashboard'));
const AdminSidebar = lazy(() => import('./components/admin/AdminSiderbar'));
const CreateOrEditProva = lazy(() => import('./pages/admin/createProva/createOrEditProva'));

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicSideNavigation />
      <div className="md:pl-24 min-h-screen flex flex-col">
        <PublicHeader />
        {children}
        <div className="px-4 mt-6">
          <DonationButton />
        </div>
      </div>
      <PublicFooter />
      <PublicBottomNavigation />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <YearProvider>
          <FavoritePenyesProvider>
            <ScrollToTop />
            <Suspense fallback={<LoadingAnimation />}>
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
            </Suspense>
          </FavoritePenyesProvider>
        </YearProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
