import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ArrowDown, ArrowUp, Download, Trash2, X } from 'lucide-react';
import { phaseSchema } from '@aula/content-model';
import { mascotGallery } from '../app/gallery';
import { TemplateSlide } from '../app/MascotGallery';
import { useContent } from '../content/ContentProvider';
import {
  createLesson,
  editableSlides,
  findLesson,
  planningWrites,
  writeSlides,
} from '../content/ops';
import { buildExport } from '../editor/export';
import type { Field } from '../editor/mdx-fields';
import { makeZip } from '../editor/zip';
import { FitSlide } from '../slides/FitSlide';
import { SlideView } from '../slides/SlideView';
import { useAula } from '../store/AulaProvider';
import {
  deckSlides,
  hasPending,
  lessonMeta,
  pad2,
  PHASE_NAMES,
  skeleton,
  slideFromTemplate,
  toMdx,
} from '../store/deck';
import type { EditedSlide, Note, View } from '../store/schema';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';
import { useLessonIssues } from './issues';
import { LessonDialog } from './LessonForm';
import { makeNote } from './notes';
import { ParamFields } from './ParamForm';
import { ConnectHint } from './SaveBar';

const SLIDE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

type FieldsModule = typeof import('../editor/mdx-fields');

const LAYOUTS: [EditedSlide['layout'], string][] = [
  ['portada', 'Portada'],
  ['concepto', 'Concepto'],
  ['dos-columnas', 'Dos columnas'],
  ['resolucion', 'Resolución'],
  ['ejercicio', 'Ejercicio'],
];
const PRESENCE = { sutil: 'Sutil', pedagogica: 'Pedagógica', marca: 'Marca' } as const;
const SOURCE_LABEL: Record<Note['source'], string> = {
  presentador: 'durante la clase',
  cierre: 'al cerrar la clase',
  editor: 'en el editor',
};

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

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function NoteItem({
  note,
  extra,
  onToggle,
  onRemove,
}: {
  note: Note;
  extra?: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const done = note.status === 'aplicado';
  const meta = [
    extra,
    note.date.split('-').reverse().slice(0, 2).join('-'),
    note.course,
    SOURCE_LABEL[note.source],
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={`note-item ${done ? 'is-done' : ''}`}>
      <p>{note.text}</p>
      <div className="note-item-foot">
        <span>{meta}</span>
        <button type="button" className={`btn btn-small ${done ? '' : 'btn-ok-soft'}`} onClick={onToggle}>
          {done ? 'Reabrir' : 'Marcar como aplicado'}
        </button>
        <button type="button" className="icon-btn icon-danger" aria-label="Eliminar comentario" onClick={onRemove}>
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

export function Editor({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch, snap } = useAula();
  const content = useContent();
  const ui = useUi();
  const { width, ref: rootRef } = useElementWidth();
  const layout = width >= 1100 ? 'wide' : width >= 700 ? 'mid' : 'narrow';
  const lessonId = data.lessonId;
  const meta = lessonMeta(content, lessonId);
  const lesson = findLesson(content.bundle, lessonId);
  const pendingHere = hasPending(content, lessonId);
  const slides = useMemo(() => (lesson ? editableSlides(lesson) : null), [lesson]);
  const [details, setDetails] = useState(false);

  const [fieldsModule, setFieldsModule] = useState<FieldsModule | null>(null);
  useEffect(() => {
    void import('../editor/mdx-fields').then(setFieldsModule);
  }, []);

  const [selected, setSelected] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [picker, setPicker] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftScope, setDraftScope] = useState<'slide' | 'lesson'>('slide');
  const [showApplied, setShowApplied] = useState(false);
  const issues = useLessonIssues(lessonId, pendingHere ? (slides ?? undefined) : undefined);

  const index = slides ? Math.min(selected, Math.max(0, slides.length - 1)) : 0;
  const slide = slides?.[index];
  const deck = useMemo(() => (lesson ? deckSlides(lesson) : []), [lesson]);
  const deferredDeck = useDeferredValue(deck);

  const fields = useMemo<Field[] | 'error' | null>(() => {
    if (!fieldsModule || !slide) return null;
    try {
      return fieldsModule.extractFields(slide.body);
    } catch {
      return 'error';
    }
  }, [fieldsModule, slide]);

  if (!slides) {
    const entry = content.library.entries.find((item) => item.id === lessonId);
    return (
      <main className="page">
        <div className="empty-card editor-empty">
          {!content.canEdit && <ConnectHint onNavigate={onNavigate} />}
          <p className="kicker">Editor</p>
          <h1>{meta.title}</h1>
          <p>Esta clase está por preparar. Parte de la estructura base o de otra clase.</p>
          <div className="row">
            <button
              type="button"
              className="btn btn-ink"
              disabled={!content.canEdit}
              onClick={() =>
                content.edit([
                  ...createLesson(content.bundle, {
                    id: lessonId,
                    title: meta.title,
                    objective: entry?.objective ?? '',
                    slides: skeleton(meta.title, mascotGallery.templates),
                  }),
                  ...planningWrites(content.bundle, content.files, {
                    type: 'updateLesson',
                    id: lessonId,
                    patch: { title: undefined, objective: undefined, mark: 'en-preparacion' },
                  }),
                ])
              }
            >
              Preparar con la estructura base
            </button>
            <button type="button" className="btn" onClick={() => onNavigate('biblioteca')}>
              Elegir otra clase en la biblioteca
            </button>
          </div>
        </div>
      </main>
    );
  }

  const commit = (next: EditedSlide[]) => {
    if (!content.canEdit) {
      ui.toast('Conecta la app con GitHub (Conexión) para editar.');
      return;
    }
    content.edit(writeSlides(content.bundle, lessonId, next));
  };
  const update = (i: number, patch: Partial<EditedSlide>) =>
    commit(slides.map((item, k) => (k === i ? { ...item, ...patch } : item)));
  const pick = (i: number) => {
    setSelected(i);
    setPreview(null);
  };
  const move = (delta: -1 | 1) => {
    const j = index + delta;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    const a = next[index];
    const b = next[j];
    if (!a || !b) return;
    next[index] = b;
    next[j] = a;
    commit(next);
    setSelected(j);
  };
  const duplicate = () => {
    if (!slide) return;
    const next = [...slides];
    next.splice(index + 1, 0, { ...slide, id: uniqueId(`${slide.id}-copia`, slides) });
    commit(next);
    pick(index + 1);
  };
  const remove = () => {
    if (!slide || slides.length < 2) return;
    const undo = content.snap();
    commit(slides.filter((_, k) => k !== index));
    ui.toast(`Lámina ${pad2(index + 1)} «${slide.title}» eliminada`, undo);
  };
  const addFromTemplate = (templateId: string) => {
    const template = mascotGallery.templates.find((t) => t.id === templateId);
    if (!template) return;
    const next = [...slides];
    next.splice(index + 1, 0, slideFromTemplate(template, uniqueId(template.id, slides)));
    commit(next);
    setPicker(false);
    pick(index + 1);
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
    (note) => note.slideId && !slides.some((s) => s.id === note.slideId) && visible(note),
  );
  const applied = notes.length - pending.length;
  const notedIndexes = slides
    .map((s, k) => (pending.some((note) => note.slideId === s.id) ? k : -1))
    .filter((k) => k >= 0);
  const nextNoted = notedIndexes.find((k) => k > index) ?? notedIndexes[0];
  const nextBad = issues ? (issues.bad.find((k) => k > index) ?? issues.bad[0]) : undefined;
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
  const noteHandlers = (note: Note) => ({
    onToggle: () =>
      dispatch({
        type: 'updateNote',
        id: note.id,
        patch: { status: note.status === 'pendiente' ? 'aplicado' : 'pendiente' },
      }),
    onRemove: () => {
      const undo = snap(['notes']);
      dispatch({ type: 'removeNote', id: note.id });
      ui.toast('Comentario eliminado', undo);
    },
  });

  const slideError = issues?.perSlide[index] ?? null;
  const previewStep = slide ? (preview === null || preview > slide.steps ? slide.steps : preview) : 0;
  const pendingFor = (id: string) => pending.filter((note) => note.slideId === id).length;

  const list = (
    <aside aria-label="Láminas de la clase" className={`editor-list is-${layout}`}>
      <div className="editor-list-head">
        {layout === 'wide' && (
          <>
            <p className="kicker">
              {meta.duration} MIN · {meta.subject.toUpperCase()} · {slides.length} LÁMINAS
            </p>
            <p className="editor-lesson-title">{meta.title}</p>
          </>
        )}
        <div className="row">
          <button type="button" className="btn btn-small" onClick={() => setDetails(true)}>
            Datos de la clase
          </button>
          <button type="button" className="btn btn-small" onClick={() => setExporting(true)}>
            <Download size={16} aria-hidden="true" />
            Copia ZIP
          </button>
        </div>
      </div>
      {!content.canEdit && <ConnectHint onNavigate={onNavigate} />}
      {issues && issues.lessonErrors.length > 0 && (
        <button type="button" className="editor-alert is-error" onClick={() => setDetails(true)}>
          <b>Datos de la clase: {issues.lessonErrors.length} por corregir</b>
          <span>Abrir datos de la clase →</span>
        </button>
      )}
      {issues && issues.bad.length > 0 && (
        <button type="button" className="editor-alert is-error" onClick={() => nextBad !== undefined && pick(nextBad)}>
          <b>
            Revisión de la clase: {issues.bad.length}{' '}
            {issues.bad.length === 1 ? 'lámina' : 'láminas'} con errores
          </b>
          <span>Ir a la siguiente →</span>
        </button>
      )}
      {pending.length > 0 && (
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
      {deck.map((item, k) => {
        const count = pendingFor(item.id);
        const bad = Boolean(issues?.perSlide[k]);
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
                  <span className="thumb-n">{pad2(k + 1)}</span>
                  <span>
                    {count > 0 && <span className="flag-note">{count} com.</span>}
                    {bad && <span className="flag-bad">Revisar</span>}
                  </span>
                </span>
                <span className="thumb-frame" aria-hidden="true">
                  <FitSlide mode="width">
                    <SlideView meta={meta} slides={deck} index={k} step={item.steps} print />
                  </FitSlide>
                </span>
              </span>
            ) : (
              <>
                <span className="thumb-n">{pad2(k + 1)}</span>
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
      })}
      <div className="editor-add">
        <button type="button" className="btn-new-slide" onClick={() => setPicker(true)}>
          + Nueva lámina
        </button>
      </div>
    </aside>
  );

  const fieldEditors: ReactNode = (() => {
    if (!slide) return null;
    if (fields === null) return <p className="muted small">Leyendo el contenido…</p>;
    if (fields === 'error')
      return (
        <p className="alert alert-error small">
          El MDX de esta lámina tiene un error de sintaxis. Corrígelo en «MDX de la lámina».
        </p>
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
        <h2>Lámina {pad2(index + 1)}</h2>
        <div className="row">
          <button type="button" className="square-btn" aria-label="Mover antes" disabled={index === 0} onClick={() => move(-1)}>
            <ArrowUp size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="square-btn"
            aria-label="Mover después"
            disabled={index === slides.length - 1}
            onClick={() => move(1)}
          >
            <ArrowDown size={18} aria-hidden="true" />
          </button>
          <button type="button" className="btn btn-small" onClick={duplicate}>
            Duplicar
          </button>
          <button type="button" className="btn btn-small btn-danger-soft" disabled={slides.length < 2} onClick={remove}>
            Eliminar
          </button>
          {layout === 'mid' && (
            <button type="button" className="icon-btn" aria-label="Cerrar propiedades" onClick={() => setPropsOpen(false)}>
              <X size={20} aria-hidden="true" />
            </button>
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
              <button
                type="button"
                className="square-btn"
                aria-label="Menos pasos"
                disabled={slide.steps === 0}
                onClick={() => update(index, { steps: Math.max(0, slide.steps - 1) })}
              >
                −
              </button>
              <span>{slide.steps}</span>
              <button
                type="button"
                className="square-btn"
                aria-label="Más pasos"
                disabled={slide.steps === 12}
                onClick={() => update(index, { steps: Math.min(12, slide.steps + 1) })}
              >
                +
              </button>
            </div>
          </div>
          <SlideIdField
            key={`${lessonId}-${index}`}
            value={slide.id}
            taken={slides.filter((_, k) => k !== index).map((s) => s.id)}
            onCommit={(id) => update(index, { id })}
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
          className="btn btn-ink"
          download={`${slide.id}.mdx`}
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(toMdx(slide))}`}
        >
          Descargar .mdx
        </a>
        {pendingHere && (
          <button type="button" className="btn" onClick={restore}>
            Descartar cambios de esta clase
          </button>
        )}
      </div>
      <p className="muted small props-note">
        Los cambios quedan pendientes en este navegador hasta que los guardes en el
        repositorio.
      </p>
    </section>
  );

  const exportData = exporting && lesson ? buildExport(content.files, lesson) : null;

  return (
    <main ref={rootRef} className={`editor is-${layout}`}>
      {list}
      {slide && (
        <section aria-label="Vista previa" className="editor-preview">
          <div className="preview-bar">
            <span className="kicker-rule small-rule">
              {PHASE_NAMES[slide.phase]} <span aria-hidden="true" /> {pad2(index + 1)}
            </span>
            <div role="group" aria-label="Estado de pasos" className="row">
              {layout === 'mid' && (
                <button type="button" className="btn btn-ink btn-small" aria-expanded={propsOpen} onClick={() => setPropsOpen((open) => !open)}>
                  Propiedades
                </button>
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
                slides={deferredDeck.length === deck.length ? deferredDeck : deck}
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
                    <NoteItem key={note.id} note={note} {...noteHandlers(note)} />
                  ))}
                </ul>
              </>
            )}
            {lessonNotes.length + orphanNotes.length > 0 && (
              <>
                <p className="notes-sub">De toda la clase</p>
                <ul className="note-list">
                  {lessonNotes.map((note) => (
                    <NoteItem key={note.id} note={note} {...noteHandlers(note)} />
                  ))}
                  {orphanNotes.map((note) => (
                    <NoteItem
                      key={note.id}
                      note={note}
                      extra={`Lámina eliminada «${note.slideTitle}»`}
                      {...noteHandlers(note)}
                    />
                  ))}
                </ul>
              </>
            )}
            {applied > 0 && (
              <button type="button" className="link-btn" aria-expanded={showApplied} onClick={() => setShowApplied((v) => !v)}>
                {showApplied ? 'Ocultar aplicados' : `Ver ${applied} ${applied === 1 ? 'aplicado' : 'aplicados'}`}
              </button>
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
                <button type="button" className="btn btn-ink btn-small" disabled={!draft.trim()} onClick={addDraft}>
                  Agregar comentario
                </button>
              </div>
            </div>
          </section>
          <div aria-live="polite" className="editor-check">
            {!issues ? (
              <p className="kicker muted-kicker">Revisión de contenido · revisando…</p>
            ) : slideError ? (
              <>
                <p className="kicker kicker-danger">Revisión de contenido · hay errores</p>
                <p className="check-line is-error">
                  <b>Error</b>
                  <span>{slideError}</span>
                </p>
              </>
            ) : (
              <>
                <p className="kicker kicker-ok">Revisión de contenido · sin problemas</p>
                <p className="muted small">
                  Compila con las reglas de content:check, los pasos coinciden y hay como
                  máximo una mascota. Revisa también el estado inicial y el revelado.
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
      )}
      {props}
      {picker && (
        <Modal label="Elegir plantilla" onClose={() => setPicker(false)} className="picker">
          <div className="modal-head">
            <div>
              <p className="kicker">Nueva lámina después de la {pad2(index + 1)}</p>
              <h2>Elige una plantilla con mascota</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setPicker(false)}>
              <X size={22} aria-hidden="true" />
            </button>
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
      {details && <LessonDialog lessonId={lessonId} onClose={() => setDetails(false)} />}
      {exportData && (
        <Modal label="Copia ZIP" onClose={() => setExporting(false)}>
          <div className="modal-head">
            <div>
              <p className="kicker">Copia de respaldo</p>
              <h2>{meta.title}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setExporting(false)}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <p className="muted modal-lead">
            Descarga un ZIP con <code>lesson.yaml</code> y {slides.length} archivos{' '}
            <code>.mdx</code>, tal como están en la app (incluye los cambios sin guardar).
            No hace falta para publicar: «Guardar en el repositorio» ya lo hace.
          </p>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setExporting(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-ink"
              onClick={() => {
                const zip = makeZip(exportData.files);
                download(`${exportData.folder}.zip`, new Blob([zip], { type: 'application/zip' }));
                setExporting(false);
                ui.toast(`Exportada «${meta.title}» (${exportData.files.length} archivos)`);
              }}
            >
              Descargar ZIP
            </button>
          </div>
        </Modal>
      )}
    </main>
  );
}
