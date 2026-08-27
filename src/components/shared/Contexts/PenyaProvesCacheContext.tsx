// PenyaProvesCacheContext.tsx
import { create } from "zustand";
import { useEffect } from "react";
import { PenyaProvaSummary } from "@/interfaces/interfaces";
import { getPenyaProves } from "@/services/database/publicDbService";
import { useRankingFreshnessStore } from "@/components/shared/Contexts/RankingFreshnessContext";

const TTL_MS = 45_000;

interface CacheEntry {
  data: PenyaProvaSummary[];
  fetchedAt: number;
}

interface PenyaProvesCacheState {
  entries: Record<string, CacheEntry>;
  loadingKeys: Record<string, boolean>;
  ensureLoaded: (year: number, penyaId: string) => void;
}

const keyFor = (year: number, penyaId: string) => `${year}:${penyaId}`;

/** An entry is fresh until whichever comes first: its own 30s TTL, or the
 *  ranking doc for that year having changed since it was fetched (a free
 *  signal from RankingFreshnessContext — only populated for years the
 *  Ranking tab's listener has actually been open for in this session). */
function isEntryFresh(entry: CacheEntry | undefined, year: number): boolean {
  if (!entry) return false;
  if (Date.now() - entry.fetchedAt >= TTL_MS) return false;

  const rankingUpdatedAtMs = useRankingFreshnessStore.getState().updatedAtMsByYear[year];
  if (rankingUpdatedAtMs !== undefined && rankingUpdatedAtMs > entry.fetchedAt) return false;

  return true;
}

/** Per-(year, penya) cache of a penya's prova history. Bouncing between a
 *  few penya pages (or back to one already seen) reuses what's already
 *  loaded instead of repeating the 2×N reads (N proves + N participant
 *  docs) `getPenyaProves` does per visit — see isEntryFresh for how long an
 *  entry stays valid. */
export const usePenyaProvesCacheStore = create<PenyaProvesCacheState>((set, get) => ({
  entries: {},
  loadingKeys: {},
  ensureLoaded: (year, penyaId) => {
    const key = keyFor(year, penyaId);
    const state = get();

    if (isEntryFresh(state.entries[key], year) || state.loadingKeys[key]) return;

    set((s) => ({ loadingKeys: { ...s.loadingKeys, [key]: true } }));

    getPenyaProves(year, penyaId).then((data) => {
      set((s) => ({
        entries: { ...s.entries, [key]: { data, fetchedAt: Date.now() } },
        loadingKeys: { ...s.loadingKeys, [key]: false },
      }));
    });
  },
}));

export function usePenyaProves(year: number, penyaId: string) {
  const key = keyFor(year, penyaId);
  const entry = usePenyaProvesCacheStore((s) => s.entries[key]);
  const ensureLoaded = usePenyaProvesCacheStore((s) => s.ensureLoaded);

  useEffect(() => {
    ensureLoaded(year, penyaId);
  }, [year, penyaId, ensureLoaded]);

  const isFresh = isEntryFresh(entry, year);

  return {
    proves: isFresh && entry ? entry.data : [],
    isLoading: !isFresh,
  };
}
