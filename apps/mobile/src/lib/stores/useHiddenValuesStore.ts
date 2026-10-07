// "Ocultar valores" — CONTEXTO.md §4: "o olho na Home troca todos os valores por R$ ••••."
// `hidden` é o estado da sessão atual (o olho na Home liga/desliga livremente). Na abertura do
// app, `hydrateFromSettings` aplica uma vez só o valor salvo em "Segurança → Ocultar valores ao
// abrir" (CONTEXTO.md §6.10, `GET /settings`) como ponto de partida — depois disso o olho manda.
import { create } from 'zustand';

type HiddenValuesState = {
  hidden: boolean;
  hydrated: boolean;
  toggle: () => void;
  hydrateFromSettings: (hideValuesOnOpen: boolean) => void;
};

export const useHiddenValuesStore = create<HiddenValuesState>((set) => ({
  hidden: false,
  hydrated: false,
  toggle: () => set((state) => ({ hidden: !state.hidden })),
  hydrateFromSettings: (hideValuesOnOpen) =>
    set((state) => (state.hydrated ? state : { hidden: hideValuesOnOpen, hydrated: true })),
}));
