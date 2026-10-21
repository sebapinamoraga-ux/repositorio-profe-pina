import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Download, Ellipsis, FileText, Play, Presentation, Search } from 'lucide-react';
import { useRoute } from '../../app/route';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { activityUses, editableRepaso, editableSlides, findLesson } from '../../content/ops';
import { useAula } from '../../store/AulaProvider';
import { useUi } from '../../ui/UiProvider';
import { deckFor, hasPending } from '../../store/deck';
import type { Section } from '../../store/schema';
import { pendingNotes } from '../../store/teacher';
import { Button } from '../../ui/Button';
import { Menu, SplitButton } from '../../ui/Menu';
import { HistoryContext } from './editor-directo/HistoryContext';
import { HistoryMenu } from './editor-directo/HistoryMenu';
import { PublishIndicator } from './editor-directo/PublishIndicator';
import { SearchDialog } from './editor-directo/SearchDialog';
import { useHistory } from './editor-directo/useHistory';
import { useLessonIssues } from './issues';
import { LessonDialog } from './LessonForm';
import { ExportDialog } from './ExportDialog';
import { Summary } from './Summary';

const Editor = lazy(async () => ({
  default: (await import('./editor-directo/EditorDirecto')).EditorDirecto,
}));
const Review = lazy(async () => ({ default: (await import('./Review')).Review }));
const LessonActivities = lazy(async () => ({
  default: (await import('./LessonActivities')).LessonActivities,
}));
const PdfView = lazy(async () => ({ default: (await import('./PdfView')).PdfView }));

const MARK_LABEL = {
  lista: 'Lista',
  'en-preparacion': 'En preparación',
  'por-preparar': 'Por preparar',
} as const;

/**
 * Espacio de una clase: un encabezado con sus acciones y una pestaña por tarea (resumen,
 * láminas, repaso, actividades, revisión y PDF). La pestaña y la lámina viven en la URL.
 */
export function LessonWorkspace({
  lessonId,
  section,
  slideId,
  onNavigate,
}: {
  lessonId: string;
  section: Section;
  slideId: string | null;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const { data } = useAula();
  const { replace } = useRoute();
  const ui = useUi();
  const [details, setDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [searching, setSearching] = useState(false);
  const history = useHistory(lessonId);
  const clearHistory = history.clear;
  const undoLast = history.undoTo;
  const phase = content.saveState.phase;
  const deck = deckFor(content, lessonId);
  const { meta, slides } = deck;
  const lesson = findLesson(content.bundle, lessonId);
  const entry = content.library.entries.find((item) => item.id === lessonId);
  const pendingHere = hasPending(content, lessonId);
  const editable = useMemo(() => (lesson ? editableSlides(lesson) : undefined), [lesson]);
  const repaso = useMemo(() => editableRepaso(lesson), [lesson]);
  // Una sola revisión por clase: el editor y Revisión la reciben.
  const issues = useLessonIssues(lessonId, pendingHere ? editable : undefined);
  const repasoIssues = useLessonIssues(lessonId, pendingHere ? repaso : undefined, 'repaso');
  const activityCount = Object.keys(content.bundle.activities).filter((id) =>
    activityUses(content.bundle, id).some((use) => use.lesson.id === lessonId),
  ).length;
  const notes = pendingNotes(data, lessonId).length;
  const problems = (issues?.errors ?? 0) + (repasoIssues?.errors ?? 0);

  // Publicar o guardar los datos de la clase deja la copia de trabajo en otro punto: lo anterior
  // ya no se puede deshacer con `content.snap()`.
  useEffect(() => {
    if (phase === 'saved') clearHistory();
  }, [phase, clearHistory]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey;
      if (!mod || event.altKey) return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearching(true);
      } else if (event.key.toLowerCase() === 'z' && !event.shiftKey && !typing) {
        const message = undoLast(0);
        if (message) {
          event.preventDefault();
          ui.toast(message);
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [undoLast, ui]);

  const tabs: [Section, string, string | null][] = [
    ['resumen', 'Resumen', null],
    ['laminas', 'Láminas', String(slides.length)],
    ['repaso', 'Repaso', String(repaso.length)],
    ['actividades', 'Actividades', String(activityCount)],
    [
      'revision',
      'Revisión',
      problems ? `${problems} por corregir` : notes ? `${notes} ${notes === 1 ? 'comentario' : 'comentarios'}` : null,
    ],
    ['pdf', 'PDF', null],
  ];
  const here = slides.some((slide) => slide.id === slideId) ? slideId : (slides[0]?.id ?? null);
  const hereIndex = slides.findIndex((slide) => slide.id === here);
  const hereNumber = hereIndex >= 0 ? String(hereIndex + 1).padStart(2, '0') : null;
  const editing = section === 'laminas' || section === 'repaso';
  const open = (next: Section) => onNavigate('clase', { lesson: lessonId, section: next });

  const body = (() => {
    switch (section) {
      case 'resumen':
        return <Summary lessonId={lessonId} onNavigate={onNavigate} />;
      case 'laminas':
      case 'repaso':
        return (
          <Editor
            key={`${lessonId}-${section}`}
            lessonId={lessonId}
            list={section === 'repaso' ? 'repaso' : 'slides'}
            slideId={slideId}
            issues={section === 'repaso' ? repasoIssues : issues}
            onSelect={(id) => replace({ slide: id })}
            onOpenDetails={() => setDetails(true)}
            onNavigate={onNavigate}
          />
        );
      case 'actividades':
        return <LessonActivities lessonId={lessonId} onNavigate={onNavigate} />;
      case 'revision':
        return (
          <Review
            lessonId={lessonId}
            issues={issues}
            repasoIssues={repasoIssues}
            onOpenDetails={() => setDetails(true)}
            onNavigate={onNavigate}
          />
        );
      case 'pdf':
        return <PdfView lessonId={lessonId} />;
    }
  })();

  return (
    <HistoryContext.Provider value={history}>
    <div className="ws">
      <header className="ws-head">
        <div className="ws-title">
          <div className="page-head-kicker">
            <p className="kicker">
              Clase · {MARK_LABEL[entry?.status ?? 'por-preparar']}
            </p>
            <Button variant="quiet" size="sm" onClick={() => onNavigate('clases')}>
              Cambiar clase
            </Button>
          </div>
          <h1>{meta.title}</h1>
        </div>
        <div className="ws-actions">
          <HistoryMenu />
          <PublishIndicator lessonId={lessonId} onNavigate={onNavigate} />
          <span className="ws-sep" aria-hidden="true" />
          <Button size="sm" onClick={() => setSearching(true)} title="Buscar en la clase (Ctrl + K)">
            <Search size={16} aria-hidden="true" />
            Buscar
            <kbd className="ws-kbd">Ctrl K</kbd>
          </Button>
          {lesson && (
            <Menu
              label="Más opciones de la clase"
              entries={[
                {
                  key: 'datos',
                  label: 'Datos de la clase',
                  icon: <FileText size={16} />,
                  onSelect: () => setDetails(true),
                },
                {
                  key: 'zip',
                  label: 'Descargar copia ZIP',
                  icon: <Download size={16} />,
                  onSelect: () => setExporting(true),
                },
              ]}
            >
              <Ellipsis size={18} aria-hidden="true" />
            </Menu>
          )}
          <SplitButton
            variant="present"
            main={{
              disabled: !slides.length,
              onClick: () => onNavigate('presentar', { lesson: lessonId, ...(here ? { slide: here } : {}) }),
              label: (
                <>
                  <Play size={16} aria-hidden="true" />
                  {hereNumber ? `Presentar desde ${hereNumber}` : 'Presentar'}
                </>
              ),
            }}
            arrowLabel="Otras formas de presentar"
            entries={[
              {
                key: 'pantalla',
                label: 'Pantalla completa',
                hint: hereNumber ? `Desde la lámina ${hereNumber}, como en clase` : 'Como en clase',
                icon: <Presentation size={16} />,
                disabled: !slides.length,
                onSelect: () => onNavigate('presentar', { lesson: lessonId, ...(here ? { slide: here } : {}) }),
              },
              {
                key: 'recorrer',
                label: 'Recorrer los pasos aquí',
                hint: 'Sin salir del editor · Esc para terminar',
                icon: <Play size={16} />,
                // Se activa con la edición directa sobre la lámina.
                disabled: true,
                onSelect: () => undefined,
              },
            ]}
          />
        </div>
        <nav aria-label="Secciones de la clase" className="ws-tabs">
          {tabs.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className="ws-tab"
              aria-current={section === key ? 'page' : undefined}
              onClick={() => open(key)}
            >
              {label}
              {count !== null && (
                <span className={`ws-count ${key === 'revision' && problems ? 'is-bad' : ''}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>
      <div className={`ws-body ${editing ? 'is-editor' : ''}`}>
        <Suspense fallback={<p className="app-loading">Cargando…</p>}>{body}</Suspense>
      </div>
      {details && (
        <LessonDialog
          lessonId={lessonId}
          onClose={() => {
            setDetails(false);
            clearHistory();
          }}
        />
      )}
      {exporting && <ExportDialog lessonId={lessonId} onClose={() => setExporting(false)} />}
      {searching && editable && (
        <SearchDialog
          slides={editable}
          onClose={() => setSearching(false)}
          onGo={(id) => onNavigate('clase', { lesson: lessonId, section: 'laminas', slide: id })}
        />
      )}
    </div>
    </HistoryContext.Provider>
  );
}
