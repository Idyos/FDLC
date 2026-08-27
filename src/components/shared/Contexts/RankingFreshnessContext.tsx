// RankingFreshnessContext.tsx
import { create } from "zustand";

interface RankingFreshnessState {
  updatedAtMsByYear: Record<number, number>;
  setUpdatedAt: (year: number, updatedAtMs: number) => void;
}

/** Last known `updatedAt` of Circuit/{year}/Ranking/current, per year — fed
 *  by whoever already has the ranking listener open (MainPage), at no extra
 *  read cost. Other caches (e.g. PenyaProvesCacheContext) use it as an early
 *  invalidation signal: if the ranking doc changed after an entry was
 *  fetched, that entry is stale regardless of its own TTL. Only helps for
 *  years the ranking listener has actually been open for in this session —
 *  someone landing straight on a penya page without visiting Ranking first
 *  just falls back to the plain TTL. */
export const useRankingFreshnessStore = create<RankingFreshnessState>((set) => ({
  updatedAtMsByYear: {},
  setUpdatedAt: (year, updatedAtMs) =>
    set((s) => ({ updatedAtMsByYear: { ...s.updatedAtMsByYear, [year]: updatedAtMs } })),
}));
