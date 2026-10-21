import { createContext, useContext } from 'react';
import type { useHistory } from './useHistory';

/** Historial de cambios de la clase abierta: lo crea `Workspace` y lo usan el editor y el menú. */
export type LessonHistory = ReturnType<typeof useHistory>;

export const HistoryContext = createContext<LessonHistory | null>(null);

export function useLessonHistory() {
  const value = useContext(HistoryContext);
  if (!value)
    throw new Error('useLessonHistory requiere el historial de la clase');
  return value;
}
