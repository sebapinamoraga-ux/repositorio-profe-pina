import { lazy, Suspense, useEffect, useState } from 'react';
import { ActivitiesContext } from '../app/catalog';
import { useViewportWidth } from '../app/route';
import { useContent } from '../content/ContentProvider';
import { useAula } from '../store/AulaProvider';
import type { View } from '../store/schema';
import { Brand } from '../ui/Brand';
import { useUi } from '../ui/UiProvider';
import { SaveBar, SyncPill } from './SaveBar';
import { Today } from './Today';

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

export interface TeacherNav {
  view: View;
  onNavigate: (view: View) => void;
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
        <button type="button" className="btn btn-paper" onClick={onChangeRole}>
          Cambiar rol
        </button>
        <button type="button" className="btn btn-paper" onClick={onLock}>
          Bloquear
        </button>
      </div>
    </>
  );
}

export function TeacherShell({
  view,
  onNavigate,
  onChangeRole,
  onLock,
}: TeacherNav & { onChangeRole: () => void; onLock: () => void }) {
  const { data } = useAula();
  const content = useContent();
  const { confirm } = useUi();
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
  const go = (next: View) => {
    setAccount(false);
    onNavigate(next);
  };

  const page = (() => {
    switch (view) {
      case 'hoy':
        return <Today onNavigate={go} />;
      case 'biblioteca':
        return <Library onNavigate={go} />;
      case 'presentar':
        return <Presenter onNavigate={go} />;
      case 'editor':
        return <Editor onNavigate={go} />;
      case 'galeria':
        return <Gallery onNavigate={go} />;
      case 'cursos':
        return <Courses onNavigate={go} />;
      case 'pdf':
        return <PdfView onNavigate={go} />;
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
