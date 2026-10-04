import type { PlannedLesson } from '@aula/content-model';
import type { ContentBundle } from '@aula/content-model/content-files';
import type { EditedSlide, LegacyContent } from '../store/schema';
import { planningReducer, type PlanningAction } from './library';
import {
  createLesson,
  findLesson,
  planningOf,
  writePlanning,
  writeSlides,
  type FileWrite,
} from './ops';

/**
 * Lleva al repositorio lo que la etapa A guardaba en el navegador: las láminas editadas y
 * las clases creadas aquí. Todo queda como cambios sin guardar, para revisarlos antes.
 * Las clases editadas que la planificación no ubica se agregan a su unidad.
 */
export function migrateLegacy(
  legacy: LegacyContent,
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
): FileWrite[] {
  const writes: FileWrite[] = [];
  const actions: PlanningAction[] = [];
  const planning = planningOf(bundle);
  const planned = new Set(planning.units.flatMap((u) => u.lessons.map((l) => l.id)));
  const units = new Set(planning.units.map((u) => u.id));
  for (const entry of legacy.library) {
    // Lo sembrado desde la planificación antigua no se trae: manda la del repositorio.
    if (!entry.local && !legacy.edits[entry.id]) continue;
    const slides: EditedSlide[] = (legacy.edits[entry.id] ?? []).map(
      ({ id, title, phase, layout, steps, activities, body }) => ({
        id,
        title,
        phase,
        layout,
        steps,
        activities,
        body,
      }),
    );
    if (findLesson(bundle, entry.id)) {
      if (slides.length) writes.push(...writeSlides(bundle, entry.id, slides));
    } else if (slides.length) {
      writes.push(
        ...createLesson(bundle, {
          id: entry.id,
          title: entry.title,
          objective: entry.objective,
          slides,
        }),
      );
    }
    if (planned.has(entry.id)) continue;
    if (!units.has(entry.unitId)) {
      const unit = legacy.units.find((u) => u.id === entry.unitId);
      actions.push({
        type: 'addUnit',
        id: entry.unitId,
        title: unit?.title ?? 'Creadas en este navegador',
      });
      units.add(entry.unitId);
    }
    const lesson: PlannedLesson = { id: entry.id };
    if (!slides.length && !findLesson(bundle, entry.id)) {
      lesson.title = entry.title;
      if (entry.objective) lesson.objective = entry.objective;
    }
    actions.push({ type: 'addLesson', unitId: entry.unitId, lesson });
    planned.add(entry.id);
  }
  if (actions.length)
    writes.push(...writePlanning(bundle, files, actions.reduce(planningReducer, planning)));
  return writes;
}
