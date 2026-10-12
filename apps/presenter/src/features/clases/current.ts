import { useContent } from '../../content/ContentProvider';
import { currentLesson, type CurrentReason } from '../../content/library';
import { useAula } from '../../store/AulaProvider';
import { nowParts } from '../../store/teacher';

export const CURRENT_LABEL: Record<CurrentReason, string> = {
  hoy: 'Clase de hoy',
  proxima: 'Próxima clase',
  ultima: 'Última clase abierta',
};

/**
 * La clase actual: la que la planificación pone hoy, si no la próxima con fecha y, sin fechas
 * por delante, la última que se abrió en este navegador.
 */
export function useCurrentLesson() {
  const { data } = useAula();
  const { library } = useContent();
  return currentLesson(library.entries, nowParts().date, data.lessonId);
}
