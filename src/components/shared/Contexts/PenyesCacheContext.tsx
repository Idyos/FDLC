// PenyesCacheContext.tsx
import { create } from "zustand";
import { useEffect } from "react";
import { PenyaInfo } from "@/interfaces/interfaces";
import { getPenyesNames } from "@/services/database/publicDbService";
import { useYear } from "@/components/shared/Contexts/YearContext";

interface PenyesCacheState {
  year: number | null;
  loadingYear: number | null;
  penyesById: Record<string, PenyaInfo>;
  setPenyes: (year: number, penyes: PenyaInfo[]) => void;
  ensureLoaded: (year: number) => void;
}

/** Shared, app-wide knowledge of `Penyes` (name/image) for the selected year.
 *  Nothing subscribes on its own: whoever already fetches the full list for
 *  other reasons (the ranking on MainPage, the admin Dashboard) feeds it via
 *  `setPenyes` as a side effect. `ensureLoaded` is only the fallback for a
 *  screen that needs it (e.g. someone landing straight on a prova link) when
 *  nobody has populated it yet — a single one-shot fetch, deduped so several
 *  components mounting at once don't each trigger their own. */
export const usePenyesCacheStore = create<PenyesCacheState>((set, get) => ({
  year: null,
  loadingYear: null,
  penyesById: {},
  setPenyes: (year, penyes) =>
    set({ year, loadingYear: null, penyesById: Object.fromEntries(penyes.map((p) => [p.id, p])) }),
  ensureLoaded: (year) => {
    const state = get();
    if (state.year === year || state.loadingYear === year) return;
    set({ loadingYear: year });
    getPenyesNames(year).then((data) => get().setPenyes(year, data));
  },
}));

export function usePenyesCache() {
  const { selectedYear } = useYear();
  const penyesById = usePenyesCacheStore((s) => s.penyesById);
  const cachedYear = usePenyesCacheStore((s) => s.year);
  const ensureLoaded = usePenyesCacheStore((s) => s.ensureLoaded);

  useEffect(() => {
    ensureLoaded(selectedYear);
  }, [selectedYear, ensureLoaded]);

  const penyes = cachedYear === selectedYear ? Object.values(penyesById) : [];

  return { penyes, penyesById };
}
