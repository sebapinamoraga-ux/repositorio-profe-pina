import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { phaseSchema } from '@aula/content-model';
import { mascotGallery } from '../../app/gallery';
import { TemplateSlide } from '../recursos/MascotGallery';
import { useContent } from '../../content/ContentProvider';
import {
  createLesson,
  editableRepaso,
  editableSlides,
  findLesson,
  planningWrites,
  writeRepaso,
  writeSlides,
} from '../../content/ops';
import type { Field } from './editor/mdx-fields';
import { FitSlide } from '../../slides/FitSlide';
import { SlideView } from '../../slides/SlideView';
import { useAula } from '../../store/AulaProvider';
import {
  deckSlides,
  hasPending,
  type DeckSlide,
  lessonMeta,
  pad2,
  PHASE_NAMES,
  skeleton,
  slideFromTemplate,
  toMdx,
} from '../../store/deck';
import type { EditedSlide, Note, View } from '../../store/schema';
import { NoteItem, useNoteActions } from './NoteItem';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';
import type { LessonIssues } from './issues';
import { makeNote } from '../../store/notes';
import { ParamFields } from './ParamForm';
import { Button, buttonClass, IconButton } from '../../ui/Button';
import { Notice } from '../../ui/Layout';

const SLIDE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Lista que se edita: las láminas de la clase o las del repaso del estudiante. */
export type SlideList = 'slides' | 'repaso';

/** Número visible: 01, 02… en la clase; R1, R2… en el repaso. */
const slideNumber = (list: SlideList, k: number) =>
  list === 'repaso' ? `R${k + 1}` : pad2(k + 1);

/** Identificador de lámina: se edita libre y se aplica al salir del campo si es válido y único. */
function SlideIdField({
  value,
  taken,
  onCommit,
}: {
  value: string;
  taken: readonly string[];
  onCommit: (id: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const problem =
    draft === null || draft === value
      ? null
      : !SLIDE_ID.test(draft)
        ? 'Usa minúsculas, números y guiones.'
        : taken.includes(draft)
          ? 'Ya hay una lámina con ese identificador.'
          : null;
  const commit = () => {
    if (draft !== null && draft !== value && !problem) onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="field">
      Identificador
      <input
        className="mono"
        value={text}
        aria-invalid={problem ? true : undefined}
        onChange={(event) =>
          setDraft(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        }
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setDraft(null);
        }}
      />
      {problem && <span className="field-note text-error">{problem}</span>}
    </label>
  );
}

type FieldsModule = typeof import('./editor/mdx-fields');

const LAYOUTS: [EditedSlide['layout'], string][] = [
  ['portada', 'Portada'],
  ['concepto', 'Concepto'],
  ['dos-columnas', 'Dos columnas'],
  ['resolucion', 'Resolución'],
  ['ejercicio', 'Ejercicio'],
];
const PRESENCE = { sutil: 'Sutil', pedagogica: 'Pedagógica', marca: 'Marca' } as const;

/** Ancho del editor (no del viewport): la barra lateral docente le resta espacio. */
function useElementWidth() {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(1300);
  useEffect(() => {
    if (!node) return;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return { width, ref: setNode };
}

function uniqueId(base: string, taken: readonly { id: string }[]) {
  const ids = new Set(taken.map((slide) => slide.id));
  let id = base;
  for (let k = 2; ids.has(id); k++) id = `${base}-${k}`;
  return id;
}

/**
 * Editor de una lista de láminas (la clase o el repaso). La lámina seleccionada la decide la URL
 * (`slideId`); elegir otra la informa con `onSelect`.
 */
export function Editor({
  lessonId,
  list: listName,
  slideId,
  issues: listIssues,
  onSelect,
  onOpenDetails,
  onNavigate,
}: {
  lessonId: string;
  list: SlideList;
  slideId: string | null;
  /** Revisión de esta lista (null mientras se revisa). */
  issues: LessonIssues | null;
  onSelect: (id: string) => void;
  onOpenDetails: () => void;
  onNavigate: (view: View) => void;
}) {
  const { data, dispatch } = useAula();
  const noteActions = useNoteActions();
  const content = useContent();
  const ui = useUi();
  const { width, ref: rootRef } = useElementWidth();
  const layout = width >= 1100 ? 'wide' : width >= 700 ? 'mid' : 'narrow';
  const meta = lessonMeta(content, lessonId);
  const lesson = findLesson(content.bundle, lessonId);
  const pendingHere = hasPending(content, lessonId);
  const slides = useMemo(() => (lesson ? editableSlides(lesson) : null), [lesson]);
  const repaso = useMemo(() => editableRepaso(lesson), [lesson]);

  const [fieldsModule, setFieldsModule] = useState<FieldsModule | null>(null);
  useEffect(() => {
    void import('./editor/mdx-fields').then(setFieldsModule);
  }, []);

  const [preview, setPreview] = useState<number | null>(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftScope, setDraftScope] = useState<'slide' | 'lesson'>('slide');
  const [showApplied, setShowApplied] = useState(false);

  const current = listName === 'repaso' ? repaso : (slides ?? []);
  const found = current.findIndex((item) => item.id === slideId);
  const index = found >= 0 ? found : 0;
  const slide = current[index];
  const deck = useMemo(() => (lesson ? deckSlides(lesson) : []), [lesson]);
  const repasoDeck = useMemo(() => (lesson ? deckSlides(lesson, 'repaso') : []), [lesson]);
  const currentDeck = listName === 'repaso' ? repasoDeck : deck;
  const deferredDeck = useDeferredValue(currentDeck);

  const fields = useMemo<Field[] | 'error' | null>(() => {
    if (!fieldsModule || !slide) return null;
    try {
      return fieldsModule.extractFields(slide.body);
    } catch {
      return 'error';
    }
  }, [fieldsModule, slide]);

  // La lámina elegida desde otra pestaña (un enlace de Revisión o Actividades) queda a la vista.
  const listRef = useRef<HTMLElement>(null);
  const selectedId = current[index]?.id;
  useEffect(() => {
    listRef.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selectedId]);

  if (!slides) {
    const entry = content.library.entries.find((item) => item.id === lessonId);
    return (
      <main className="page">
        <div className="empty-card editor-empty">
          <p className="kicker">Editor</p>
          <h1>{meta.title}</h1>
          <p>Esta clase está por preparar. Parte de la estructura base o de otra clase.</p>
          <div className="row">
            <Button
              variant="primary"
              disabled={!content.canEdit}
              onClick={() =>
                content.edit([
                  ...createLesson(content.bundle, {
                    id: lessonId,
                    title: meta.title,
                    objective: entry?.objective ?? '',
                    slides: skeleton(meta.title, mascotGallery.templates),
                  }),
                  ...planningWrites(content.bundle, content.files, entry?.libraryId ?? null, {
                    type: 'updateLesson',
                    id: lessonId,
                    patch: { title: undefined, objective: undefined, mark: 'en-preparacion' },
                  }),
                ])
              }
            >
              Preparar con la estructura base
            </Button>
            <Button onClick={() => onNavigate('clases')}>
              Elegir otra clase en Clases
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const all = [...slides, ...repaso];
  const commit = (next: EditedSlide[]) => {
    if (!content.canEdit) {
      ui.toast('Conecta la app con GitHub en Ajustes para editar.');
      return;
    }
    content.edit(
      listName === 'repaso'
        ? writeRepaso(content.bundle, lessonId, next)
        : writeSlides(content.bundle, lessonId, next),
    );
  };
  const update = (i: number, patch: Partial<EditedSlide>) =>
    commit(current.map((item, k) => (k === i ? { ...item, ...patch } : item)));
  const select = (id: string | undefined) => {
    if (id) onSelect(id);
    setPreview(null);
  };
  const pick = (i: number) => select(current[i]?.id);
  const number = slideNumber(listName, index);
  const move = (delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= current.length) return;
    const next = [...current];
    const a = next[index];
    const b = next[j];
    if (!a || !b) return;
    next[index] = b;
    next[j] = a;
    commit(next);
  };
  const duplicate = () => {
    if (!slide) return;
    const next = [...current];
    const id = uniqueId(`${slide.id}-copia`, all);
    next.splice(index + 1, 0, { ...slide, id });
    commit(next);
    select(id);
  };
  // La clase conserva al menos una lámina; el repaso puede quedar vacío.
  const canRemove = listName === 'repaso' || slides.length > 1;
  const remove = () => {
    if (!slide || !canRemove) return;
    const undo = content.snap();
    const neighbour = current[index + 1] ?? current[index - 1];
    commit(current.filter((_, k) => k !== index));
    select(neighbour?.id);
    ui.toast(
      `${listName === 'repaso' ? 'Lámina de repaso' : 'Lámina'} ${number} «${slide.title}» eliminada`,
      undo,
    );
  };
  // Una lámina nueva va después de la seleccionada (o primera si la lista está vacía).
  const addFromTemplate = (templateId: string) => {
    const template = mascotGallery.templates.find((t) => t.id === templateId);
    if (!template) return;
    const at = current.length ? index + 1 : 0;
    const id = uniqueId(template.id, all);
    const next = [...current];
    next.splice(at, 0, slideFromTemplate(template, id));
    commit(next);
    setPicker(false);
    select(id);
  };
  const restore = () => {
    if (!lesson) return;
    const undo = content.snap();
    content.discard(content.pending.filter((path) => path.startsWith(`${lesson.dir}/`)));
    ui.toast('Se descartaron los cambios sin guardar de esta clase', undo);
  };

  const notes = data.notes.filter((note) => note.lessonId === lessonId);
  const pending = notes.filter((note) => note.status === 'pendiente');
  const visible = (note: Note) => note.status === 'pendiente' || showApplied;
  const slideNotes = slide ? notes.filter((note) => note.slideId === slide.id && visible(note)) : [];
  const lessonNotes = notes.filter((note) => !note.slideId && visible(note));
  const orphanNotes = notes.filter(
    (note) => note.slideId && !all.some((s) => s.id === note.slideId) && visible(note),
  );
  const applied = notes.length - pending.length;
  const notedIndexes = current
    .map((s, k) => (pending.some((note) => note.slideId === s.id) ? k : -1))
    .filter((k) => k >= 0);
  /** Siguiente posición de la lista a partir de la selección. */
  const nextIn = (indexes: readonly number[]) => indexes.find((k) => k > index) ?? indexes[0];
  const nextNoted = nextIn(notedIndexes);
  const nextBad = listIssues ? nextIn(listIssues.bad) : undefined;
  const addDraft = () => {
    if (!draft.trim() || !slide) return;
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
  const slideError = listIssues?.perSlide[index] ?? null;
  const previewStep = slide ? (preview === null || preview > slide.steps ? slide.steps : preview) : 0;
  const pendingFor = (id: string) => pending.filter((note) => note.slideId === id).length;

  const thumb = (list: DeckSlide[], item: DeckSlide, k: number) => {
    const count = pendingFor(item.id);
    const bad = Boolean(listIssues?.perSlide[k]);
    return (
      <button
        key={`${item.id}-${k}`}
        type="button"
        className={`thumb ${layout === 'mid' ? 'is-image' : ''}`}
        aria-current={k === index ? 'true' : undefined}
        onClick={() => pick(k)}
      >
        {layout === 'mid' ? (
          <span className="thumb-image">
            <span className="thumb-top">
              <span className="thumb-n">{slideNumber(listName, k)}</span>
              <span>
                {count > 0 && <span className="flag-note">{count} com.</span>}
                {bad && <span className="flag-bad">Revisar</span>}
              </span>
            </span>
            <span className="thumb-frame" aria-hidden="true">
              <FitSlide mode="width">
                <SlideView meta={meta} slides={list} index={k} step={item.steps} print />
              </FitSlide>
            </span>
          </span>
        ) : (
          <>
            <span className="thumb-n">{slideNumber(listName, k)}</span>
            <span className="thumb-copy">
              <span className="thumb-title">{item.title}</span>
              <span className="thumb-meta">
                {PHASE_NAMES[item.phase]}
                {item.steps ? ` · ${item.steps} pasos` : ''}
                {count ? ` · ${count} ${count === 1 ? 'comentario' : 'comentarios'}` : ''}
                {bad ? ' · revisar' : ''}
              </span>
            </span>
          </>
        )}
      </button>
    );
  };

  const listPanel = (
    <aside
      ref={listRef}
      aria-label={listName === 'repaso' ? 'Láminas del repaso' : 'Láminas de la clase'}
      className={`editor-list is-${layout}`}
    >
      {listName === 'repaso' && (
        <div className="editor-repaso-head">
          <p className="kicker">Repaso del estudiante</p>
          <p className="muted small">
            Solo en el celular, bajo «Para seguir explorando»: no se proyectan, no salen en el
            PDF ni cuentan en los tramos.
          </p>
        </div>
      )}
      {listName === 'slides' && listIssues && listIssues.lessonErrors.length > 0 && (
        <button type="button" className="editor-alert is-error" onClick={onOpenDetails}>
          <b>Datos de la clase: {listIssues.lessonErrors.length} por corregir</b>
          <span>Abrir datos de la clase →</span>
        </button>
      )}
      {listIssues && listIssues.bad.length > 0 && (
        <button type="button" className="editor-alert is-error" onClick={() => nextBad !== undefined && pick(nextBad)}>
          <b>
            {listName === 'repaso' ? 'Repaso' : 'Revisión de la clase'}: {listIssues.bad.length}{' '}
            {listIssues.bad.length === 1 ? 'lámina' : 'láminas'} con errores
          </b>
          <span>Ir a la siguiente →</span>
        </button>
      )}
      {listName === 'slides' && pending.length > 0 && (
        <button
          type="button"
          className="editor-alert is-note"
          onClick={() => nextNoted !== undefined && pick(nextNoted)}
        >
          <b>
            {pending.length} {pending.length === 1 ? 'comentario pendiente' : 'comentarios pendientes'}
          </b>
          <span>
            {notedIndexes.length
              ? 'Ir a la siguiente lámina comentada →'
              : 'Son de toda la clase; están bajo la vista previa.'}
          </span>
        </button>
      )}
      {currentDeck.map((item, k) => thumb(currentDeck, item, k))}
      <div className="editor-add">
        <Button variant="add" block className="new-slide" onClick={() => setPicker(true)}>
          {listName === 'repaso' ? '+ Lámina de repaso' : '+ Nueva lámina'}
        </Button>
      </div>
    </aside>
  );

  const fieldEditors: ReactNode = (() => {
    if (!slide) return null;
    if (fields === null) return <p className="muted small">Leyendo el contenido…</p>;
    if (fields === 'error')
      return (
        <Notice tone="error" className="small">
          El MDX de esta lámina tiene un error de sintaxis. Corrígelo en «MDX de la lámina».
        </Notice>
      );
    let lastGroup: string | null = null;
    return fields.map((field, k) => {
      const newGroup = field.group !== lastGroup;
      lastGroup = field.group;
      const change = (value: string) => {
        const current = fieldsModule?.extractFields(slide.body)[k];
        if (!current || current.kind === 'fixed' || current.kind === 'params' || !fieldsModule)
          return;
        update(index, { body: fieldsModule.spliceField(slide.body, current, value) });
      };
      if (field.kind === 'params')
        return (
          <div key={`${k}-${field.group}-${field.label}`} className={`field-block ${newGroup && k ? 'is-new-group' : ''}`}>
            {newGroup && field.group && <p className="field-group">{field.group}</p>}
            <ParamFields
              field={field}
              activities={content.bundle.activities}
              steps={slide.steps}
              onChange={(name, value) => {
                const current = fieldsModule?.extractFields(slide.body)[k];
                if (!current || current.kind !== 'params' || !fieldsModule) return;
                const body = fieldsModule.setParam(slide.body, current, name, value);
                const patch: Partial<EditedSlide> = { body };
                if (current.component === 'PreguntaPAES' && name === 'id' && typeof value === 'string')
                  patch.activities = [
                    ...new Set([...slide.activities.filter((a) => a !== current.attrs.id?.value), value]),
                  ];
                update(index, patch);
              }}
            />
          </div>
        );
      return (
        <div key={`${k}-${field.group}-${field.label}`} className={`field-block ${newGroup && k ? 'is-new-group' : ''}`}>
          {newGroup && field.group && <p className="field-group">{field.group}</p>}
          <label className="field-plain">
            {field.label}
            {field.kind === 'text' && (
              <textarea
                className="mono"
                rows={Math.min(8, Math.max(2, Math.ceil(field.value.length / 42) + (field.value.match(/\n/g)?.length ?? 0)))}
                value={field.value}
                onChange={(event) => change(event.target.value)}
              />
            )}
            {field.kind === 'attr' && (
              <input value={field.value} onChange={(event) => change(event.target.value)} />
            )}
            {field.kind === 'template' && (
              <select value={field.value} onChange={(event) => change(event.target.value)}>
                {mascotGallery.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {PRESENCE[t.mascot.nivel]}
                  </option>
                ))}
              </select>
            )}
            {field.kind === 'fixed' && <span className="field-fixed">{field.value}</span>}
          </label>
        </div>
      );
    });
  })();

  const props = slide && (
    <section
      aria-label="Propiedades de la lámina"
      className={`editor-props is-${layout} ${layout === 'mid' && !propsOpen ? 'is-hidden' : ''}`}
    >
      <div className="props-head">
        <h2>{listName === 'repaso' ? `Lámina de repaso ${number}` : `Lámina ${number}`}</h2>
        <div className="row">
          <IconButton outline label="Mover antes" disabled={index === 0} onClick={() => move(-1)}>
            <ArrowUp size={18} aria-hidden="true" />
          </IconButton>
          <IconButton
            outline
            label="Mover después"
            disabled={index === current.length - 1}
            onClick={() => move(1)}
          >
            <ArrowDown size={18} aria-hidden="true" />
          </IconButton>
          <Button size="sm" onClick={duplicate}>
            Duplicar
          </Button>
          <Button variant="danger" size="sm" disabled={!canRemove} onClick={remove}>
            Eliminar
          </Button>
          {layout === 'mid' && (
            <IconButton label="Cerrar propiedades" onClick={() => setPropsOpen(false)}>
              <X size={20} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>
      <div className="props-grid">
        <label className="field">
          Título
          <input value={slide.title} onChange={(event) => update(index, { title: event.target.value })} />
        </label>
        <div className="two-cols">
          <label className="field">
            Momento
            <select
              value={slide.phase}
              onChange={(event) => {
                const phase = phaseSchema.safeParse(event.target.value);
                if (phase.success) update(index, { phase: phase.data });
              }}
            >
              {Object.entries(PHASE_NAMES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Diseño
            <select
              value={slide.layout}
              onChange={(event) => {
                const found = LAYOUTS.find(([key]) => key === event.target.value);
                if (found) update(index, { layout: found[0] });
              }}
            >
              {LAYOUTS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="two-cols align-end">
          <div className="field">
            Pasos revelables
            <div className="stepper">
              <IconButton
                outline
                label="Menos pasos"
                disabled={slide.steps === 0}
                onClick={() => update(index, { steps: Math.max(0, slide.steps - 1) })}
              >
                −
              </IconButton>
              <span>{slide.steps}</span>
              <IconButton
                outline
                label="Más pasos"
                disabled={slide.steps === 12}
                onClick={() => update(index, { steps: Math.min(12, slide.steps + 1) })}
              >
                +
              </IconButton>
            </div>
          </div>
          <SlideIdField
            key={`${lessonId}-${listName}-${index}`}
            value={slide.id}
            taken={all.filter((s) => s !== slide).map((s) => s.id)}
            onCommit={(id) => {
              update(index, { id });
              select(id);
            }}
          />
        </div>
      </div>
      <div className="props-fields">
        <p className="kicker">Contenido de los bloques</p>
        {fieldEditors}
        <p className="muted small">
          Usa $…$ para fórmulas, **…** para destacar y líneas «1. » para listas. El color de
          cada bloque lo define su función.
        </p>
        <details className="mdx-advanced">
          <summary>MDX de la lámina</summary>
          <textarea
            className="mono"
            rows={14}
            aria-label="MDX de la lámina"
            value={slide.body}
            onChange={(event) => update(index, { body: event.target.value })}
          />
        </details>
      </div>
      <div className="props-foot">
        <a
          className={buttonClass({ variant: 'primary' })}
          download={`${slide.id}.mdx`}
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(toMdx(slide))}`}
        >
          Descargar .mdx
        </a>
        {pendingHere && (
          <Button onClick={restore}>
            Descartar cambios de esta clase
          </Button>
        )}
      </div>
      <p className="muted small props-note">
        Los cambios quedan pendientes en este navegador hasta que los guardes en el
        repositorio.
      </p>
    </section>
  );

  return (
    <main ref={rootRef} className={`editor is-${layout}`}>
      {listPanel}
      {!slide && (
        <section aria-label="Vista previa" className="editor-preview">
          <p className="empty-note">
            {listName === 'repaso'
              ? 'El repaso aún no tiene láminas. Agrega una para que el estudiante siga explorando en el celular.'
              : 'Esta clase aún no tiene láminas.'}
          </p>
        </section>
      )}
      {slide && (
        <section aria-label="Vista previa" className="editor-preview">
          <div className="preview-bar">
            <span className="kicker-rule small-rule">
              {listName === 'repaso' ? 'Repaso del estudiante' : PHASE_NAMES[slide.phase]}{' '}
              <span aria-hidden="true" /> {number}
            </span>
            <div role="group" aria-label="Estado de pasos" className="row">
              {layout === 'mid' && (
                <Button variant="primary" size="sm" aria-expanded={propsOpen} onClick={() => setPropsOpen((open) => !open)}>
                  Propiedades
                </Button>
              )}
              <span className="muted small">Vista</span>
              {Array.from({ length: slide.steps + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  className="pill"
                  aria-pressed={n === previewStep}
                  onClick={() => setPreview(n)}
                >
                  {n === 0 ? 'Inicial' : n === slide.steps ? `Paso ${n} · final` : `Paso ${n}`}
                </button>
              ))}
            </div>
          </div>
          <div className="preview-frame">
            <FitSlide mode="width">
              <SlideView
                meta={meta}
                slides={
                  deferredDeck.length === currentDeck.length &&
                  deferredDeck[index]?.id === currentDeck[index]?.id
                    ? deferredDeck
                    : currentDeck
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
              <Button variant="quiet" size="sm" aria-expanded={showApplied} onClick={() => setShowApplied((v) => !v)}>
                {showApplied ? 'Ocultar aplicados' : `Ver ${applied} ${applied === 1 ? 'aplicado' : 'aplicados'}`}
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
                <div role="radiogroup" aria-label="Sobre qué es el comentario" className="pill-group grow">
                  <button type="button" role="radio" aria-checked={draftScope === 'slide'} className="pill pill-small" onClick={() => setDraftScope('slide')}>
                    Esta lámina
                  </button>
                  <button type="button" role="radio" aria-checked={draftScope === 'lesson'} className="pill pill-small" onClick={() => setDraftScope('lesson')}>
                    Toda la clase
                  </button>
                </div>
                <Button variant="primary" size="sm" disabled={!draft.trim()} onClick={addDraft}>
                  Agregar comentario
                </Button>
              </div>
            </div>
          </section>
          <div aria-live="polite" className="editor-check">
            {!listIssues ? (
              <p className="kicker kicker--muted">Revisión de contenido · revisando…</p>
            ) : slideError ? (
              <>
                <p className="kicker kicker--danger">Revisión de contenido · hay errores</p>
                <p className="check-line is-error">
                  <b>Error</b>
                  <span>{slideError}</span>
                </p>
              </>
            ) : (
              <>
                <p className="kicker kicker--ok">Revisión de contenido · sin problemas</p>
                <p className="muted small">
                  Compila con las reglas de content:check, los pasos coinciden y hay como
                  máximo una mascota. Revisa también el estado inicial y el revelado.
                </p>
              </>
            )}
            {listIssues?.warnings.map((warning) => (
              <p key={warning} className="check-line is-warn">
                <b>Aviso</b>
                <span>{warning}</span>
              </p>
            ))}
          </div>
        </section>
      )}
      {props}
      {picker && (
        <Modal label="Elegir plantilla" onClose={() => setPicker(false)} className="picker">
          <div className="modal-head">
            <div>
              <p className="kicker">
                {listName === 'repaso' ? 'Nueva lámina de repaso' : 'Nueva lámina'}
                {current.length ? ` después de la ${number}` : ''}
              </p>
              <h2>Elige una plantilla con mascota</h2>
            </div>
            <IconButton label="Cerrar" onClick={() => setPicker(false)}>
              <X size={22} aria-hidden="true" />
            </IconButton>
          </div>
          <div className="picker-grid">
            {mascotGallery.templates.map((template) => (
              <button key={template.id} type="button" className="picker-card" onClick={() => addFromTemplate(template.id)}>
                <TemplateSlide template={template} compact />
                <span>
                  <b>{template.title}</b>
                  <span>
                    {template.slideType} · {PRESENCE[template.mascot.nivel]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </main>
  );
}
