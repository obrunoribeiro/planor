// Aplica a configuração salva "Ocultar valores ao abrir" (CONTEXTO.md §6.10) assim que
// `GET /settings` carrega, uma vez por abertura do app — ver useHiddenValuesStore.
import { useEffect } from 'react';
import { useSettingsQuery } from '@/lib/api/queries';
import { useHiddenValuesStore } from './useHiddenValuesStore';

export function SettingsHydrator() {
  const { data } = useSettingsQuery();
  const hydrateFromSettings = useHiddenValuesStore((state) => state.hydrateFromSettings);

  useEffect(() => {
    if (data) hydrateFromSettings(data.hideValuesOnOpen);
  }, [data, hydrateFromSettings]);

  return null;
}
