import { useEffect, useState } from 'react';
import { useAula } from '../../../store/AulaProvider';
import { pad2 } from '../../../store/deck';
import type { EditedSlide, Note } from '../../../store/schema';

export const SLIDE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lista que se edita: las láminas de la clase o las del repaso del estudiante. */
export type SlideListName = 'slides' | 'repaso';

export const LAYOUTS: [EditedSlide['layout'], string][] = [
  ['portada', 'Portada'],
  ['concepto', 'Concepto'],
  ['dos-columnas', 'Dos columnas'],
  ['resolucion', 'Resolución'],
  ['ejercicio', 'Ejercicio'],
  ['escena', 'Escena de video'],
];

export const PRESENCE = {
  sutil: 'Sutil',
  pedagogica: 'Pedagógica',
  marca: 'Marca',
} as const;

/** Número visible: 01, 02… en la clase; R1, R2… en el repaso. */
export const slideNumber = (list: SlideListName, k: number) =>
  list === 'repaso' ? `R${k + 1}` : pad2(k + 1);

export function uniqueId(base: string, taken: readonly { id: string }[]) {
  const ids = new Set(taken.map((slide) => slide.id));
  let id = base;
  for (let k = 2; ids.has(id); k++) id = `${base}-${k}`;
  return id;
}

/** Ancho del editor (no del viewport): la barra lateral docente le resta espacio. */
export function useElementWidth() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(1300);
  useEffect(() => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { width, ref: setNode };
}

/** Comentarios de la clase, con los pendientes aparte. */
export function useLessonNotes(lessonId: string) {
  const { data } = useAula();
  const notes = data.notes.filter((note) => note.lessonId === lessonId);
  const pending = notes.filter((note) => note.status === 'pendiente');
  const pendingFor = (id: string) =>
    pending.filter((note) => note.slideId === id).length;
  return { notes, pending, pendingFor };
}

export type { Note };
