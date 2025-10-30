// useProvaStore.ts
import { create } from "zustand";
import { ProvaInfo } from "@/interfaces/interfaces";

interface ProvaState {
  prova: ProvaInfo | null;
  setProva: (prova: ProvaInfo | null) => void;
  clearProva: () => void;
}

export const useProvaStore = create<ProvaState>((set) => ({
  prova: null,
  setProva: (prova) => set({ prova }),
  clearProva: () => set({ prova: null }),
}));