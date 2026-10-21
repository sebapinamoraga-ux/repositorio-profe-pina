import { useEffect, useRef, useState } from 'react';
import { useAula } from '../../../store/AulaProvider';
import { makeNote } from '../../../store/notes';
import type { EditedSlide, Note } from '../../../store/schema';
import { Button } from '../../../ui/Button';
import { findBlockByRef, type Block } from '../editor/blocks';
import type { LessonIssues } from '../issues';
import { NoteItem, useNoteActions } from '../NoteItem';
import { slideNumber, useLessonNotes, type SlideListName } from './shared';

export type SideTab = 'comentarios' | 'revision';

type Scope = 'block' | 'slide' | 'lesson';

/**
 * Panel derecho: los comentarios para mejorar la clase (por bloque, por lámina o de toda la
 * clase) y la revisión de contenido de la lámina y de la clase.
 */
export function SidePanel({
  lessonId,
  listName,
  slides,
  slide,
  blocks,
  selected,
  issues,
  tab,
  focusNote,
  draftSignal = 0,
  layout,
  open,
  onTab,
  onGoSlide,
  onGoBlock,
  onClose,
}: {
  lessonId: string;
  listName: SlideListName;
  slides: readonly EditedSlide[];
  slide: EditedSlide;
  blocks: readonly Block[] | null;
  selected: Block | null;
  issues: LessonIssues | null;
  tab: SideTab;
  /** Comentario que se acaba de elegir en el lienzo. */
  focusNote: string | null;
  /** Cambia cuando se pide «Comentar» sobre el bloque: enfoca el campo con ese ámbito. */
  draftSignal?: number;
  layout: 'wide' | 'mid' | 'narrow';
  open: boolean;
  onTab: (tab: SideTab) => void;
  onGoSlide: (id: string) => void;
  onGoBlock: (index: number) => void;
  onClose: () => void;
}) {
  const { data, dispatch } = useAula();
  const noteActions = useNoteActions();
  const { notes, pending } = useLessonNotes(lessonId);
  const [draft, setDraft] = useState('');
  const [scope, setScope] = useState<Scope>('slide');
  const [showApplied, setShowApplied] = useState(false);
  const focus = useRef<HTMLLIElement | null>(null);
  const draftField = useRef<HTMLTextAreaElement>(null);
  const effective: Scope = scope === 'block' && !selected ? 'slide' : scope;

  useEffect(() => {
    focus.current?.scrollIntoView({ block: 'nearest' });
  }, [focusNote, tab]);
  useEffect(() => {
    if (!draftSignal) return;
    setScope('block');
    draftField.current?.focus();
  }, [draftSignal]);

  const ids = new Set(slides.map((s) => s.id));
  const visible = (note: Note) => note.status === 'pendiente' || showApplied;
  const here = notes.filter(
    (note) => note.slideId === slide.id && visible(note),
  );
  const lesson = notes.filter((note) => !note.slideId && visible(note));
  const orphan = notes.filter(
    (note) => note.slideId && !ids.has(note.slideId) && visible(note),
  );
  const elsewhere = pending.filter(
    (note) =>
      note.slideId && note.slideId !== slide.id && ids.has(note.slideId),
  );
  const applied = notes.length - pending.length;
  const pendingHere = pending.filter(
    (note) => note.slideId === slide.id,
  ).length;

  const add = () => {
    if (!draft.trim()) return;
    const onBlock = effective === 'block' && selected;
    dispatch({
      type: 'addNote',
      note: makeNote(data, {
        text: draft,
        lessonId,
        slideId: effective === 'lesson' ? null : slide.id,
        slideTitle: slide.title,
        source: 'editor',
        ...(onBlock
          ? { blockRef: { index: selected.index, label: selected.summary } }
          : {}),
      }),
    });
    setDraft('');
  };

  /** Dónde está el comentario: el bloque, la lámina o, si el bloque ya no existe, la lámina. */
  const where = (note: Note) => {
    if (!note.blockRef) return 'Sobre la lámina';
    const target = blocks ? findBlockByRef(blocks, note.blockRef) : null;
    return target ? `En «${target.summary}»` : 'Sobre la lámina';
  };
  const item = (note: Note, extra?: string) => {
    const target =
      note.blockRef && blocks ? findBlockByRef(blocks, note.blockRef) : null;
    const other =
      note.slideId && note.slideId !== slide.id
        ? slides.find((s) => s.id === note.slideId)
        : null;
    const heading = other ? (
      <button
        type="button"
        className="note-link"
        onClick={() => onGoSlide(other.id)}
      >
        Lámina {slideNumber(listName, slides.indexOf(other))} · {other.title}
      </button>
    ) : target ? (
      <button
        type="button"
        className="note-link"
        onClick={() => onGoBlock(target.index)}
      >
        {where(note)}
      </button>
    ) : (
      <span>{where(note)}</span>
    );
    return (
      <li
        key={note.id}
        ref={note.id === focusNote ? focus : undefined}
        className={note.id === focusNote ? 'is-focused' : undefined}
      >
        <ul className="note-list">
          <NoteItem
            note={note}
            heading={heading}
            {...(extra ? { extra } : {})}
            {...noteActions(note)}
          />
        </ul>
      </li>
    );
  };

  const errors = issues?.errors ?? 0;
  const slideError = issues?.perSlide[slides.indexOf(slide)] ?? null;
  const badSlides = (issues?.bad ?? []).flatMap((k) =>
    slides[k] ? [{ k, slide: slides[k] }] : [],
  );
  return (
    <section
      aria-label="Comentarios y revisión"
      className={`side-panel is-${layout} ${layout === 'mid' && !open ? 'is-hidden' : ''}`}
    >
      <div className="side-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'comentarios'}
          onClick={() => onTab('comentarios')}
        >
          Comentarios{' '}
          {pendingHere > 0 && (
            <span className="ws-count is-note">{pendingHere}</span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'revision'}
          onClick={() => onTab('revision')}
        >
          Revisión{' '}
          {errors > 0 && <span className="ws-count is-bad">{errors}</span>}
        </button>
        {layout === 'mid' && (
          <Button variant="quiet" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>
      {tab === 'comentarios' ? (
        <div className="side-body" role="tabpanel" aria-label="Comentarios">
          <section
            aria-label="Comentarios para mejorar la clase"
            className="note-draft"
          >
            <textarea
              ref={draftField}
              rows={2}
              aria-label="Nuevo comentario"
              placeholder="Anota algo que quieras cambiar después…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  add();
                }
              }}
            />
            <div
              role="radiogroup"
              aria-label="Sobre qué es el comentario"
              className="pill-group"
            >
              <button
                type="button"
                role="radio"
                aria-checked={effective === 'block'}
                disabled={!selected}
                className="pill pill-small"
                onClick={() => setScope('block')}
              >
                Bloque seleccionado
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={effective === 'slide'}
                className="pill pill-small"
                onClick={() => setScope('slide')}
              >
                Esta lámina
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={effective === 'lesson'}
                className="pill pill-small"
                onClick={() => setScope('lesson')}
              >
                Toda la clase
              </button>
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!draft.trim()}
              onClick={add}
            >
              Agregar comentario
            </Button>
          </section>
          {here.length > 0 && (
            <>
              <p className="notes-sub">En esta lámina</p>
              <ul className="side-notes">{here.map((note) => item(note))}</ul>
            </>
          )}
          {lesson.length + orphan.length > 0 && (
            <>
              <p className="notes-sub">De toda la clase</p>
              <ul className="side-notes">
                {lesson.map((note) => item(note))}
                {orphan.map((note) =>
                  item(note, `Lámina eliminada «${note.slideTitle}»`),
                )}
              </ul>
            </>
          )}
          {elsewhere.length > 0 && (
            <>
              <p className="notes-sub">En otras láminas</p>
              <ul className="side-notes">
                {elsewhere.map((note) => item(note))}
              </ul>
            </>
          )}
          {notes.length === 0 && (
            <p className="muted small">Aún no hay comentarios.</p>
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
        </div>
      ) : (
        <div
          className="side-body"
          role="tabpanel"
          aria-label="Revisión"
          aria-live="polite"
        >
          <div className={`review-card ${slideError ? 'is-bad' : 'is-ok'}`}>
            <p className="kicker">
              {listName === 'repaso' ? 'Lámina de repaso' : 'Lámina'}{' '}
              {slideNumber(listName, slides.indexOf(slide))} ·{' '}
              {!issues
                ? 'revisando…'
                : slideError
                  ? 'hay errores'
                  : 'sin problemas'}
            </p>
            {slideError ? (
              <p className="check-line is-error">
                <b>Error</b>
                <span>{slideError}</span>
              </p>
            ) : (
              issues && (
                <p className="muted small">
                  Compila con las reglas de content:check, los pasos coinciden y
                  hay como máximo una mascota. Revisa también el estado inicial
                  y el revelado.
                </p>
              )
            )}
          </div>
          {issues?.warnings.map((warning) => (
            <p key={warning} className="check-line is-warn">
              <b>Aviso</b>
              <span>{warning}</span>
            </p>
          ))}
          <p className="notes-sub">Toda la clase</p>
          {badSlides.length === 0 ? (
            <p className="muted small">Ninguna lámina con errores.</p>
          ) : (
            <ul className="review-list">
              {badSlides.map(({ k, slide: bad }) => (
                <li key={bad.id} className="review-card is-bad">
                  <p className="kicker">
                    Lámina {slideNumber(listName, k)} · {bad.title}
                  </p>
                  <p className="check-line is-error">
                    <span>{issues?.perSlide[k]}</span>
                  </p>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => onGoSlide(bad.id)}
                  >
                    Ir a la lámina →
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {issues && issues.lessonErrors.length > 0 && (
            <>
              <p className="notes-sub">Datos de la clase</p>
              {issues.lessonErrors.map((message) => (
                <p key={message} className="check-line is-error">
                  <span>{message}</span>
                </p>
              ))}
            </>
          )}
        </div>
      )}
    </section>
  );
}
