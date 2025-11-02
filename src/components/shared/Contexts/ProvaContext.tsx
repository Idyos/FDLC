// useProvaStore.ts
import { create } from "zustand";
import { ProvaInfo } from "@/interfaces/interfaces";

interface ProvaState {
  prova: ProvaInfo;
  setProva: (prova: ProvaInfo) => void;
  clearProva: () => void;
}

export const useProvaStore = create<ProvaState>((set) => ({
  prova: new ProvaInfo(),
  setProva: (prova) => set({ prova }),
  clearProva: () => set({ prova: new ProvaInfo() }),
}));