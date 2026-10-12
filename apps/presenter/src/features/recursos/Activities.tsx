import { useMemo, useState, type FormEvent } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { activitySchema, type Activity } from '@aula/content-model';
import { zodMessage } from '@aula/content-model/content-files';
import { verifyActivity } from '@aula/content-model/verify-model';
import { solveLinearSystem } from '@aula/interactives/linear-system';
import { useContent } from '../../content/ContentProvider';
import { activityUses, removeActivity, writeActivity } from '../../content/ops';
import type { Navigate } from '../../app/routes';
import { slugify } from '../../store/teacher';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';
import { ListField } from '../clase/LessonForm';
import { Button, IconButton } from '../../ui/Button';
import { Notice, Page, PageHeader } from '../../ui/Layout';

type Option = NonNullable<Activity['options']>[number];
type Equation = [number, number, number];

const LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Problemas de una actividad en edición: esquema y coherencia matemática. */
export function activityProblems(activity: Activity): string[] {
  const parsed = activitySchema.safeParse(activity);
  if (!parsed.success) return [zodMessage(parsed.error)];
  return verifyActivity(parsed.data);
}

function blankActivity(id: string, type: Activity['type']): Activity {
  return {
    id,
    type,
    prompt: '',
    answer: '',
    solution: '',
    skills: ['Resolver problemas'],
    source: { kind: 'original', reference: 'Elaboración propia.' },
    ...(type === 'paes'
      ? {
          options: LETTERS.slice(0, 4).map((letter, k) => ({
            id: letter,
            text: '',
            correct: k === 0,
            explanation: '',
          })),
        }
      : {}),
  };
}

function NumberCell({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      className="mono"
      value={draft ?? String(value)}
      onChange={(event) => {
        setDraft(event.target.value);
        const n = Number(event.target.value.replace(',', '.').replace('−', '-'));
        if (event.target.value.trim() !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

export function ActivityForm({
  initial,
  isNew,
  onClose,
}: {
  initial: Activity;
  isNew: boolean;
  onClose: () => void;
}) {
  const content = useContent();
  const ui = useUi();
  const [draft, setDraft] = useState<Activity>(initial);
  const problems = useMemo(() => activityProblems(draft), [draft]);
  const set = (patch: Partial<Activity>) => setDraft((current) => ({ ...current, ...patch }));
  const options = draft.options ?? [];
  const setOption = (k: number, patch: Partial<Option>) =>
    set({ options: options.map((option, j) => (j === k ? { ...option, ...patch } : option)) });
  const model = draft.model;
  const solution =
    model &&
    solveLinearSystem(
      { a: model.equations[0][0], b: model.equations[0][1], c: model.equations[0][2] },
      { a: model.equations[1][0], b: model.equations[1][1], c: model.equations[1][2] },
    );
  const setEquation = (row: 0 | 1, col: 0 | 1 | 2, value: number) => {
    if (!model) return;
    const equations: [Equation, Equation] = [
      [...model.equations[0]],
      [...model.equations[1]],
    ];
    equations[row][col] = value;
    set({ model: { equations } });
  };
  const toggleModel = (on: boolean) => {
    if (on)
      set({
        model: { equations: [[1, 1, 0], [1, -1, 0]] },
        options: options.map((option) => ({ ...option, pair: option.pair ?? [0, 0] })),
      });
    else {
      const next = { ...draft };
      delete next.model;
      next.options = options.map((option) => {
        const copy = { ...option };
        delete copy.pair;
        return copy;
      });
      setDraft(next);
    }
  };
  const correct = options.find((option) => option.correct);
  const apply = () => {
    content.edit(writeActivity(content.bundle, content.files, draft));
    ui.toast(`Actividad «${draft.id}» ${isNew ? 'creada' : 'actualizada'}; queda pendiente hasta guardar.`);
    onClose();
  };
  return (
    <Modal label="Editar actividad" onClose={onClose} className="activity-dialog">
      <div className="modal-head">
        <div>
          <p className="kicker">{isNew ? 'Nueva actividad' : 'Actividad'} · {draft.id}</p>
          <h2>{draft.type === 'paes' ? 'Pregunta tipo PAES' : 'Pregunta abierta'}</h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="lesson-form">
        <label className="field">
          Enunciado
          <textarea rows={3} value={draft.prompt} onChange={(event) => set({ prompt: event.target.value })} />
        </label>
        {draft.type === 'paes' && (
          <fieldset className="list-field">
            <legend>Alternativas (marca la correcta)</legend>
            {options.map((option, k) => (
              <div key={option.id} className="option-edit">
                <div className="option-row">
                  <label className="check-row">
                    <input
                      type="radio"
                      name="correcta"
                      checked={option.correct}
                      onChange={() =>
                        set({
                          options: options.map((o, j) => ({ ...o, correct: j === k })),
                        })
                      }
                    />
                    <b>{option.id}</b>
                  </label>
                  <input
                    aria-label={`Texto de la alternativa ${option.id}`}
                    value={option.text}
                    onChange={(event) => setOption(k, { text: event.target.value })}
                  />
                  {options.length > 4 && (
                    <IconButton
                      danger
                      label={`Quitar alternativa ${option.id}`}
                      onClick={() =>
                        set({
                          options: options
                            .filter((_, j) => j !== k)
                            .map((o, j) => ({ ...o, id: LETTERS[j] ?? o.id })),
                        })
                      }
                    >
                      <Trash2 size={16} aria-hidden="true" />
                    </IconButton>
                  )}
                </div>
                <textarea
                  rows={2}
                  aria-label={`Explicación de la alternativa ${option.id}`}
                  placeholder={option.correct ? 'Por qué es correcta' : 'Qué error refleja'}
                  value={option.explanation}
                  onChange={(event) => setOption(k, { explanation: event.target.value })}
                />
                {model && (
                  <div className="pair-row small">
                    Par (x, y):
                    <NumberCell
                      label={`x de la alternativa ${option.id}`}
                      value={option.pair?.[0] ?? 0}
                      onChange={(x) => setOption(k, { pair: [x, option.pair?.[1] ?? 0] })}
                    />
                    <NumberCell
                      label={`y de la alternativa ${option.id}`}
                      value={option.pair?.[1] ?? 0}
                      onChange={(y) => setOption(k, { pair: [option.pair?.[0] ?? 0, y] })}
                    />
                  </div>
                )}
              </div>
            ))}
            {options.length < 5 && (
              <Button
                variant="quiet" size="sm"
                onClick={() =>
                  set({
                    options: [
                      ...options,
                      {
                        id: LETTERS[options.length] ?? 'E',
                        text: '',
                        correct: false,
                        explanation: '',
                        ...(model ? { pair: [0, 0] as [number, number] } : {}),
                      },
                    ],
                  })
                }
              >
                <Plus size={14} aria-hidden="true" /> Agregar alternativa
              </Button>
            )}
          </fieldset>
        )}
        <label className="field">
          Respuesta
          <input value={draft.answer} onChange={(event) => set({ answer: event.target.value })} />
          {correct && !draft.answer.startsWith(correct.id) && (
            <Button
              variant="quiet" size="sm"
              onClick={() => set({ answer: `${correct.id} · ${correct.text}` })}
            >
              Usar «{correct.id} · {correct.text}»
            </Button>
          )}
        </label>
        <label className="field">
          Solución
          <textarea rows={3} value={draft.solution} onChange={(event) => set({ solution: event.target.value })} />
        </label>
        <ListField label="Habilidades" items={draft.skills} onChange={(skills) => set({ skills })} />
        <div className="two-cols">
          <label className="field">
            Fuente
            <select
              value={draft.source.kind}
              onChange={(event) =>
                set({
                  source: {
                    ...draft.source,
                    kind: event.target.value === 'oficial' ? 'oficial' : 'original',
                  },
                })
              }
            >
              <option value="original">Elaboración propia</option>
              <option value="oficial">Oficial (DEMRE)</option>
            </select>
          </label>
          <label className="field">
            Referencia
            <input
              value={draft.source.reference}
              onChange={(event) => set({ source: { ...draft.source, reference: event.target.value } })}
            />
          </label>
        </div>
        <fieldset className="list-field">
          <legend>Sistema 2×2 del enunciado (opcional)</legend>
          <label className="check-row">
            <input type="checkbox" checked={Boolean(model)} onChange={(event) => toggleModel(event.target.checked)} />
            <span>Comprobar las alternativas contra un sistema ax + by = c</span>
          </label>
          {model && (
            <>
              {([0, 1] as const).map((row) => (
                <div key={row} className="equation-row">
                  <NumberCell label={`a${row + 1}`} value={model.equations[row][0]} onChange={(v) => setEquation(row, 0, v)} />
                  <span>x +</span>
                  <NumberCell label={`b${row + 1}`} value={model.equations[row][1]} onChange={(v) => setEquation(row, 1, v)} />
                  <span>y =</span>
                  <NumberCell label={`c${row + 1}`} value={model.equations[row][2]} onChange={(v) => setEquation(row, 2, v)} />
                </div>
              ))}
              <p className="muted small">
                {solution
                  ? `Solución del sistema: (${solution.x}, ${solution.y}).`
                  : 'El sistema no tiene solución única.'}
              </p>
            </>
          )}
        </fieldset>
      </div>
      {problems.length > 0 ? (
        <Notice tone="warn">
          <b>Antes de aplicar, corrige:</b>
          <ul>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Notice>
      ) : (
        <Notice tone="ok" className="small">Comprobación sin problemas.</Notice>
      )}
      <div className="modal-actions">
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={problems.length > 0} onClick={apply}>
          Aplicar cambios
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Fila de una actividad: tipo, enunciado y las láminas que la usan, cada una con un enlace a su
 * lugar en el editor. `lessonId` limita esos enlaces a una clase.
 */
export function ActivityRow({
  activity,
  lessonId,
  onEdit,
  onRemove,
  onNavigate,
}: {
  activity: Activity;
  lessonId?: string;
  onEdit: () => void;
  onRemove?: () => void;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const all = activityUses(content.bundle, activity.id);
  const uses = lessonId ? all.filter((use) => use.lesson.id === lessonId) : all;
  return (
    <li className="lesson-row">
      <div className="lesson-main">
        <div className="lesson-copy">
          <div className="lesson-title">
            <h3>{activity.id}</h3>
            <span className="mark-chip">{activity.type === 'paes' ? 'PAES' : 'Abierta'}</span>
          </div>
          <p className="lesson-objective" title={activity.prompt}>
            {activity.prompt}
          </p>
          {uses.length ? (
            <p className="activity-uses">
              <span className="muted small">En</span>
              {uses.map((use) => (
                <Button
                  key={`${use.lesson.id}-${use.slide.id}`}
                  variant="quiet"
                  size="sm"
                  onClick={() =>
                    onNavigate('clase', {
                      lesson: use.lesson.id,
                      section: use.list === 'repaso' ? 'repaso' : 'laminas',
                      slide: use.slide.id,
                    })
                  }
                >
                  {use.list === 'repaso'
                    ? `Repaso R${use.index + 1}`
                    : `Lámina ${String(use.index + 1).padStart(2, '0')}`}{' '}
                  «{use.slide.title}»{lessonId ? '' : ` · ${use.lesson.title}`}
                </Button>
              ))}
            </p>
          ) : (
            <p className="muted small">Ninguna lámina la usa todavía.</p>
          )}
        </div>
        {content.canEdit && (
          <div className="row">
            <Button variant="primary" size="sm" onClick={onEdit}>
              Editar
            </Button>
            {onRemove && (
              <IconButton
                outline
                danger
                label={`Eliminar ${activity.id}`}
                disabled={all.length > 0}
                title={all.length ? 'Primero quítala de las láminas que la usan.' : undefined}
                onClick={onRemove}
              >
                <Trash2 size={18} aria-hidden="true" />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** Banco de actividades (content/activities): preguntas abiertas y tipo PAES. */
export function Activities({ onNavigate }: { onNavigate: Navigate }) {
  const content = useContent();
  const ui = useUi();
  const [editing, setEditing] = useState<{ activity: Activity; isNew: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Activity['type']>('paes');
  const list = Object.values(content.bundle.activities).sort((a, b) => a.id.localeCompare(b.id));

  const create = (event: FormEvent) => {
    event.preventDefault();
    const id = slugify(title, new Set(Object.keys(content.bundle.activities)));
    setCreating(false);
    setTitle('');
    setEditing({ activity: blankActivity(id, type), isNew: true });
  };
  const remove = (activity: Activity) => {
    const undo = content.snap();
    content.edit(removeActivity(content.bundle, activity.id));
    ui.toast(`Actividad «${activity.id}» eliminada`, undo);
  };

  return (
    <Page>
        <PageHeader
          kicker="Banco de actividades"
          title="Actividades y preguntas PAES"
          lead="Las láminas las muestran con el bloque «Pregunta PAES». Cada cambio se comprueba igual que en content:check antes de aplicarse."
          actions={
            content.canEdit && (
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
              <Plus size={18} aria-hidden="true" /> Nueva actividad
            </Button>
            )
          }
        />
        {creating && (
          <form className="add-form" onSubmit={create}>
            <label className="field">
              Nombre corto (se usa como identificador)
              <input value={title} placeholder="p. ej. Arriendo de bicicletas" onChange={(event) => setTitle(event.target.value)} />
            </label>
            <div role="radiogroup" aria-label="Tipo" className="pill-group">
              <button type="button" role="radio" className="pill" aria-checked={type === 'paes'} onClick={() => setType('paes')}>
                Tipo PAES
              </button>
              <button type="button" role="radio" className="pill" aria-checked={type === 'abierta'} onClick={() => setType('abierta')}>
                Abierta
              </button>
            </div>
            <div className="row row-end">
              <Button size="sm" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!title.trim()}>
                Crear
              </Button>
            </div>
          </form>
        )}
        <ul className="activity-list">
          {list.map((activity) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              onEdit={() => setEditing({ activity, isNew: false })}
              onRemove={() => remove(activity)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      {editing && (
        <ActivityForm
          key={editing.activity.id}
          initial={editing.activity}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      )}
    </Page>
  );
}
