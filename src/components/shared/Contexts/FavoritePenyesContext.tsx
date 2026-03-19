import { createContext, useContext, useState, useEffect } from "react";
import { FavoritePenya } from "@/interfaces/interfaces";
import { useYear } from "@/components/shared/Contexts/YearContext";

const STORAGE_KEY = "fdlc-favorite-penyes";
const MAX_FAVORITES = 3;

type FavoritesByYear = Record<string, FavoritePenya[]>;

interface FavoritePenyesContextType {
  favoritePenyes: FavoritePenya[];
  addFavoritePenya: (penya: FavoritePenya) => void;
  removeFavoritePenya: (id: string) => void;
  clearFavoritePenyes: () => void;
  isFavorite: (id: string) => boolean;
  isFull: boolean;
}

const FavoritePenyesContext = createContext<FavoritePenyesContextType | null>(null);

export function FavoritePenyesProvider({ children }: { children: React.ReactNode }) {
  const { selectedYear } = useYear();

  const [allFavorites, setAllFavorites] = useState<FavoritesByYear>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allFavorites));
  }, [allFavorites]);

  const favoritePenyes = allFavorites[selectedYear] ?? [];

  function setYearFavorites(updater: (prev: FavoritePenya[]) => FavoritePenya[]) {
    setAllFavorites((prev) => ({
      ...prev,
      [selectedYear]: updater(prev[selectedYear] ?? []),
    }));
  }

  function addFavoritePenya(penya: FavoritePenya) {
    setYearFavorites((prev) => {
      if (prev.length >= MAX_FAVORITES) return prev;
      if (prev.some((f) => f.id === penya.id)) return prev;
      return [...prev, penya];
    });
  }

  function removeFavoritePenya(id: string) {
    setYearFavorites((prev) => prev.filter((f) => f.id !== id));
  }

  function clearFavoritePenyes() {
    setYearFavorites(() => []);
  }

  function isFavorite(id: string) {
    return favoritePenyes.some((f) => f.id === id);
  }

  return (
    <FavoritePenyesContext.Provider
      value={{
        favoritePenyes,
        addFavoritePenya,
        removeFavoritePenya,
        clearFavoritePenyes,
        isFavorite,
        isFull: favoritePenyes.length >= MAX_FAVORITES,
      }}
    >
      {children}
    </FavoritePenyesContext.Provider>
  );
}

export function useFavoritePenyes() {
  const ctx = useContext(FavoritePenyesContext);
  if (!ctx) throw new Error("useFavoritePenyes must be used inside FavoritePenyesProvider");
  return ctx;
}
