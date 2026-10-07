// "Ocultar valores" — CONTEXTO.md §4: "o olho na Home troca todos os valores por R$ ••••."
// Estado simples em memória (a opção persistente "Ocultar valores ao abrir" é da tela de
// Segurança, que ainda não existe — ver CONTEXTO.md §15.14).
import { create } from 'zustand';

type HiddenValuesState = {
  hidden: boolean;
  toggle: () => void;
};

export const useHiddenValuesStore = create<HiddenValuesState>((set) => ({
  hidden: false,
  toggle: () => set((state) => ({ hidden: !state.hidden })),
}));
