import {
  roleSchema,
  viewSchema,
  type RoleState,
  type View,
} from '../store/schema';

/**
 * Rutas de la app como datos. El fragmento (#rol=…&vista=…&clase=…&slide=…) es la fuente de
 * verdad: recargar o compartir un enlace abre la misma vista y la misma clase. Funciones puras,
 * sin acceso a `window`, para probarlas sin navegador.
 */

/** Vistas docentes que trabajan sobre una clase: llevan `clase` en la URL. */
export const LESSON_VIEWS: ReadonlySet<View> = new Set<View>([
  'hoy',
  'presentar',
  'editor',
  'pdf',
  'galeria',
]);

export interface TeacherRoute {
  role: 'docente';
  view: View;
  lesson: string | null;
  slide: string | null;
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

/** Destino de una navegación docente; sin `lesson`, una vista de clase conserva la actual. */
export type Navigate = (
  view: View,
  target?: { lesson?: string; slide?: string },
) => void;

const text = (params: URLSearchParams, key: string) => params.get(key) || null;

export function parsePrint(params: URLSearchParams): PrintRoute | null {
  if (params.get('modo') !== 'pdf') return null;
  return {
    lesson: text(params, 'clase'),
    autoPrint: params.get('imprimir') === '1',
    local: params.get('fuente') === 'local',
  };
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
      return { role: 'docente', view: saved.view, lesson: null, slide: null };
  }
}

/**
 * Interpreta el fragmento. Sin rol, acepta los enlaces anteriores a la app por rol
 * (#clase=…&slide=… y #galeria=mascotas) y, si no, recurre al último rol guardado.
 */
export function parseRoute(
  params: URLSearchParams,
  saved: RoleState = { role: null, view: 'hoy' },
): AppRoute {
  const lesson = text(params, 'clase');
  const slide = text(params, 'slide');
  const role = roleSchema.safeParse(params.get('rol'));
  if (role.success) {
    switch (role.data) {
      case 'estudiante':
        return { role: 'estudiante', lesson, code: text(params, 'codigo') };
      case 'remoto':
        return { role: 'remoto' };
      case 'docente': {
        const view = viewSchema.safeParse(params.get('vista'));
        return {
          role: 'docente',
          view: view.success ? view.data : 'hoy',
          lesson,
          slide,
        };
      }
    }
  }
  if (params.get('galeria') === 'mascotas')
    return { role: 'docente', view: 'galeria', lesson, slide: null };
  if (lesson) return { role: 'docente', view: 'presentar', lesson, slide };
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
    if (route.lesson && LESSON_VIEWS.has(route.view))
      params.set('clase', route.lesson);
    if (route.slide && route.view === 'presentar') params.set('slide', route.slide);
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
