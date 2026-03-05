import { createContext, useContext, useState, useEffect } from "react";
import { FavoritePenya } from "@/interfaces/interfaces";

const STORAGE_KEY = "fdlc-favorite-penyes";
const MAX_FAVORITES = 3;

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
  const [favoritePenyes, setFavoritePenyes] = useState<FavoritePenya[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoritePenyes));
  }, [favoritePenyes]);

  function addFavoritePenya(penya: FavoritePenya) {
    setFavoritePenyes((prev) => {
      if (prev.length >= MAX_FAVORITES) return prev;
      if (prev.some((f) => f.id === penya.id)) return prev;
      return [...prev, penya];
    });
  }

  function removeFavoritePenya(id: string) {
    setFavoritePenyes((prev) => prev.filter((f) => f.id !== id));
  }

  function clearFavoritePenyes() {
    setFavoritePenyes([]);
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
