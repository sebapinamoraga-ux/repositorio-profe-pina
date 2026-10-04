import { useId, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { Lesson } from '@aula/content-model';
import { verifyLessonPlan } from '@aula/content-model/verify-plan';
import { useContent } from '../content/ContentProvider';
import { findLesson, writeLesson } from '../content/ops';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';

type Tramo = NonNullable<Lesson['tramos']>[number];

const SUBJECTS: [Lesson['subject'], string][] = [
  ['m1', 'PAES M1'],
  ['m2', 'PAES M2'],
  ['fisica', 'Física'],
];

/** Lista editable de textos (objetivos, conocimientos previos, habilidades). */
export function ListField({
  label,
  items,
  onChange,
  suggestions = [],
  placeholder,
  multiline = false,
}: {
  label: string;
  items: readonly string[];
  onChange: (items: string[]) => void;
  suggestions?: readonly string[];
  placeholder?: string;
  /** Textos largos (objetivos, conocimientos previos): se ven completos. */
  multiline?: boolean;
}) {
  const listId = useId();
  const set = (k: number, value: string) =>
    onChange(items.map((item, j) => (j === k ? value : item)));
  return (
    <fieldset className="list-field">
      <legend>{label}</legend>
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {items.map((item, k) => (
        <div key={k} className="list-row">
          {multiline ? (
            <textarea
              aria-label={`${label} ${k + 1}`}
              rows={2}
              value={item}
              placeholder={placeholder}
              onChange={(event) => set(k, event.target.value)}
            />
          ) : (
            <input
              aria-label={`${label} ${k + 1}`}
              value={item}
              list={suggestions.length ? listId : undefined}
              placeholder={placeholder}
              onChange={(event) => set(k, event.target.value)}
            />
          )}
          <button
            type="button"
            className="icon-btn icon-danger"
            aria-label={`Quitar ${label.toLowerCase()} ${k + 1}`}
            onClick={() => onChange(items.filter((_, j) => j !== k))}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" className="link-btn" onClick={() => onChange([...items, ''])}>
        <Plus size={14} aria-hidden="true" /> Agregar
      </button>
    </fieldset>
  );
}

function TramosField({
  lesson,
  onChange,
}: {
  lesson: Lesson;
  onChange: (tramos: Tramo[]) => void;
}) {
  const tramos = lesson.tramos ?? [];
  const ids = lesson.slides.map((file) => file.replace(/\.mdx$/, ''));
  const total = tramos.reduce((sum, t) => sum + t.minutes, 0);
  const set = (k: number, patch: Partial<Tramo>) =>
    onChange(tramos.map((t, j) => (j === k ? { ...t, ...patch } : t)));
  const last = tramos[tramos.length - 1];
  const nextFrom = last ? ids[ids.indexOf(last.to) + 1] : ids[0];
  return (
    <fieldset className="list-field tramos-field">
      <legend>Tramos de la clase (distribución del tiempo, no se proyecta)</legend>
      {tramos.length > 0 && (
        <div className="tramo-row tramo-head" aria-hidden="true">
          <span>Tramo</span>
          <span>Desde</span>
          <span>Hasta</span>
          <span>Min</span>
          <span />
        </div>
      )}
      {tramos.map((tramo, k) => (
        <div key={k} className="tramo-row">
          <input
            aria-label={`Nombre del tramo ${k + 1}`}
            value={tramo.label}
            onChange={(event) => set(k, { label: event.target.value })}
          />
          <select
            aria-label={`Desde (tramo ${k + 1})`}
            value={tramo.from}
            onChange={(event) => set(k, { from: event.target.value })}
          >
            {!ids.includes(tramo.from) && <option value={tramo.from}>{tramo.from}</option>}
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            aria-label={`Hasta (tramo ${k + 1})`}
            value={tramo.to}
            onChange={(event) => set(k, { to: event.target.value })}
          >
            {!ids.includes(tramo.to) && <option value={tramo.to}>{tramo.to}</option>}
            {ids.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            aria-label={`Minutos (tramo ${k + 1})`}
            value={tramo.minutes}
            onChange={(event) => set(k, { minutes: Math.max(0, Number(event.target.value) || 0) })}
          />
          <button
            type="button"
            className="icon-btn icon-danger"
            aria-label={`Quitar tramo ${k + 1}`}
            onClick={() => onChange(tramos.filter((_, j) => j !== k))}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="row">
        <button
          type="button"
          className="link-btn"
          disabled={!ids.length}
          onClick={() =>
            onChange([
              ...tramos,
              {
                label: 'Nuevo tramo',
                from: nextFrom ?? ids[0] ?? '',
                to: ids[ids.length - 1] ?? '',
                minutes: Math.max(0, lesson.duration - total),
              },
            ])
          }
        >
          <Plus size={14} aria-hidden="true" /> Agregar tramo
        </button>
        {tramos.length > 0 && (
          <span className={`small ${total === lesson.duration ? 'muted' : 'text-error'}`}>
            Suman {total} de {lesson.duration} minutos
          </span>
        )}
      </div>
    </fieldset>
  );
}

/** Datos de la clase (lesson.yaml): cada cambio queda pendiente hasta guardar. */
export function LessonDialog({
  lessonId,
  onClose,
}: {
  lessonId: string;
  onClose: () => void;
}) {
  const content = useContent();
  const ui = useUi();
  const [duration, setDuration] = useState<string | null>(null);
  const lesson = findLesson(content.bundle, lessonId);
  if (!lesson) return null;
  const meta = lesson.meta;
  const patch = (value: Partial<Lesson>) =>
    content.edit(writeLesson(content.bundle, lessonId, value));
  const problems = [
    ...content.bundle.problems
      .filter((problem) => problem.path === lesson.path)
      .map((problem) => problem.message),
    ...verifyLessonPlan(meta),
  ];
  const axes = [
    ...new Set(
      content.bundle.curriculum.flatMap((item) => (item.axis ? [item.axis] : [])),
    ),
  ];
  const skills = [
    ...new Set(content.bundle.curriculum.flatMap((item) => item.skills ?? [])),
  ];
  const publish = async (status: Lesson['status']) => {
    if (status === meta.status) return;
    if (
      status === 'published' &&
      !(await ui.confirm({
        title: `¿Publicar «${meta.title}»?`,
        body: 'Al guardar, la clase aparecerá en el sitio público para estudiantes (tarda unos minutos en publicarse).',
        ok: 'Publicar al guardar',
      }))
    )
      return;
    patch({ status });
  };
  return (
    <Modal label="Datos de la clase" onClose={onClose} className="lesson-dialog">
      <div className="modal-head">
        <div>
          <p className="kicker">Datos de la clase · {meta.id}</p>
          <h2>{meta.title || 'Sin título'}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      <div className="lesson-form">
        <label className="field">
          Título
          <input value={meta.title} onChange={(event) => patch({ title: event.target.value })} />
        </label>
        <div className="two-cols">
          <label className="field">
            Asignatura
            <select
              value={meta.subject}
              onChange={(event) => {
                const found = SUBJECTS.find(([key]) => key === event.target.value);
                if (found) patch({ subject: found[0] });
              }}
            >
              {SUBJECTS.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Duración (minutos)
            <input
              type="number"
              min={1}
              value={duration ?? String(meta.duration)}
              onChange={(event) => {
                setDuration(event.target.value);
                const value = Number(event.target.value);
                if (value > 0) patch({ duration: value });
              }}
              onBlur={() => setDuration(null)}
            />
          </label>
        </div>
        <label className="field">
          Eje
          <input
            value={meta.axis}
            list="ejes-curriculares"
            onChange={(event) => patch({ axis: event.target.value })}
          />
          <datalist id="ejes-curriculares">
            {axes.map((axis) => (
              <option key={axis} value={axis} />
            ))}
          </datalist>
        </label>
        <div role="radiogroup" aria-label="Estado en el sitio" className="pill-group">
          <button
            type="button"
            role="radio"
            className="pill"
            aria-checked={meta.status === 'draft'}
            onClick={() => void publish('draft')}
          >
            Borrador (solo docente)
          </button>
          <button
            type="button"
            role="radio"
            className="pill"
            aria-checked={meta.status === 'published'}
            onClick={() => void publish('published')}
          >
            Publicada (visible para estudiantes)
          </button>
        </div>
        <ListField
          multiline
          label="Objetivos"
          items={meta.objectives}
          onChange={(objectives) => patch({ objectives })}
        />
        <ListField
          multiline
          label="Conocimientos previos"
          items={meta.prerequisites}
          onChange={(prerequisites) => patch({ prerequisites })}
        />
        <ListField
          label="Habilidades"
          items={meta.skills}
          suggestions={skills}
          onChange={(value) => patch({ skills: value })}
        />
        <fieldset className="list-field">
          <legend>Referencias curriculares</legend>
          {content.bundle.curriculum.map((item) => (
            <label key={item.id} className="check-row">
              <input
                type="checkbox"
                checked={meta.curriculum.includes(item.id)}
                onChange={(event) =>
                  patch({
                    curriculum: event.target.checked
                      ? [...meta.curriculum, item.id]
                      : meta.curriculum.filter((ref) => ref !== item.id),
                  })
                }
              />
              <span>
                <b>{item.id}</b>
                {item.knowledge?.[0] ? ` · ${item.knowledge[0]}` : ''}
              </span>
            </label>
          ))}
        </fieldset>
        <TramosField lesson={meta} onChange={(tramos) => patch({ tramos })} />
      </div>
      {problems.length > 0 ? (
        <div className="alert alert-warn">
          <b>Para guardar, corrige:</b>
          <ul>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="muted small">Los cambios quedan pendientes hasta que guardes.</p>
      )}
      <div className="modal-actions">
        <button type="button" className="btn btn-ink" onClick={onClose}>
          Listo
        </button>
      </div>
    </Modal>
  );
}
