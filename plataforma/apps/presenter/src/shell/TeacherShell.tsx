import { lazy, Suspense, useEffect } from 'react';
import { BookOpen, Library as LibraryIcon, Settings as SettingsIcon, Users } from 'lucide-react';
import { ActivitiesContext } from '../app/catalog';
import { useRoute, useViewportWidth } from '../app/route';
import { LESSON_VIEWS, teacherRoute, type Navigate, type TeacherRoute } from '../app/routes';
import { useContent } from '../content/ContentProvider';
import { useAula } from '../store/AulaProvider';
import { lessonEntry, lessonMeta, type ContentView } from '../store/deck';
import type { View } from '../store/schema';
import { Brand } from '../ui/Brand';
import { useUi } from '../ui/UiProvider';
import { ConnectionStrip, SaveBar, SyncPill } from './SaveBar';
import { LessonWorkspace } from '../features/clase/Workspace';
import { SessionBar } from './Session';

const Library = lazy(async () => ({
  default: (await import('../features/clases/Library')).Library,
}));
const Presenter = lazy(async () => ({
  default: (await import('../features/presentar/Presenter')).Presenter,
}));
const Gallery = lazy(async () => ({
  default: (await import('../features/recursos/GalleryView')).GalleryView,
}));
const Courses = lazy(async () => ({
  default: (await import('../features/cursos/Courses')).Courses,
}));
const Activities = lazy(async () => ({
  default: (await import('../features/recursos/Activities')).Activities,
}));
const SettingsPage = lazy(async () => ({
  default: (await import('../features/ajustes/Settings')).Settings,
}));

/** Menú docente: cuatro entradas, iguales en escritorio, tableta y celular. */
type Area = 'clases' | 'recursos' | 'cursos' | 'ajustes';
const AREAS: { area: Area; label: string; view: View; icon: typeof BookOpen }[] = [
  { area: 'clases', label: 'Clases', view: 'clases', icon: BookOpen },
  { area: 'recursos', label: 'Recursos', view: 'actividades', icon: LibraryIcon },
  { area: 'cursos', label: 'Cursos', view: 'cursos', icon: Users },
  { area: 'ajustes', label: 'Ajustes', view: 'ajustes', icon: SettingsIcon },
];
const AREA_OF: Record<View, Area> = {
  clases: 'clases',
  clase: 'clases',
  presentar: 'clases',
  actividades: 'recursos',
  galeria: 'recursos',
  cursos: 'cursos',
  ajustes: 'ajustes',
};
/** Pestañas de Recursos: el banco de actividades y las plantillas de la mascota. */
const RESOURCES: [View, string][] = [
  ['actividades', 'Actividades y PAES'],
  ['galeria', 'Plantillas de mascota'],
];

/** Una clase existe si está en la planificación o en el contenido. */
function lessonExists(content: ContentView, id: string) {
  return (
    content.library.entries.some((entry) => entry.id === id) ||
    Boolean(lessonEntry(content, id))
  );
}

export function TeacherShell({
  route,
  onChangeRole,
  onLock,
}: {
  route: TeacherRoute;
  onChangeRole: () => void;
  onLock: () => void;
}) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const { toast } = useUi();
  const { go: goTo } = useRoute();
  const view = route.view;
  const area = AREA_OF[view];
  const width = useViewportWidth();
  const presenting = view === 'presentar';
  const side = width >= 1000 && !presenting;
  const narrow = width < 720 && !presenting;
  const mid = !side && !narrow && !presenting;

  // La clase sale de la URL; sin ella, la última que se abrió. Mientras llega el contenido del
  // repositorio, una clase del enlace que aún no se conoce (un borrador) se espera, no se reemplaza.
  const lessonView = LESSON_VIEWS.has(view);
  const settled = !(content.connection && content.mode === 'build');
  const wanted = route.lesson;
  const waiting = Boolean(lessonView && wanted && !settled && !lessonExists(content, wanted));
  const lessonId =
    wanted && lessonExists(content, wanted)
      ? wanted
      : lessonExists(content, data.lessonId)
        ? data.lessonId
        : (content.library.entries[0]?.id ?? data.lessonId);

  useEffect(() => {
    if (!lessonView || waiting || wanted === lessonId) return;
    if (wanted)
      toast(`No se encontró la clase «${wanted}». Se abrió «${lessonMeta(content, lessonId).title}».`);
    goTo({ ...route, lesson: lessonId, slide: null }, 'replace');
  }, [lessonView, waiting, wanted, lessonId, route, goTo, toast, content]);
  // Se recuerda la última clase abierta: es la «Clase de hoy» de Clases.
  useEffect(() => {
    if (lessonView && !waiting && lessonId !== data.lessonId)
      dispatch({ type: 'openLesson', id: lessonId });
  }, [lessonView, waiting, lessonId, data.lessonId, dispatch]);

  const go: Navigate = (next, target) =>
    goTo(
      teacherRoute(next, {
        lesson: target?.lesson ?? (LESSON_VIEWS.has(next) ? lessonId : null),
        section: target?.section,
        slide: target?.slide,
        library: target?.library,
      }),
    );

  const page = (() => {
    if (waiting) return <p className="app-loading">Cargando la clase…</p>;
    switch (view) {
      case 'clases':
        return <Library libraryId={route.library} onNavigate={go} />;
      case 'clase':
        return (
          <LessonWorkspace
            lessonId={lessonId}
            section={route.section ?? 'resumen'}
            slideId={route.slide}
            onNavigate={go}
          />
        );
      case 'presentar':
        return <Presenter key={lessonId} lessonId={lessonId} onNavigate={go} />;
      case 'actividades':
        return <Activities onNavigate={go} />;
      case 'galeria':
        return <Gallery lessonId={lessonId} onNavigate={go} />;
      case 'cursos':
        return <Courses onNavigate={go} />;
      case 'ajustes':
        return <SettingsPage onNavigate={go} onChangeRole={onChangeRole} onLock={onLock} />;
    }
  })();

  const areaButtons = (className: string) =>
    AREAS.map(
      ({ area: a, label, view: target, icon: Icon }) => (
        <button
          key={a}
          type="button"
          className={className}
          aria-current={area === a ? 'page' : undefined}
          onClick={() => go(target)}
        >
          {narrow && <Icon size={20} aria-hidden="true" />}
          {label}
        </button>
      ),
    );

  return (
    <div
      className={`teacher ${side ? 'teacher-side' : ''} ${narrow ? 'teacher-narrow' : ''} ${presenting ? 'teacher-presenting' : ''}`}
    >
      {!presenting && (
        <a
          href="#contenido"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            document.getElementById('contenido')?.focus();
          }}
        >
          Saltar al contenido
        </a>
      )}
      {side && (
        <aside className="sidebar" aria-label="Navegación docente">
          <Brand size="md" />
          <p className="sidebar-caption">PAES M1 · DOCENTE</p>
          <nav aria-label="Secciones">
            {AREAS.filter(({ area: a }) => a !== 'ajustes').map(({ area: a, label, view: target }) => (
              <button
                key={a}
                type="button"
                className="nav-item"
                aria-current={area === a ? 'page' : undefined}
                onClick={() => go(target)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            <SyncPill onOpen={() => go('ajustes')} />
            <button
              type="button"
              className="nav-item"
              aria-current={area === 'ajustes' ? 'page' : undefined}
              onClick={() => go('ajustes')}
            >
              Ajustes
            </button>
          </div>
        </aside>
      )}
      {(mid || narrow) && (
        <header className="topbar">
          <Brand size="sm" label={narrow ? 'DOCENTE' : null} />
          {mid && (
            <nav aria-label="Navegación docente" className="head-tabs">
              {areaButtons('tab-item')}
            </nav>
          )}
          <div className="topbar-end">
            <SyncPill compact={mid} onOpen={() => go('ajustes')} />
          </div>
        </header>
      )}
      <div
        id="contenido"
        tabIndex={-1}
        className={`teacher-content ${presenting || view === 'clase' ? 'is-fixed' : ''}`}
      >
        {!presenting && (
          <>
            <SessionBar onNavigate={go} />
            <ConnectionStrip onNavigate={go} />
            <SaveBar onNavigate={go} />
          </>
        )}
        {area === 'recursos' && (
          <nav aria-label="Recursos" className="sub-tabs">
            {RESOURCES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="ws-tab"
                aria-current={view === key ? 'page' : undefined}
                onClick={() => go(key)}
              >
                {label}
              </button>
            ))}
          </nav>
        )}
        <ActivitiesContext.Provider value={content.bundle.activities}>
          <Suspense fallback={<p className="app-loading">Cargando…</p>}>{page}</Suspense>
        </ActivitiesContext.Provider>
      </div>
      {narrow && (
        <nav aria-label="Navegación docente" className="bottom-bar">
          {areaButtons('bottom-item')}
        </nav>
      )}
    </div>
  );
}
