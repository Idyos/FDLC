import { create } from "zustand";
import { ProvaInfo } from "@/interfaces/interfaces";

interface ProvaState {
  prova: ProvaInfo | null;
  setProva: (prova: ProvaInfo | null) => void;
}

export const useProvaStore = create<ProvaState>((set) => ({
  prova: null,
  setProva: (prova) => set({ prova }),
}));