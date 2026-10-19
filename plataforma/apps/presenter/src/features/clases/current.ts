import { useContent } from '../../content/ContentProvider';
import { todayLessonIn, type CurrentReason } from '../../content/library';
import { useAula } from '../../store/AulaProvider';
import { nowParts } from '../../store/teacher';

export const CURRENT_LABEL: Record<CurrentReason, string> = {
  hoy: 'Clase de hoy',
  proxima: 'Próxima clase',
  ultima: 'Última clase abierta',
};
/** En una biblioteca de publicación (el canal), sus fechas son publicaciones, no clases. */
export const PUBLICATION_LABEL: Record<CurrentReason, string> = {
  hoy: 'Publicación de hoy',
  proxima: 'Próxima publicación',
  ultima: 'Última clase abierta',
};

/**
 * La clase actual: la que la planificación pone hoy, si no la próxima con fecha y, sin fechas
 * por delante, la última que se abrió en este navegador. Solo cuentan los calendarios de clases,
 * salvo que la biblioteca abierta sea de publicación: entonces se ve su próxima publicación.
 */
export function useCurrentLesson(openLibraryId: string | null) {
  const { data } = useAula();
  const { library } = useContent();
  return todayLessonIn(library, openLibraryId, nowParts().date, data.lessonId);
}
