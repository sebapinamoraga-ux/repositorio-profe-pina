import type { Note, TeacherData } from '../store/schema';
import { nowParts, uid } from '../store/teacher';

/** Comentario privado de mejora: nunca va al PDF, a estudiantes ni al repositorio. */
export function makeNote(
  data: TeacherData,
  input: {
    text: string;
    lessonId: string;
    slideId: string | null;
    slideTitle: string;
    source: Note['source'];
  },
): Note {
  const t = nowParts();
  const session = data.activeSession;
  return {
    id: uid('n'),
    lessonId: input.lessonId,
    slideId: input.slideId,
    slideTitle: input.slideId ? input.slideTitle : '',
    text: input.text.trim(),
    date: t.date,
    time: t.time,
    source: input.source,
    course: session
      ? (data.courses.find((c) => c.id === session.courseId)?.nombre ?? '')
      : '',
    status: 'pendiente',
  };
}
