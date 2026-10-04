import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { PrintDeck } from '../slides/PrintDeck';
import { AulaProvider } from '../store/AulaProvider';
import { deckFor, repoDeck, repoMetas } from '../store/deck';
import {
  isUnlocked,
  loadRoleState,
  loadTeacherData,
  saveRoleState,
  setUnlocked,
} from '../store/persist';
import {
  roleSchema,
  viewSchema,
  type Role,
  type RoleState,
  type View,
} from '../store/schema';
import { UiProvider } from '../ui/UiProvider';
import { catalog } from './catalog';
import { readRoute, useRoute } from './route';
import { Landing } from '../roles/Landing';
import { Access } from '../roles/Access';
import { TeacherShell } from '../teacher/TeacherShell';

const Student = lazy(async () => ({
  default: (await import('../student/Student')).Student,
}));
const Remote = lazy(async () => ({
  default: (await import('../remote/Remote')).Remote,
}));

/** Rol y vista: el fragmento manda (enlaces y recargas); si no trae rol, se usa el último guardado. */
function initialRole(route: URLSearchParams): RoleState {
  const role = roleSchema.safeParse(route.get('rol'));
  const view = viewSchema.safeParse(route.get('vista'));
  if (role.success)
    return { role: role.data, view: view.success ? view.data : 'hoy' };
  // Enlaces anteriores a la nueva interfaz: #clase=…&slide=… y #galeria=mascotas.
  if (route.get('galeria') === 'mascotas')
    return { role: 'docente', view: 'galeria' };
  if (route.get('clase')) return { role: 'docente', view: 'presentar' };
  return loadRoleState();
}

function PrintRoute({ route }: { route: URLSearchParams }) {
  const id = route.get('clase') ?? catalog[0]?.meta.id;
  if (!id) return <p>No hay clases publicadas.</p>;
  const deck =
    route.get('fuente') === 'local'
      ? deckFor(loadTeacherData(repoMetas), id)
      : repoDeck(id);
  if (!deck || !deck.slides.length) return <p>No hay clases publicadas.</p>;
  return <PrintDeck deck={deck} autoPrint={route.get('imprimir') === '1'} />;
}

function Roles() {
  const { route, replace } = useRoute();
  const [state, setState] = useState<RoleState>(() => initialRole(readRoute()));
  const [unlocked, setUnlockedState] = useState(isUnlocked);

  useEffect(() => {
    saveRoleState(state);
    replace(
      state.role
        ? {
            rol: state.role,
            vista: state.role === 'docente' ? state.view : null,
            galeria: null,
            ...(state.role === 'docente' && state.view === 'presentar'
              ? {}
              : { clase: null, slide: null }),
          }
        : { rol: null, vista: null, clase: null, slide: null, galeria: null },
    );
  }, [state, replace]);

  // Cambios del fragmento hechos a mano o por enlaces internos.
  useEffect(() => {
    const role = roleSchema.safeParse(route.get('rol'));
    const view = viewSchema.safeParse(route.get('vista'));
    if (!role.success) return;
    setState((current) =>
      current.role === role.data &&
      (!view.success || current.view === view.data)
        ? current
        : { role: role.data, view: view.success ? view.data : current.view },
    );
  }, [route]);

  const choose = useCallback(
    (role: Role | null) =>
      setState((current) => ({
        role,
        view: role === 'docente' ? 'hoy' : current.view,
      })),
    [],
  );
  const navigate = useCallback(
    (view: View) => setState((current) => ({ ...current, view })),
    [],
  );
  const unlock = useCallback(() => {
    setUnlocked(true);
    setUnlockedState(true);
  }, []);
  const lock = useCallback(() => {
    setUnlocked(false);
    setUnlockedState(false);
    setState({ role: null, view: 'hoy' });
  }, []);

  if (!state.role) return <Landing onChoose={choose} />;
  if (state.role !== 'estudiante' && !unlocked)
    return (
      <Access
        role={state.role}
        onBack={() => choose(null)}
        onUnlock={unlock}
      />
    );
  if (state.role === 'docente')
    return (
      <TeacherShell
        view={state.view}
        onNavigate={navigate}
        onChangeRole={() => choose(null)}
        onLock={lock}
      />
    );
  return (
    <Suspense fallback={<p className="app-loading">Cargando…</p>}>
      {state.role === 'estudiante' ? (
        <Student onChangeRole={() => choose(null)} />
      ) : (
        <Remote onChangeRole={() => choose(null)} />
      )}
    </Suspense>
  );
}

export function App() {
  const { route } = useRoute();
  if (route.get('modo') === 'pdf') return <PrintRoute route={route} />;
  return (
    <UiProvider>
      <AulaProvider>
        <Roles />
      </AulaProvider>
    </UiProvider>
  );
}
