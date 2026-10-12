import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivitiesContext } from '../app/catalog';
import { useRoute, useViewportWidth } from '../app/route';
import { LESSON_VIEWS, type Navigate, type TeacherRoute } from '../app/routes';
import { useContent } from '../content/ContentProvider';
import { useAula } from '../store/AulaProvider';
import { lessonEntry, lessonMeta, type ContentView } from '../store/deck';
import type { View } from '../store/schema';
import { Brand } from '../ui/Brand';
import { useUi } from '../ui/UiProvider';
import { SaveBar, SyncPill } from './SaveBar';
import { Today } from './Today';
import { Button } from '../ui/Button';

const Library = lazy(async () => ({
  default: (await import('./Library')).Library,
}));
const Presenter = lazy(async () => ({
  default: (await import('./Presenter')).Presenter,
}));
const Editor = lazy(async () => ({
  default: (await import('./Editor')).Editor,
}));
const Gallery = lazy(async () => ({
  default: (await import('./GalleryView')).GalleryView,
}));
const Courses = lazy(async () => ({
  default: (await import('./Courses')).Courses,
}));
const PdfView = lazy(async () => ({
  default: (await import('./PdfView')).PdfView,
}));
const Activities = lazy(async () => ({
  default: (await import('./Activities')).Activities,
}));
const Connection = lazy(async () => ({
  default: (await import('./Connection')).Connection,
}));

const NAV: [View, string][] = [
  ['hoy', 'Clase de hoy'],
  ['biblioteca', 'Biblioteca de clases'],
  ['presentar', 'Presentar'],
  ['editor', 'Editor'],
  ['actividades', 'Actividades y PAES'],
  ['galeria', 'Galería de mascota'],
  ['cursos', 'Cursos e historial'],
  ['pdf', 'Vista PDF'],
  ['conexion', 'Conexión'],
];
const SHORT_NAV: [View, string][] = [
  ['hoy', 'Hoy'],
  ['biblioteca', 'Clases'],
  ['presentar', 'Presentar'],
  ['editor', 'Editor'],
  ['cursos', 'Cursos'],
];

/** Una clase existe si está en la planificación o en el contenido. */
function lessonExists(content: ContentView, id: string) {
  return (
    content.library.entries.some((entry) => entry.id === id) ||
    Boolean(lessonEntry(content, id))
  );
}

function Account({
  onChangeRole,
  onLock,
}: {
  onChangeRole: () => void;
  onLock: () => void;
}) {
  return (
    <>
      <div className="account-id">
        <span aria-hidden="true" className="avatar">
          PP
        </span>
        <span>
          <b>Profe Piña</b>
          <span>Acceso local</span>
        </span>
      </div>
      <SyncPill />
      <div className="account-actions">
        <Button size="sm" onClick={onChangeRole}>
          Cambiar rol
        </Button>
        <Button size="sm" onClick={onLock}>
          Bloquear
        </Button>
      </div>
    </>
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
  const { confirm, toast } = useUi();
  const { go: goTo } = useRoute();
  const view = route.view;
  const width = useViewportWidth();
  const [account, setAccount] = useState(false);
  const presenting = view === 'presentar';
  const side = width >= 1000 && !presenting;
  const narrow = width < 720 && !presenting;
  const mid = !side && !narrow && !presenting;
  const session = data.activeSession;
  const course = session
    ? data.courses.find((c) => c.id === session.courseId)
    : undefined;

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
  // Se recuerda la última clase abierta para volver a ella desde las vistas sin clase.
  useEffect(() => {
    if (lessonView && !waiting && lessonId !== data.lessonId)
      dispatch({ type: 'openLesson', id: lessonId });
  }, [lessonView, waiting, lessonId, data.lessonId, dispatch]);

  useEffect(() => {
    if (!account) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccount(false);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [account]);

  const lock = async () => {
    setAccount(false);
    if (
      await confirm({
        title: '¿Bloquear el acceso docente en este navegador?',
        body: 'Tus cursos, comentarios y cambios sin guardar quedan en este navegador.',
        ok: 'Bloquear',
      })
    )
      onLock();
  };
  const go: Navigate = (next, target) => {
    setAccount(false);
    goTo({
      role: 'docente',
      view: next,
      lesson: target?.lesson ?? (LESSON_VIEWS.has(next) ? lessonId : null),
      slide: target?.slide ?? null,
    });
  };

  const page = (() => {
    if (waiting) return <p className="app-loading">Cargando la clase…</p>;
    switch (view) {
      case 'hoy':
        return <Today lessonId={lessonId} onNavigate={go} />;
      case 'biblioteca':
        return <Library onNavigate={go} />;
      case 'presentar':
        return <Presenter key={lessonId} lessonId={lessonId} onNavigate={go} />;
      case 'editor':
        return <Editor key={lessonId} lessonId={lessonId} onNavigate={go} />;
      case 'galeria':
        return <Gallery lessonId={lessonId} onNavigate={go} />;
      case 'cursos':
        return <Courses onNavigate={go} />;
      case 'pdf':
        return <PdfView lessonId={lessonId} onNavigate={go} />;
      case 'actividades':
        return <Activities onNavigate={go} />;
      case 'conexion':
        return <Connection onNavigate={go} />;
    }
  })();

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
            {NAV.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className="nav-item"
                aria-current={view === key ? 'page' : undefined}
                onClick={() => go(key)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="sidebar-foot">
            {session && (
              <p className="session-note">
                En clase · {course?.nombre ?? 'curso'} desde {session.start}
              </p>
            )}
            <div className="account-card">
              <Account onChangeRole={onChangeRole} onLock={() => void lock()} />
            </div>
          </div>
        </aside>
      )}
      {(mid || narrow) && (
        <header className="topbar">
          <Brand size="sm" label={narrow ? 'DOCENTE' : null} />
          {mid && (
            <nav aria-label="Navegación docente" className="head-tabs">
              {SHORT_NAV.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className="tab-item"
                  aria-current={view === key ? 'page' : undefined}
                  onClick={() => go(key)}
                >
                  {label}
                </button>
              ))}
            </nav>
          )}
          <div className="topbar-end">
            <SyncPill compact={mid} />
            <button
              type="button"
              className="avatar avatar-button"
              aria-expanded={account}
              aria-label="Cuenta"
              onClick={() => setAccount((open) => !open)}
            >
              PP
            </button>
          </div>
          {account && (
            <div role="dialog" aria-label="Cuenta" className="account-pop">
              {session && (
                <p className="session-note">
                  En clase · {course?.nombre ?? 'curso'} desde {session.start}
                </p>
              )}
              <nav aria-label="Más secciones" className="account-more">
                {NAV.filter(([key]) => !SHORT_NAV.some(([k]) => k === key)).map(
                  ([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="nav-item"
                      aria-current={view === key ? 'page' : undefined}
                      onClick={() => go(key)}
                    >
                      {label}
                    </button>
                  ),
                )}
              </nav>
              <Account
                onChangeRole={onChangeRole}
                onLock={() => void lock()}
              />
            </div>
          )}
        </header>
      )}
      <div
        id="contenido"
        tabIndex={-1}
        className={`teacher-content ${view === 'presentar' || view === 'editor' ? 'is-fixed' : ''}`}
      >
        {!presenting && <SaveBar onNavigate={go} />}
        <ActivitiesContext.Provider value={content.bundle.activities}>
          <Suspense fallback={<p className="app-loading">Cargando…</p>}>
            {page}
          </Suspense>
        </ActivitiesContext.Provider>
      </div>
      {narrow && (
        <nav aria-label="Navegación docente" className="bottom-bar">
          {SHORT_NAV.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-current={view === key ? 'page' : undefined}
              onClick={() => go(key)}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
