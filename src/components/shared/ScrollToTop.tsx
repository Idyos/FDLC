import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const STORAGE_KEY = 'scroll-positions';
const MAX_RETRY_ATTEMPTS = 30;

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function savePosition(key: string, y: number) {
  const positions = readPositions();
  positions[key] = y;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
}

export default function ScrollToTop() {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const targetY = navigationType === 'POP' ? (readPositions()[location.key] ?? 0) : 0;

    let rafId: number;
    let attempts = 0;

    // El contenido (Firestore) puede seguir cargando, así que reintentamos
    // unos frames hasta que la página tenga altura suficiente para el destino.
    const tryScroll = () => {
      window.scrollTo(0, targetY);
      attempts++;
      const reachable = document.documentElement.scrollHeight - window.innerHeight >= targetY;
      if (!reachable && attempts < MAX_RETRY_ATTEMPTS) {
        rafId = requestAnimationFrame(tryScroll);
      }
    };
    tryScroll();

    return () => {
      cancelAnimationFrame(rafId);
      savePosition(location.key, window.scrollY);
    };
  }, [location.key, navigationType]);

  return null;
}
