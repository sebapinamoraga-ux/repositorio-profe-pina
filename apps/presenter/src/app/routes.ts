import {
  LEGACY_VIEWS,
  VIEW_ALIASES,
  roleSchema,
  sectionSchema,
  viewSchema,
  type RoleState,
  type Section,
  type View,
} from '../store/schema';

/**
 * Rutas de la app como datos. El fragmento (#rol=…&vista=…&clase=…&seccion=…&slide=…) es la
 * fuente de verdad: recargar o compartir un enlace abre la misma vista, la misma clase y la misma
 * pestaña. Funciones puras, sin acceso a `window`, para probarlas sin navegador.
 */

/** Vistas docentes que trabajan sobre una clase: llevan `clase` en la URL. */
export const LESSON_VIEWS: ReadonlySet<View> = new Set<View>(['clase', 'presentar', 'galeria']);

/** Pestañas donde se elige una lámina: la lámina seleccionada viaja en la URL. */
const SLIDE_SECTIONS: ReadonlySet<Section> = new Set<Section>(['laminas', 'repaso']);

export interface TeacherRoute {
  role: 'docente';
  view: View;
  /** Pestaña del espacio de la clase; null fuera de «clase». */
  section: Section | null;
  lesson: string | null;
  slide: string | null;
  /** Biblioteca abierta en Clases; null fuera de «clases» o si no se eligió. */
  library: string | null;
}

export type AppRoute =
  | { role: null }
  | { role: 'estudiante'; lesson: string | null; code: string | null }
  | { role: 'remoto' }
  | TeacherRoute;

export interface PrintRoute {
  lesson: string | null;
  autoPrint: boolean;
  /** Imprime el contenido efectivo de este navegador (borradores y cambios sin guardar). */
  local: boolean;
}

export interface NavTarget {
  lesson?: string;
  section?: Section;
  slide?: string;
  library?: string;
}

/** Destino de una navegación docente; sin `lesson`, una vista de clase conserva la actual. */
export type Navigate = (view: View, target?: NavTarget) => void;

const text = (params: URLSearchParams, key: string) => params.get(key) || null;

export function parsePrint(params: URLSearchParams): PrintRoute | null {
  if (params.get('modo') !== 'pdf') return null;
  return {
    lesson: text(params, 'clase'),
    autoPrint: params.get('imprimir') === '1',
    local: params.get('fuente') === 'local',
  };
}

/** Construye una ruta docente válida: la pestaña solo existe en «clase» y vale «resumen» por omisión. */
export function teacherRoute(
  view: View,
  target: {
    lesson?: string | null;
    section?: Section | null;
    slide?: string | null;
    library?: string | null;
  } = {},
): TeacherRoute {
  return {
    role: 'docente',
    view,
    section: view === 'clase' ? (target.section ?? 'resumen') : null,
    lesson: target.lesson ?? null,
    slide: target.slide ?? null,
    library: view === 'clases' ? (target.library ?? null) : null,
  };
}

function parseTeacher(params: URLSearchParams): TeacherRoute {
  const raw = params.get('vista') ?? '';
  const legacy = LEGACY_VIEWS[raw];
  const view = viewSchema.safeParse(VIEW_ALIASES[raw] ?? raw);
  const section = sectionSchema.safeParse(params.get('seccion'));
  return teacherRoute(legacy ? 'clase' : view.success ? view.data : 'clases', {
    lesson: text(params, 'clase'),
    section: legacy ?? (section.success ? section.data : null),
    slide: text(params, 'slide'),
    library: text(params, 'biblioteca'),
  });
}

function fromSaved(saved: RoleState): AppRoute {
  switch (saved.role) {
    case null:
      return { role: null };
    case 'estudiante':
      return { role: 'estudiante', lesson: null, code: null };
    case 'remoto':
      return { role: 'remoto' };
    case 'docente':
      return teacherRoute(saved.view);
  }
}

/**
 * Interpreta el fragmento. Sin rol, acepta los enlaces anteriores a la app por rol
 * (#clase=…&slide=… y #galeria=mascotas) y, si no, recurre al último rol guardado.
 */
export function parseRoute(
  params: URLSearchParams,
  saved: RoleState = { role: null, view: 'clases' },
): AppRoute {
  const lesson = text(params, 'clase');
  const role = roleSchema.safeParse(params.get('rol'));
  if (role.success) {
    switch (role.data) {
      case 'estudiante':
        return { role: 'estudiante', lesson, code: text(params, 'codigo') };
      case 'remoto':
        return { role: 'remoto' };
      case 'docente':
        return parseTeacher(params);
    }
  }
  if (params.get('galeria') === 'mascotas') return teacherRoute('galeria', { lesson });
  if (lesson) return teacherRoute('presentar', { lesson, slide: text(params, 'slide') });
  return fromSaved(saved);
}

/** Forma canónica: solo los parámetros que la ruta usa, siempre en el mismo orden. */
export function routeParams(route: AppRoute): URLSearchParams {
  const params = new URLSearchParams();
  if (!route.role) return params;
  params.set('rol', route.role);
  if (route.role === 'estudiante') {
    if (route.lesson) params.set('clase', route.lesson);
    if (route.code) params.set('codigo', route.code);
  }
  if (route.role === 'docente') {
    params.set('vista', route.view);
    if (route.lesson && LESSON_VIEWS.has(route.view)) params.set('clase', route.lesson);
    if (route.view === 'clase') params.set('seccion', route.section ?? 'resumen');
    if (route.view === 'clases' && route.library) params.set('biblioteca', route.library);
    const slideHere =
      route.view === 'presentar' ||
      (route.view === 'clase' && route.section !== null && SLIDE_SECTIONS.has(route.section));
    if (route.slide && slideHere) params.set('slide', route.slide);
  }
  return params;
}

export const routeHash = (route: AppRoute) => `#${routeParams(route)}`;

/** Lo que se recuerda entre visitas: rol y vista, no la clase ni la lámina. */
export function roleStateOf(route: AppRoute, previous: RoleState): RoleState {
  return {
    role: route.role,
    view: route.role === 'docente' ? route.view : previous.view,
  };
}
