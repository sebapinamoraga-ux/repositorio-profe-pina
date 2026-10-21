import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Tramo } from '../../../content/ops';
import { FitSlide } from '../../../slides/FitSlide';
import { SlideView } from '../../../slides/SlideView';
import {
  PHASE_NAMES,
  type DeckSlide,
  type LessonMeta,
} from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import { Button } from '../../../ui/Button';
import type { LessonIssues } from '../issues';
import type { DropTarget } from './layout-ops';
import { slideNumber, type SlideListName } from './shared';

/** Miniatura real de una lámina: se monta cuando entra (o está por entrar) en pantalla. */
function Thumb({
  meta,
  deck,
  index,
}: {
  meta: LessonMeta;
  deck: DeckSlide[];
  index: number;
}) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!node || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setSeen(true);
      },
      { rootMargin: '300px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, seen]);
  const item = deck[index];
  return (
    <span ref={setNode} className="thumb-frame" aria-hidden="true">
      {seen && item && (
        <FitSlide mode="width">
          <SlideView
            meta={meta}
            slides={deck}
            index={index}
            step={item.steps}
            print
          />
        </FitSlide>
      )}
    </span>
  );
}

/**
 * Lista de láminas: agrupada por tramos, con miniaturas, arrastre para reordenar (también entre
 * tramos), selección múltiple y los avisos de revisión y comentarios.
 */
export function SlideList({
  listName,
  slides,
  deck,
  meta,
  tramos,
  groups,
  selectedId,
  multi,
  issues,
  pendingFor,
  pendingTotal,
  editable,
  layout,
  onPick,
  onMove,
  onNew,
  onOpenDetails,
}: {
  listName: SlideListName;
  slides: readonly EditedSlide[];
  deck: DeckSlide[];
  meta: LessonMeta;
  /** Tramos de clase.yaml; null si la lista no los tiene. */
  tramos: readonly Tramo[] | null;
  /** Identificadores de cada tramo (o un solo grupo sin encabezado). */
  groups: readonly (readonly string[])[];
  selectedId: string | undefined;
  multi: readonly string[];
  /** Revisión de esta lista (null mientras se revisa). */
  issues: LessonIssues | null;
  pendingFor: (id: string) => number;
  pendingTotal: number;
  editable: boolean;
  layout: 'wide' | 'mid' | 'narrow';
  onPick: (id: string, additive: boolean) => void;
  onMove: (ids: string[], target: DropTarget) => void;
  /** Abre «Nueva lámina»; con un tramo, la agrega al final de ese tramo. */
  onNew: (tramo: number | null) => void;
  onOpenDetails: () => void;
}) {
  const listRef = useRef<HTMLElement>(null);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(new Set());
  const [drag, setDrag] = useState<string[] | null>(null);
  const [over, setOver] = useState<DropTarget | null>(null);
  const byId = new Map(slides.map((slide, k) => [slide.id, k]));
  const indexOf = (id: string) => byId.get(id) ?? 0;
  const selected = selectedId ? indexOf(selectedId) : 0;

  // La lámina elegida desde otra pestaña (un enlace de Revisión o Actividades) queda a la vista.
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);

  /** Siguiente posición de la lista a partir de la selección. */
  const nextIn = (indexes: readonly number[]) =>
    indexes.find((k) => k > selected) ?? indexes[0];
  const notedIndexes = slides
    .map((slide, k) => (pendingFor(slide.id) > 0 ? k : -1))
    .filter((k) => k >= 0);
  const nextNoted = nextIn(notedIndexes);
  const nextBad = issues ? nextIn(issues.bad) : undefined;
  const go = (k: number | undefined) => {
    const id = k === undefined ? undefined : slides[k]?.id;
    if (id) onPick(id, false);
  };

  const minutes =
    tramos?.reduce((sum, tramo) => sum + tramo.minutes, 0) ?? null;
  const total = `${slides.length} ${slides.length === 1 ? 'lámina' : 'láminas'}`;

  const overHere = (tramo: number, at: number) =>
    over?.tramo === tramo && over.at === at;
  const allow = (event: DragEvent, target: DropTarget) => {
    if (!drag || !editable) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (!overHere(target.tramo, target.at)) setOver(target);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    if (drag && over) onMove(drag, over);
    setDrag(null);
    setOver(null);
  };

  const item = (id: string, tramo: number, at: number) => {
    const k = indexOf(id);
    const slide = slides[k];
    const dk = deck[k];
    if (!slide || !dk) return null;
    const count = pendingFor(id);
    const bad = Boolean(issues?.perSlide[k]);
    const picked = multi.includes(id);
    return (
      <li
        key={id}
        className={`thumb-item ${drag?.includes(id) ? 'is-dragging' : ''}`}
        draggable={editable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', id);
          setDrag(multi.length > 1 && multi.includes(id) ? [...multi] : [id]);
        }}
        onDragEnd={() => {
          setDrag(null);
          setOver(null);
        }}
        onDragOver={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          allow(event, {
            tramo,
            at: at + (event.clientY > box.top + box.height / 2 ? 1 : 0),
          });
        }}
        onDrop={drop}
      >
        {overHere(tramo, at) && (
          <span className="drop-line" aria-hidden="true" />
        )}
        <button
          type="button"
          className={`thumb ${picked ? 'is-picked' : ''}`}
          aria-current={id === selectedId ? 'true' : undefined}
          aria-pressed={multi.length > 0 ? picked : undefined}
          onClick={(event) =>
            onPick(id, event.shiftKey || event.ctrlKey || event.metaKey)
          }
        >
          <span className="thumb-n">{slideNumber(listName, k)}</span>
          <span className="thumb-body">
            <span className="thumb-shot">
              <Thumb meta={meta} deck={deck} index={k} />
              {picked && (
                <span className="thumb-check" aria-label="Elegida">
                  <Check size={14} aria-hidden="true" />
                </span>
              )}
              {count > 0 && (
                <span className="flag-note">
                  {count} {count === 1 ? 'com.' : 'coms.'}
                </span>
              )}
              {bad && <span className="flag-bad">Revisar</span>}
            </span>
            <span className="thumb-copy">
              <span className="thumb-title" title={slide.title}>
                {slide.title}
              </span>
              <span className="thumb-meta">
                {slide.steps
                  ? `${slide.steps} ${slide.steps === 1 ? 'paso' : 'pasos'}`
                  : ''}
              </span>
            </span>
            <span className="sr-only">{PHASE_NAMES[slide.phase]}</span>
          </span>
        </button>
        {overHere(tramo, at + 1) && at + 1 === (groups[tramo]?.length ?? 0) && (
          <span className="drop-line is-end" aria-hidden="true" />
        )}
      </li>
    );
  };

  return (
    <aside
      ref={listRef}
      aria-label={
        listName === 'repaso' ? 'Láminas del repaso' : 'Láminas de la clase'
      }
      className={`editor-list is-${layout}`}
    >
      <div className="list-head">
        <p>
          <b>{total}</b>
          {minutes !== null && <span className="muted"> · {minutes} min</span>}
        </p>
        <Button
          variant="add"
          size="sm"
          className="new-slide"
          aria-label={
            listName === 'repaso' ? 'Nueva lámina de repaso' : 'Nueva lámina'
          }
          disabled={!editable}
          onClick={() => onNew(null)}
        >
          + Lámina
        </Button>
      </div>
      {listName === 'repaso' && (
        <div className="editor-repaso-head">
          <p className="kicker">Repaso del estudiante</p>
          <p className="muted small">
            Solo en el celular, bajo «Para seguir explorando»: no se proyectan,
            no salen en el PDF ni cuentan en los tramos.
          </p>
        </div>
      )}
      {listName === 'slides' && issues && issues.lessonErrors.length > 0 && (
        <button
          type="button"
          className="editor-alert is-error"
          onClick={onOpenDetails}
        >
          <b>Datos de la clase: {issues.lessonErrors.length} por corregir</b>
          <span>Abrir datos de la clase →</span>
        </button>
      )}
      {issues && issues.bad.length > 0 && (
        <button
          type="button"
          className="editor-alert is-error"
          onClick={() => go(nextBad)}
        >
          <b>
            {listName === 'repaso' ? 'Repaso' : 'Revisión de la clase'}:{' '}
            {issues.bad.length} {issues.bad.length === 1 ? 'lámina' : 'láminas'}{' '}
            con errores
          </b>
          <span>Ir a la siguiente →</span>
        </button>
      )}
      {listName === 'slides' && pendingTotal > 0 && (
        <button
          type="button"
          className="editor-alert is-note"
          onClick={() => go(nextNoted)}
        >
          <b>
            {pendingTotal}{' '}
            {pendingTotal === 1
              ? 'comentario pendiente'
              : 'comentarios pendientes'}
          </b>
          <span>
            {notedIndexes.length
              ? 'Ir a la siguiente lámina comentada →'
              : 'Son de toda la clase; están bajo la vista previa.'}
          </span>
        </button>
      )}
      <div className="list-groups">
        {groups.map((group, tramo) => {
          const info = tramos?.[tramo];
          const open = !info || !collapsed.has(tramo);
          return (
            <section
              key={tramo}
              className="slist-group"
              aria-label={info ? info.label : undefined}
            >
              {info && (
                <button
                  type="button"
                  className="slist-head"
                  aria-expanded={open}
                  title={info.label}
                  onClick={() =>
                    setCollapsed((prev) => {
                      const next = new Set(prev);
                      if (next.has(tramo)) next.delete(tramo);
                      else next.add(tramo);
                      return next;
                    })
                  }
                  onDragOver={(event) => allow(event, { tramo, at: 0 })}
                  onDrop={drop}
                >
                  {open ? (
                    <ChevronDown size={14} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                  <span className="slist-name">
                    {tramo + 1}. {info.label}
                  </span>
                  <span className="slist-count">
                    {info.minutes} min · {group.length}
                  </span>
                </button>
              )}
              {open && (
                <ul className="thumb-list">
                  {group.map((id, at) => item(id, tramo, at))}
                  <li
                    className="thumb-end"
                    onDragOver={(event) =>
                      allow(event, { tramo, at: group.length })
                    }
                    onDrop={drop}
                  >
                    {overHere(tramo, group.length) && group.length === 0 && (
                      <span className="drop-line" aria-hidden="true" />
                    )}
                    {info && (
                      <button
                        type="button"
                        className="slist-add"
                        disabled={!editable}
                        onClick={() => onNew(tramo)}
                      >
                        <Plus size={14} aria-hidden="true" /> Lámina en este
                        tramo
                      </button>
                    )}
                  </li>
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {layout === 'wide' && (
        <p className="list-foot">
          Arrastra para reordenar · Alt + ↑ ↓ · Mayús + clic para elegir varias
        </p>
      )}
    </aside>
  );
}
