import { useDeferredValue, useState } from 'react';
import { FitSlide } from '../../../slides/FitSlide';
import { SlideView } from '../../../slides/SlideView';
import { useAula } from '../../../store/AulaProvider';
import {
  PHASE_NAMES,
  type DeckSlide,
  type LessonMeta,
} from '../../../store/deck';
import { makeNote } from '../../../store/notes';
import type { EditedSlide, Note } from '../../../store/schema';
import { Button } from '../../../ui/Button';
import type { LessonIssues } from '../issues';
import { NoteItem, useNoteActions } from '../NoteItem';
import { useLessonNotes, type SlideListName } from './shared';

/**
 * Provisional hasta la edición directa: la lámina en solo lectura con sus pasos, los comentarios
 * para mejorar y la revisión de contenido.
 */
export function PreviewPane({
  lessonId,
  listName,
  meta,
  deck,
  index,
  slide,
  slideIds,
  number,
  issues,
  layout,
  propsOpen,
  onToggleProps,
}: {
  lessonId: string;
  listName: SlideListName;
  meta: LessonMeta;
  deck: DeckSlide[];
  index: number;
  slide: EditedSlide;
  /** Identificadores de todas las láminas (clase y repaso), para reconocer comentarios huérfanos. */
  slideIds: ReadonlySet<string>;
  number: string;
  issues: LessonIssues | null;
  layout: 'wide' | 'mid' | 'narrow';
  propsOpen: boolean;
  onToggleProps: () => void;
}) {
  const { data, dispatch } = useAula();
  const noteActions = useNoteActions();
  const { notes, pending } = useLessonNotes(lessonId);
  // El paso que se ve vale solo para la lámina en que se eligió.
  const [preview, setPreview] = useState<{ id: string; n: number } | null>(
    null,
  );
  const [draft, setDraft] = useState('');
  const [draftScope, setDraftScope] = useState<'slide' | 'lesson'>('slide');
  const [showApplied, setShowApplied] = useState(false);
  const deferred = useDeferredValue(deck);

  const visible = (note: Note) => note.status === 'pendiente' || showApplied;
  const slideNotes = notes.filter(
    (note) => note.slideId === slide.id && visible(note),
  );
  const lessonNotes = notes.filter((note) => !note.slideId && visible(note));
  const orphanNotes = notes.filter(
    (note) => note.slideId && !slideIds.has(note.slideId) && visible(note),
  );
  const applied = notes.length - pending.length;
  const addDraft = () => {
    if (!draft.trim()) return;
    dispatch({
      type: 'addNote',
      note: makeNote(data, {
        text: draft,
        lessonId,
        slideId: draftScope === 'slide' ? slide.id : null,
        slideTitle: slide.title,
        source: 'editor',
      }),
    });
    setDraft('');
  };
  const slideError = issues?.perSlide[index] ?? null;
  const chosen = preview?.id === slide.id ? preview.n : null;
  const previewStep =
    chosen === null || chosen > slide.steps ? slide.steps : chosen;

  return (
    <section aria-label="Vista previa" className="editor-preview">
      <div className="preview-bar">
        <span className="kicker-rule small-rule">
          {listName === 'repaso'
            ? 'Repaso del estudiante'
            : PHASE_NAMES[slide.phase]}{' '}
          <span aria-hidden="true" /> {number}
        </span>
        <div role="group" aria-label="Estado de pasos" className="row">
          {layout === 'mid' && (
            <Button
              variant="primary"
              size="sm"
              aria-expanded={propsOpen}
              onClick={onToggleProps}
            >
              Contenido
            </Button>
          )}
          <span className="muted small">Vista</span>
          {Array.from({ length: slide.steps + 1 }, (_, n) => (
            <button
              key={n}
              type="button"
              className="pill"
              aria-pressed={n === previewStep}
              onClick={() => setPreview({ id: slide.id, n })}
            >
              {n === 0
                ? 'Inicial'
                : n === slide.steps
                  ? `Paso ${n} · final`
                  : `Paso ${n}`}
            </button>
          ))}
        </div>
      </div>
      <div className="preview-frame">
        <FitSlide mode="width">
          <SlideView
            meta={meta}
            slides={
              deferred.length === deck.length &&
              deferred[index]?.id === deck[index]?.id
                ? deferred
                : deck
            }
            index={index}
            step={previewStep}
          />
        </FitSlide>
      </div>
      <section
        aria-label="Comentarios para mejorar la clase"
        className={`editor-notes ${pending.length ? 'has-pending' : ''}`}
      >
        <div className="notes-head">
          <p className="kicker">Comentarios para mejorar</p>
          <span className="muted small">
            {pending.length
              ? `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'} en la clase`
              : notes.length
                ? 'Todo aplicado'
                : 'Aún no hay comentarios'}
          </span>
        </div>
        {slideNotes.length > 0 && (
          <>
            <p className="notes-sub">En esta lámina</p>
            <ul className="note-list">
              {slideNotes.map((note) => (
                <NoteItem key={note.id} note={note} {...noteActions(note)} />
              ))}
            </ul>
          </>
        )}
        {lessonNotes.length + orphanNotes.length > 0 && (
          <>
            <p className="notes-sub">De toda la clase</p>
            <ul className="note-list">
              {lessonNotes.map((note) => (
                <NoteItem key={note.id} note={note} {...noteActions(note)} />
              ))}
              {orphanNotes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  extra={`Lámina eliminada «${note.slideTitle}»`}
                  {...noteActions(note)}
                />
              ))}
            </ul>
          </>
        )}
        {applied > 0 && (
          <Button
            variant="quiet"
            size="sm"
            aria-expanded={showApplied}
            onClick={() => setShowApplied((v) => !v)}
          >
            {showApplied
              ? 'Ocultar aplicados'
              : `Ver ${applied} ${applied === 1 ? 'aplicado' : 'aplicados'}`}
          </Button>
        )}
        <div className="note-draft">
          <textarea
            rows={2}
            aria-label="Nuevo comentario"
            placeholder="Anota algo que quieras cambiar después…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                addDraft();
              }
            }}
          />
          <div className="row">
            <div
              role="radiogroup"
              aria-label="Sobre qué es el comentario"
              className="pill-group grow"
            >
              <button
                type="button"
                role="radio"
                aria-checked={draftScope === 'slide'}
                className="pill pill-small"
                onClick={() => setDraftScope('slide')}
              >
                Esta lámina
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={draftScope === 'lesson'}
                className="pill pill-small"
                onClick={() => setDraftScope('lesson')}
              >
                Toda la clase
              </button>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!draft.trim()}
              onClick={addDraft}
            >
              Agregar comentario
            </Button>
          </div>
        </div>
      </section>
      <div aria-live="polite" className="editor-check">
        {!issues ? (
          <p className="kicker kicker--muted">
            Revisión de contenido · revisando…
          </p>
        ) : slideError ? (
          <>
            <p className="kicker kicker--danger">
              Revisión de contenido · hay errores
            </p>
            <p className="check-line is-error">
              <b>Error</b>
              <span>{slideError}</span>
            </p>
          </>
        ) : (
          <>
            <p className="kicker kicker--ok">
              Revisión de contenido · sin problemas
            </p>
            <p className="muted small">
              Compila con las reglas de content:check, los pasos coinciden y hay
              como máximo una mascota. Revisa también el estado inicial y el
              revelado.
            </p>
          </>
        )}
        {issues?.warnings.map((warning) => (
          <p key={warning} className="check-line is-warn">
            <b>Aviso</b>
            <span>{warning}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
