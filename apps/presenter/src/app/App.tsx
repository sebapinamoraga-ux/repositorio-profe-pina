import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { PrintDeck } from '../slides/PrintDeck';
import { ContentProvider, useContent } from '../content/ContentProvider';
import { AulaProvider } from '../store/AulaProvider';
import { deckFor, repoDeck } from '../store/deck';
import {
  isUnlocked,
  loadRoleState,
  saveRoleState,
  setUnlocked,
} from '../store/persist';
import type { Role } from '../store/schema';
import { UiProvider } from '../ui/UiProvider';
import { ActivitiesContext, catalog } from './catalog';
import { readRoute, useRoute } from './route';
import {
  parsePrint,
  parseRoute,
  roleStateOf,
  type AppRoute,
  type PrintRoute,
} from './routes';
import { Landing } from '../roles/Landing';
import { Access } from '../roles/Access';
import { TeacherShell } from '../teacher/TeacherShell';

const Student = lazy(async () => ({
  default: (await import('../student/Student')).Student,
}));
const Remote = lazy(async () => ({
  default: (await import('../remote/Remote')).Remote,
}));

function PrintRouteView({ print }: { print: PrintRoute }) {
  const id = print.lesson ?? catalog[0]?.meta.id;
  if (!id) return <p>No hay clases publicadas.</p>;
  const deck = repoDeck(id);
  if (!deck || !deck.slides.length) return <p>No hay clases publicadas.</p>;
  return <PrintDeck deck={deck} autoPrint={print.autoPrint} />;
}

/** Impresión con el contenido efectivo de este navegador (borradores y cambios sin guardar). */
function LocalPrintRoute({ print }: { print: PrintRoute }) {
  const content = useContent();
  const id = print.lesson ?? '';
  if (content.connection && content.mode === 'build')
    return <p className="app-loading">Cargando el contenido…</p>;
  const deck = deckFor(content, id);
  if (!deck.slides.length) return <p>Esta clase aún no tiene láminas.</p>;
  return (
    <ActivitiesContext.Provider value={content.bundle.activities}>
      <PrintDeck deck={deck} autoPrint={print.autoPrint} />
    </ActivitiesContext.Provider>
  );
}

const ROLE_HOME: Record<Role, AppRoute> = {
  estudiante: { role: 'estudiante', lesson: null, code: null },
  docente: { role: 'docente', view: 'hoy', lesson: null, slide: null },
  remoto: { role: 'remoto' },
};

/** El fragmento es la única fuente de rol, vista y clase; aquí solo se lee y se recuerda. */
function Roles() {
  const { route, go } = useRoute();
  const current = useMemo(() => parseRoute(route), [route]);
  const [unlocked, setUnlockedState] = useState(isUnlocked);

  useEffect(() => {
    saveRoleState(roleStateOf(current, loadRoleState()));
  }, [current]);
  // Forma canónica: quita parámetros que la ruta no usa (p. ej., la lámina fuera de Presentar).
  // Se lee la URL vigente: los efectos de las vistas hijas (que corren antes) pueden haberla
  // completado en este mismo ciclo, por ejemplo con la clase.
  useEffect(() => {
    go(parseRoute(readRoute()), 'replace');
  }, [current, go]);

  const choose = useCallback(
    (role: Role | null) => go(role ? ROLE_HOME[role] : { role: null }),
    [go],
  );
  const unlock = useCallback(() => {
    setUnlocked(true);
    setUnlockedState(true);
  }, []);
  const lock = useCallback(() => {
    setUnlocked(false);
    setUnlockedState(false);
    go({ role: null });
  }, [go]);

  if (!current.role) return <Landing onChoose={choose} />;
  if (current.role !== 'estudiante' && !unlocked)
    return (
      <Access
        role={current.role}
        onBack={() => choose(null)}
        onUnlock={unlock}
      />
    );
  if (current.role === 'docente')
    return (
      <TeacherShell
        route={current}
        onChangeRole={() => choose(null)}
        onLock={lock}
      />
    );
  return (
    <Suspense fallback={<p className="app-loading">Cargando…</p>}>
      {current.role === 'estudiante' ? (
        <Student onChangeRole={() => choose(null)} />
      ) : (
        <Remote onChangeRole={() => choose(null)} />
      )}
    </Suspense>
  );
}

export function App() {
  const { route } = useRoute();
  const print = parsePrint(route);
  if (print && !print.local) return <PrintRouteView print={print} />;
  return (
    <UiProvider>
      <AulaProvider>
        <ContentProvider>
          {print ? <LocalPrintRoute print={print} /> : <Roles />}
        </ContentProvider>
      </AulaProvider>
    </UiProvider>
  );
}
