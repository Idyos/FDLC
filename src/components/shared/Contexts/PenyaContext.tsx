// usePenyaStore.ts
import { create } from "zustand";
import { PenyaInfo } from "@/interfaces/interfaces";

interface PenyaState {
  penya: PenyaInfo;
  setPenya: (penya: PenyaInfo) => void;
  clearPenya: () => void;
}

export const usePenyaStore = create<PenyaState>((set) => ({
  penya: new PenyaInfo(),
  setPenya: (penya) => set({ penya }),
  clearPenya: () => set({ penya: new PenyaInfo() }),
}));
