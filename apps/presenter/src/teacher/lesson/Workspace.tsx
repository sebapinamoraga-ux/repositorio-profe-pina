import { lazy, Suspense, useMemo, useState } from 'react';
import { Download, Play } from 'lucide-react';
import { useRoute } from '../../app/route';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { activityUses, editableRepaso, editableSlides, findLesson } from '../../content/ops';
import { useAula } from '../../store/AulaProvider';
import { deckFor, hasPending } from '../../store/deck';
import type { Section } from '../../store/schema';
import { pendingNotes } from '../../store/teacher';
import { Button } from '../../ui/Button';
import { useLessonIssues } from '../issues';
import { LessonDialog } from '../LessonForm';
import { ExportDialog } from './ExportDialog';
import { Summary } from './Summary';

const Editor = lazy(async () => ({ default: (await import('../Editor')).Editor }));
const Review = lazy(async () => ({ default: (await import('./Review')).Review }));
const LessonActivities = lazy(async () => ({
  default: (await import('./LessonActivities')).LessonActivities,
}));
const PdfView = lazy(async () => ({ default: (await import('../PdfView')).PdfView }));

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
  const [details, setDetails] = useState(false);
  const [exporting, setExporting] = useState(false);
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
    <div className="ws">
      <header className="ws-head">
        <div className="ws-title">
          <div className="page-head-kicker">
            <p className="kicker">
              Clase · {MARK_LABEL[entry?.status ?? 'por-preparar']}
            </p>
            <Button variant="quiet" size="sm" onClick={() => onNavigate('biblioteca')}>
              Cambiar clase
            </Button>
          </div>
          <h1>{meta.title}</h1>
        </div>
        <div className="page-actions">
          {lesson && (
            <>
              <Button size="sm" onClick={() => setDetails(true)}>
                Datos de la clase
              </Button>
              <Button size="sm" onClick={() => setExporting(true)}>
                <Download size={16} aria-hidden="true" />
                Copia ZIP
              </Button>
            </>
          )}
          <Button
            variant="present"
            size="sm"
            disabled={!slides.length}
            onClick={() => onNavigate('presentar', { lesson: lessonId })}
          >
            <Play size={16} aria-hidden="true" />
            Presentar
          </Button>
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
      {details && <LessonDialog lessonId={lessonId} onClose={() => setDetails(false)} />}
      {exporting && <ExportDialog lessonId={lessonId} onClose={() => setExporting(false)} />}
    </div>
  );
}
