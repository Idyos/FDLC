// useProvaStore.ts
import { create } from "zustand";
import { EmptyProva, Prova } from "@/interfaces/interfaces";

interface ProvaState {
  prova: Prova;
  setProva: (prova: Prova) => void;
  clearProva: () => void;
}

export const useProvaStore = create<ProvaState>((set) => ({
  prova: new EmptyProva(),
  setProva: (prova) => set({ prova }),
  clearProva: () => set({ prova: new EmptyProva() }),
}));