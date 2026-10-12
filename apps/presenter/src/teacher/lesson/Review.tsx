import { useMemo, useState } from 'react';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { editableRepaso, editableSlides, findLesson } from '../../content/ops';
import { useAula } from '../../store/AulaProvider';
import { pad2 } from '../../store/deck';
import type { EditedSlide, Note } from '../../store/schema';
import { Button } from '../../ui/Button';
import { Card, Notice } from '../../ui/Layout';
import type { LessonIssues } from '../issues';
import { makeNote } from '../notes';
import { NoteItem, useNoteActions } from './NoteItem';

type List = 'laminas' | 'repaso';

function IssueList({
  issues,
  slides,
  list,
  onOpen,
}: {
  issues: LessonIssues;
  slides: readonly EditedSlide[];
  list: List;
  onOpen: (list: List, id: string) => void;
}) {
  if (!issues.bad.length) return null;
  return (
    <ul className="review-list">
      {issues.bad.map((k) => {
        const slide = slides[k];
        if (!slide) return null;
        return (
          <li key={slide.id}>
            <Button variant="quiet" size="sm" onClick={() => onOpen(list, slide.id)}>
              {list === 'repaso' ? `R${k + 1}` : pad2(k + 1)} «{slide.title}»
            </Button>
            <span>{issues.perSlide[k]}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Revisión de la clase: lo que content:check encontró y los comentarios para mejorarla. */
export function Review({
  lessonId,
  issues,
  repasoIssues,
  onOpenDetails,
  onNavigate,
}: {
  lessonId: string;
  issues: LessonIssues | null;
  repasoIssues: LessonIssues | null;
  onOpenDetails: () => void;
  onNavigate: Navigate;
}) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const noteActions = useNoteActions();
  const lesson = findLesson(content.bundle, lessonId);
  const slides = useMemo(() => (lesson ? editableSlides(lesson) : []), [lesson]);
  const repaso = useMemo(() => editableRepaso(lesson), [lesson]);
  const [showApplied, setShowApplied] = useState(false);
  const [draft, setDraft] = useState('');

  const open = (list: List, id: string) =>
    onNavigate('clase', { section: list, slide: id });
  const notes = data.notes.filter((note) => note.lessonId === lessonId);
  const pending = notes.filter((note) => note.status === 'pendiente');
  const applied = notes.length - pending.length;
  const shown = showApplied ? notes : pending;
  const all = [...slides, ...repaso];
  const where = (note: Note) => {
    if (!note.slideId) return 'Toda la clase';
    const k = slides.findIndex((s) => s.id === note.slideId);
    if (k >= 0) return `Lámina ${pad2(k + 1)} «${slides[k]?.title ?? ''}»`;
    const r = repaso.findIndex((s) => s.id === note.slideId);
    if (r >= 0) return `Repaso R${r + 1} «${repaso[r]?.title ?? ''}»`;
    return `Lámina eliminada «${note.slideTitle}»`;
  };
  const add = () => {
    if (!draft.trim()) return;
    dispatch({
      type: 'addNote',
      note: makeNote(data, {
        text: draft,
        lessonId,
        slideId: null,
        slideTitle: '',
        source: 'editor',
      }),
    });
    setDraft('');
  };

  const clean =
    issues &&
    repasoIssues &&
    issues.errors === 0 &&
    repasoIssues.errors === 0 &&
    issues.warnings.length === 0;

  return (
    <div className="ws-page review">
      <Card title="Revisión de contenido">
        {!issues || !repasoIssues ? (
          <p className="muted">Revisando con las reglas de content:check…</p>
        ) : clean ? (
          <Notice tone="ok">
            Sin problemas: las {all.length} láminas compilan, los pasos coinciden y hay como
            máximo una mascota por lámina. Revisa también el estado inicial y el revelado.
          </Notice>
        ) : (
          <>
            {issues.lessonErrors.length > 0 && (
              <Notice tone="error">
                <b>Datos de la clase:</b>
                <ul>
                  {issues.lessonErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                <Button size="sm" onClick={onOpenDetails}>
                  Abrir datos de la clase
                </Button>
              </Notice>
            )}
            <IssueList issues={issues} slides={slides} list="laminas" onOpen={open} />
            <IssueList issues={repasoIssues} slides={repaso} list="repaso" onOpen={open} />
            {issues.warnings.map((warning) => (
              <p key={warning} className="check-line is-warn">
                <b>Aviso</b>
                <span>{warning}</span>
              </p>
            ))}
          </>
        )}
      </Card>

      <Card
        title="Comentarios para mejorar"
        aria-label="Comentarios para mejorar la clase"
        className="review-notes"
      >
        <p className="muted small">
          {pending.length
            ? `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}. Se anotan al proyectar (N), al cerrar una sesión o junto a cada lámina.`
            : notes.length
              ? 'Todo aplicado.'
              : 'Aún no hay comentarios. Se anotan al proyectar (N), al cerrar una sesión o junto a cada lámina.'}
        </p>
        {shown.length > 0 && (
          <ul className="note-list">
            {shown.map((note) => {
              const slideId = note.slideId;
              const list: List | null = !slideId
                ? null
                : slides.some((s) => s.id === slideId)
                  ? 'laminas'
                  : repaso.some((s) => s.id === slideId)
                    ? 'repaso'
                    : null;
              return (
                <NoteItem
                  key={note.id}
                  note={note}
                  heading={
                    list && slideId ? (
                      <Button variant="quiet" size="sm" onClick={() => open(list, slideId)}>
                        {where(note)}
                      </Button>
                    ) : (
                      <span className="review-where">{where(note)}</span>
                    )
                  }
                  {...noteActions(note)}
                />
              );
            })}
          </ul>
        )}
        {applied > 0 && (
          <Button
            variant="quiet"
            size="sm"
            aria-expanded={showApplied}
            onClick={() => setShowApplied((value) => !value)}
          >
            {showApplied
              ? 'Ocultar aplicados'
              : `Ver ${applied} ${applied === 1 ? 'aplicado' : 'aplicados'}`}
          </Button>
        )}
        <div className="note-draft">
          <textarea
            rows={2}
            aria-label="Nuevo comentario para toda la clase"
            placeholder="Anota algo que quieras cambiar en toda la clase…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="row row-end">
            <Button variant="primary" size="sm" disabled={!draft.trim()} onClick={add}>
              Agregar comentario
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
