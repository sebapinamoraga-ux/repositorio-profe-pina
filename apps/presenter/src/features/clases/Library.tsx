import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Settings2, Trash2, X } from 'lucide-react';
import { mascotGallery } from '../../app/gallery';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import {
  entriesIn,
  formatPlanDate,
  unitsIn,
  UNPLANNED_UNIT,
  type LibraryEntry,
  type PlanningAction,
} from '../../content/library';
import {
  copyLesson,
  createLesson,
  createLibrary,
  defaultLibraryId,
  editableSlides,
  findLesson,
  planningOf,
  planningWrites,
  removeLessonFiles,
  removeLibrary,
  writeLesson,
  writePlanning,
} from '../../content/ops';
import { useAula } from '../../store/AulaProvider';
import { hasSlides, lessonEntry, skeleton } from '../../store/deck';
import { ORIGINAL_LESSON_ID } from '../../store/seed';
import type { LessonMark, Section } from '../../store/schema';
import { pendingNotes, slugify, uid } from '../../store/teacher';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';
import { useLessonIssues } from '../clase/issues';
import { LessonDialog } from '../clase/LessonForm';
import { TodayCard } from './TodayCard';
import { Button, IconButton } from '../../ui/Button';
import { Notice, Page, PageHeader } from '../../ui/Layout';

/** Aplica cambios de la planificación de una biblioteca sobre el contenido efectivo. */
function usePlanning(libraryId: string) {
  const content = useContent();
  return (...actions: PlanningAction[]) =>
    content.edit(planningWrites(content.bundle, content.files, libraryId, ...actions));
}

/** Identificadores de clase ya usados, en cualquier biblioteca. */
function takenIds(content: ReturnType<typeof useContent>) {
  return new Set([
    ...content.library.entries.map((item) => item.id),
    ...content.bundle.lessons.map((item) => item.meta.id),
  ]);
}

type Filter = 'todas' | LessonMark;
const FILTERS: [Filter, string][] = [
  ['todas', 'Todas'],
  ['lista', 'Listas'],
  ['en-preparacion', 'En preparación'],
  ['por-preparar', 'Por preparar'],
];
const MARK: Record<LessonMark, string> = {
  lista: 'Lista',
  'en-preparacion': 'En preparación',
  'por-preparar': 'Por preparar',
};

function LessonRow({
  entry,
  libraryId,
  organizing,
  first,
  last,
  menuOpen,
  editing,
  onMenu,
  onEditing,
  onPrepare,
  onDetails,
  onCopy,
  onNavigate,
}: {
  entry: LibraryEntry;
  /** Biblioteca abierta: la de la clase o, si ninguna la planifica, la que la recibe. */
  libraryId: string;
  organizing: boolean;
  first: boolean;
  last: boolean;
  menuOpen: boolean;
  editing: boolean;
  onMenu: (open: boolean) => void;
  onEditing: (open: boolean) => void;
  onPrepare: () => void;
  onDetails: () => void;
  onCopy: () => void;
  onNavigate: Navigate;
}) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const planning = usePlanning(libraryId);
  const { library, canEdit } = content;
  const ui = useUi();
  const has = hasSlides(content, entry.id);
  const issues = useLessonIssues(entry.id);
  const count = issues?.count ?? lessonEntry(content, entry.id)?.slides.length ?? 0;
  const original = entry.id === ORIGINAL_LESSON_ID;
  const planned = entry.unitId !== UNPLANNED_UNIT.id;
  const units = unitsIn(library, libraryId);
  const firstUnit = units.find((u) => u.id !== UNPLANNED_UNIT.id)?.id ?? 'u1';
  const others = library.libraries.some((item) => item.id !== libraryId);
  const active = data.lessonId === entry.id;
  const notes = pendingNotes(data, entry.id).length;
  const blocked = !issues || issues.errors > 0;
  const check = !issues
    ? 'revisando…'
    : issues.errors
      ? `${issues.bad.length} con errores`
      : issues.warnings.length
        ? `${issues.warnings.length} ${issues.warnings.length === 1 ? 'aviso' : 'avisos'}`
        : 'sin problemas';
  const checkTone = !issues
    ? ''
    : issues.errors
      ? 'is-error'
      : issues.warnings.length
        ? 'is-warn'
        : 'is-ok';

  const open = (section: Section) => onNavigate('clase', { lesson: entry.id, section });
  const setTitle = (title: string) =>
    findLesson(content.bundle, entry.id)
      ? content.edit(writeLesson(content.bundle, entry.id, { title }))
      : planning({ type: 'updateLesson', id: entry.id, patch: { title } });
  const setObjective = (objective: string) => {
    const lesson = findLesson(content.bundle, entry.id);
    if (!lesson)
      return planning({ type: 'updateLesson', id: entry.id, patch: { objective } });
    const objectives = [...lesson.meta.objectives];
    objectives[0] = objective;
    content.edit(writeLesson(content.bundle, entry.id, { objectives }));
  };
  // La fecha vive en la planificación; en cada biblioteca, cada día tiene una sola clase.
  const setDate = (date: string) => {
    const taken = entriesIn(library, libraryId).find(
      (item) => item.id !== entry.id && item.date === date,
    );
    if (date && taken) {
      ui.toast(`Ese día ya está planificada «${taken.title}».`);
      return;
    }
    planning(
      ...(planned
        ? []
        : [{ type: 'addLesson' as const, unitId: firstUnit, lesson: { id: entry.id } }]),
      { type: 'updateLesson', id: entry.id, patch: { date: date || undefined } },
    );
  };
  // La marca vive en la planificación: una clase «Sin unidad» entra a la primera unidad.
  const setMark = (mark: LessonMark) => {
    planning(
      ...(planned
        ? []
        : [{ type: 'addLesson' as const, unitId: firstUnit, lesson: { id: entry.id } }]),
      { type: 'updateLesson', id: entry.id, patch: { mark } },
    );
    onMenu(false);
  };
  const duplicate = () => {
    const lesson = findLesson(content.bundle, entry.id);
    if (!lesson) return;
    const taken = takenIds(content);
    let id = `${entry.id}-copia`;
    for (let k = 2; taken.has(id); k++) id = `${entry.id}-copia-${k}`;
    const title = `${entry.title} (copia)`;
    content.edit([
      ...createLesson(content.bundle, {
        id,
        title,
        objective: entry.objective,
        slides: editableSlides(lesson),
        base: lesson.meta,
      }),
      ...planningWrites(content.bundle, content.files, libraryId, {
        type: 'addLesson',
        unitId: planned ? entry.unitId : firstUnit,
        lesson: { id },
        after: entry.id,
      }),
    ]);
    onMenu(false);
    ui.toast(`«${entry.title}» duplicada como «${title}»`);
  };
  const remove = () => {
    const undo = content.snap();
    content.edit([
      ...removeLessonFiles(content.bundle, content.files, entry.id),
      ...planningWrites(content.bundle, content.files, entry.libraryId, {
        type: 'removeLesson',
        id: entry.id,
      }),
    ]);
    if (data.lessonId === entry.id)
      dispatch({ type: 'openLesson', id: ORIGINAL_LESSON_ID });
    onMenu(false);
    ui.toast(
      has ? `«${entry.title}» eliminada` : `«${entry.title}» quitada de Clases`,
      undo,
    );
  };

  return (
    <article
      className={`lesson-row mark-${entry.status} ${active ? 'is-active' : ''}`}
    >
      <div className="lesson-main">
        <div className="lesson-copy">
          {editing ? (
            <div className="lesson-edit">
              <label className="field">
                Título
                <input
                  value={entry.title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="field">
                Objetivo
                <textarea
                  rows={2}
                  value={entry.objective}
                  onChange={(event) => setObjective(event.target.value)}
                />
              </label>
              <label className="field">
                Fecha de la clase
                <input
                  type="date"
                  value={entry.date ?? ''}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <div className="lesson-title">
                {entry.date && (
                  <time className="date-chip" dateTime={entry.date}>
                    {formatPlanDate(entry.date, 'short')}
                  </time>
                )}
                <h3>{entry.title || 'Sin título'}</h3>
                {active && <span className="badge-active">Última abierta</span>}
              </div>
              <p className="lesson-objective" title={entry.objective}>
                {entry.objective || 'Sin objetivo todavía.'}
              </p>
            </>
          )}
        </div>
        <div className="lesson-side">
          <span className={`mark-chip mark-${entry.status}`}>
            <i aria-hidden="true" />
            {MARK[entry.status]}
          </span>
          {notes > 0 && (
            <button type="button" className="notes-chip" onClick={() => open('revision')}>
              {notes === 1 ? '1 comentario pendiente' : `${notes} comentarios pendientes`}
            </button>
          )}
          {has && (
            <span className="lesson-count">
              {count} láminas · <span className={`check ${checkTone}`}>{check}</span>
            </span>
          )}
          {organizing ? (
            <div className="row">
              <label className="unit-move">
                Unidad
                <select
                  aria-label={`Mover «${entry.title}» a otra unidad`}
                  value={entry.unitId}
                  onChange={(event) => {
                    const undo = content.snap();
                    planning({ type: 'setLessonUnit', id: entry.id, unitId: event.target.value });
                    const k = units.findIndex((u) => u.id === event.target.value);
                    ui.toast(`«${entry.title}» movida a la unidad ${k + 1}`, undo);
                  }}
                >
                  {units.map((unit, k) => (
                    <option
                      key={unit.id}
                      value={unit.id}
                      disabled={unit.id === UNPLANNED_UNIT.id}
                    >
                      {k + 1} · {unit.title}
                    </option>
                  ))}
                </select>
              </label>
              <IconButton
                outline
                label={`Subir «${entry.title}»`}
                disabled={first || !planned}
                onClick={() => planning({ type: 'moveLesson', id: entry.id, delta: -1 })}
              >
                <ChevronUp size={18} aria-hidden="true" />
              </IconButton>
              <IconButton
                outline
                label={`Bajar «${entry.title}»`}
                disabled={last || !planned}
                onClick={() => planning({ type: 'moveLesson', id: entry.id, delta: 1 })}
              >
                <ChevronDown size={18} aria-hidden="true" />
              </IconButton>
              {!original && (
                <IconButton
                  outline danger
                  label={`Eliminar «${entry.title}»`}
                  onClick={remove}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </IconButton>
              )}
            </div>
          ) : editing ? (
            <Button variant="primary" size="sm" onClick={() => onEditing(false)}>
              Listo
            </Button>
          ) : (
            <div className="row">
              {!has && canEdit && (
                <Button variant="primary" size="sm" onClick={onPrepare}>
                  Preparar
                </Button>
              )}
              {has && (
                <Button
                  variant={entry.status === 'lista' ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => open('laminas')}
                >
                  Editar
                </Button>
              )}
              {has && entry.status === 'lista' && (
                <Button variant="present" size="sm" onClick={() => onNavigate('presentar', { lesson: entry.id })}>
                  Presentar
                </Button>
              )}
              {canEdit && (
                <IconButton
                  outline className="more-btn"
                  aria-expanded={menuOpen}
                  label={`Más acciones para ${entry.title}`}
                  onClick={() => onMenu(!menuOpen)}
                >
                  ⋯
                </IconButton>
              )}
            </div>
          )}
        </div>
      </div>
      {menuOpen && !organizing && (
        <div role="group" aria-label="Más acciones" className="lesson-menu">
          <Button
            size="sm"
            onClick={() => {
              onEditing(true);
              onMenu(false);
            }}
          >
            Editar título, objetivo y fecha
          </Button>
          {has && (
            <Button
              size="sm"
              onClick={() => {
                onDetails();
                onMenu(false);
              }}
            >
              Datos de la clase
            </Button>
          )}
          {has && (
            <Button size="sm" onClick={duplicate}>
              Duplicar
            </Button>
          )}
          {others && (
            <Button
              size="sm"
              onClick={() => {
                onCopy();
                onMenu(false);
              }}
            >
              Copiar a otra biblioteca
            </Button>
          )}
          {has && entry.status === 'en-preparacion' && (
            <>
              <Button
                size="sm"
                disabled={blocked}
                aria-describedby={issues?.errors ? `why-${entry.id}` : undefined}
                onClick={() => setMark('lista')}
              >
                Marcar como lista
              </Button>
              {issues && issues.errors > 0 && (
                <p id={`why-${entry.id}`} className="menu-why">
                  Para marcarla como lista, corrige primero los errores de revisión en el
                  editor.
                </p>
              )}
            </>
          )}
          {entry.status === 'lista' && !original && (
            <Button
              size="sm"
              onClick={() => setMark('en-preparacion')}
            >
              Volver a preparación
            </Button>
          )}
          {!original && (
            <Button variant="danger" size="sm" onClick={remove}>
              {has ? 'Eliminar clase' : 'Quitar de Clases'}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

function PrepareDialog({
  entry,
  libraryId,
  onClose,
  onNavigate,
}: {
  entry: LibraryEntry;
  libraryId: string;
  onClose: () => void;
  onNavigate: Navigate;
}) {
  const { data } = useAula();
  const content = useContent();
  const sources = content.library.entries.filter((item) => hasSlides(content, item.id));
  // Se puede partir de una clase de cualquier biblioteca: la de esta, primero.
  const groups = [
    ...[...content.library.libraries]
      .sort((a, b) => Number(b.id === libraryId) - Number(a.id === libraryId))
      .map((item) => ({ id: item.id, title: item.title })),
    { id: null, title: 'Sin biblioteca' },
  ]
    .map((group) => ({
      ...group,
      items: sources.filter((item) => item.libraryId === group.id),
    }))
    .filter((group) => group.items.length);
  const [mode, setMode] = useState<'base' | 'other'>('base');
  const [source, setSource] = useState(
    (sources.find((item) => item.id === data.lessonId) ?? sources[0])?.id ?? '',
  );
  const confirm = () => {
    const from = mode === 'other' ? findLesson(content.bundle, source) : undefined;
    const slides = from
      ? editableSlides(from)
      : skeleton(entry.title, mascotGallery.templates);
    // lesson.yaml pasa a ser la fuente del título y el objetivo.
    content.edit([
      ...createLesson(content.bundle, {
        id: entry.id,
        title: entry.title,
        objective: entry.objective,
        slides,
        base: from?.meta,
      }),
      ...planningWrites(content.bundle, content.files, entry.libraryId, {
        type: 'updateLesson',
        id: entry.id,
        patch: { title: undefined, objective: undefined, mark: 'en-preparacion' },
      }),
    ]);
    onClose();
    onNavigate('clase', { lesson: entry.id, section: 'laminas' });
  };
  return (
    <Modal label="Preparar clase" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="kicker">Preparar clase</p>
          <h2>{entry.title}</h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <div role="radiogroup" aria-label="Punto de partida" className="choice-list">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'base'}
          className="choice"
          onClick={() => setMode('base')}
        >
          <b>Estructura base</b>
          <span>
            Cinco láminas con mascota, una por momento: inicio, activación, desarrollo,
            práctica y cierre. La portada lleva el título de la clase.
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'other'}
          className="choice"
          disabled={!sources.length}
          onClick={() => setMode('other')}
        >
          <b>Partir de otra clase</b>
          <span>
            Copia sus láminas para adaptarlas, también desde otra biblioteca. La clase original
            no cambia.
          </span>
        </button>
      </div>
      {mode === 'other' && (
        <label className="field">
          Clase de origen
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            {groups.map((group) => (
              <optgroup key={group.id ?? ''} label={group.title}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      <div className="modal-actions">
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={confirm}>
          Crear y abrir en editor
        </Button>
      </div>
    </Modal>
  );
}

function CopyDialog({
  entry,
  libraryId,
  onClose,
  onNavigate,
}: {
  entry: LibraryEntry;
  libraryId: string;
  onClose: () => void;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const { library } = content;
  const ui = useUi();
  const targets = library.libraries.filter((item) => item.id !== libraryId);
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  const unitTitle =
    unitsIn(library, libraryId).find((unit) => unit.id === entry.unitId && unit !== UNPLANNED_UNIT)
      ?.title ?? 'Clases copiadas';
  const destination = targets.find((item) => item.id === target);
  const confirm = () => {
    if (!destination) return;
    const { writes } = copyLesson(content.bundle, content.files, {
      id: entry.id,
      title: entry.title,
      objective: entry.objective,
      unitTitle,
      libraryId: destination.id,
      taken: takenIds(content),
    });
    content.edit(writes);
    onClose();
    onNavigate('clases', { library: destination.id });
    ui.toast(`«${entry.title}» copiada a «${destination.title}»`);
  };
  return (
    <Modal label="Copiar a otra biblioteca" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="kicker">Copiar a otra biblioteca</p>
          <h2>{entry.title}</h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <p className="muted modal-lead">
        La copia lleva sus láminas y su repaso, y queda en preparación en la unidad «{unitTitle}»
        de la otra biblioteca. Cada copia se edita por separado: esta clase no cambia.
      </p>
      <label className="field">
        Biblioteca de destino
        <select value={target} onChange={(event) => setTarget(event.target.value)}>
          {targets.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      <div className="modal-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!destination} onClick={confirm}>
          Copiar clase
        </Button>
      </div>
    </Modal>
  );
}

function RemoveUnitDialog({
  unitId,
  libraryId,
  onClose,
}: {
  unitId: string;
  libraryId: string;
  onClose: () => void;
}) {
  const content = useContent();
  const { library } = content;
  const ui = useUi();
  const units = unitsIn(library, libraryId);
  const k = units.findIndex((u) => u.id === unitId);
  const unit = units[k];
  const lessons = entriesIn(library, libraryId).filter((entry) => entry.unitId === unitId);
  const hasOriginal = lessons.some((entry) => entry.id === ORIGINAL_LESSON_ID);
  const targets = units.filter((u) => u.id !== unitId && u.id !== UNPLANNED_UNIT.id);
  const [mode, setMode] = useState<'move' | 'all'>(targets.length ? 'move' : 'all');
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  if (!unit) return null;
  const confirm = () => {
    const undo = content.snap();
    if (mode === 'move' && target) {
      content.edit(
        planningWrites(content.bundle, content.files, libraryId, {
          type: 'removeUnit',
          id: unitId,
          targetId: target,
        }),
      );
      const n = units.findIndex((u) => u.id === target) + 1;
      ui.toast(`Unidad «${unit.title}» eliminada; sus clases pasaron a la unidad ${n}`, undo);
    } else {
      if (hasOriginal) return;
      content.edit([
        ...lessons.flatMap((entry) =>
          removeLessonFiles(content.bundle, content.files, entry.id),
        ),
        ...planningWrites(content.bundle, content.files, libraryId, {
          type: 'removeUnit',
          id: unitId,
          targetId: null,
        }),
      ]);
      ui.toast(`Unidad «${unit.title}» y sus clases eliminadas`, undo);
    }
    onClose();
  };
  return (
    <Modal label="Eliminar unidad" onClose={onClose}>
      <div>
        <p className="kicker kicker--danger">Eliminar unidad {k + 1}</p>
        <h2>{unit.title}</h2>
        <p className="muted modal-lead">
          {lessons.length === 1 ? 'Tiene 1 clase' : `Tiene ${lessons.length} clases`}. ¿Qué
          hacemos con ellas?
        </p>
      </div>
      <div role="radiogroup" aria-label="Qué hacer con las clases" className="choice-list">
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'move'}
          className="choice"
          disabled={!targets.length}
          onClick={() => setMode('move')}
        >
          <b>Moverlas a otra unidad</b>
          <span>Se conservan sus láminas, comentarios y estado.</span>
        </button>
        {mode === 'move' && (
          <select
            className="input"
            aria-label="Unidad de destino"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            {targets.map((u) => (
              <option key={u.id} value={u.id}>
                Unidad {units.indexOf(u) + 1} · {u.title}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          role="radio"
          aria-checked={mode === 'all'}
          className="choice choice-danger"
          disabled={hasOriginal}
          onClick={() => setMode('all')}
        >
          <b>Eliminarlas también</b>
          <span className={hasOriginal ? 'text-error' : ''}>
            {hasOriginal
              ? 'No disponible: contiene «Sistemas de ecuaciones lineales», la clase base del proyecto.'
              : 'Se borran sus láminas. Podrás deshacerlo durante unos segundos.'}
          </span>
        </button>
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger-strong" onClick={confirm}>
          Eliminar unidad
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Elección de biblioteca: cada una (un curso, el canal de YouTube…) es un archivo de
 * content/planning con sus propias clases. En modo organizar se renombra o elimina.
 */
function LibraryBar({
  libraryId,
  organizing,
  onNavigate,
}: {
  libraryId: string;
  organizing: boolean;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const { library, canEdit } = content;
  const ui = useUi();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);
  const current = library.libraries.find((item) => item.id === libraryId);
  const owned = library.entries.filter((entry) => entry.libraryId === libraryId).length;
  // En solo lectura, con una sola biblioteca no hay nada que elegir.
  if (library.libraries.length < 2 && !canEdit) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const { id, writes } = createLibrary(content.bundle, content.files, title);
    content.edit(writes);
    setAdding(false);
    setTitle('');
    onNavigate('clases', { library: id });
    ui.toast(`Biblioteca «${title.trim()}» creada`);
  };
  const rename = (next: string) =>
    content.edit(
      writePlanning(content.bundle, content.files, libraryId, {
        ...planningOf(content.bundle, libraryId),
        title: next,
      }),
    );
  const remove = () => {
    if (!current) return;
    const undo = content.snap();
    content.edit(removeLibrary(content.bundle, libraryId));
    onNavigate('clases');
    ui.toast(`Biblioteca «${current.title}» eliminada`, undo);
  };

  return (
    <div className="library-bar">
      {organizing && canEdit && current ? (
        <div className="library-rename">
          <label className="field">
            Nombre de la biblioteca
            <input
              className="input"
              value={current.title === current.id ? '' : current.title}
              placeholder={current.id}
              onChange={(event) => rename(event.target.value)}
            />
          </label>
          <Button
            variant="danger"
            size="sm"
            disabled={owned > 0}
            title={owned > 0 ? 'Solo se elimina una biblioteca sin clases.' : undefined}
            onClick={remove}
          >
            Eliminar biblioteca
          </Button>
        </div>
      ) : (
        <div role="group" aria-label="Biblioteca" className="pill-group">
          {library.libraries.map((item) => (
            <button
              key={item.id}
              type="button"
              className="pill"
              aria-pressed={item.id === libraryId}
              onClick={() => onNavigate('clases', { library: item.id })}
            >
              {item.title}
            </button>
          ))}
          {canEdit && !adding && (
            <button
              type="button"
              className="pill pill-add"
              onClick={() => {
                setAdding(true);
                setTitle('');
              }}
            >
              + Nueva biblioteca
            </button>
          )}
        </div>
      )}
      {adding && (
        <form className="add-form add-unit" onSubmit={submit}>
          <label className="field">
            <span>
              Nombre de la biblioteca{' '}
              <span className="field-note">
                (es público: usa uno genérico, sin datos de tus cursos)
              </span>
            </span>
            <input
              ref={inputRef}
              value={title}
              placeholder="p. ej. Canal de YouTube"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="row">
            <Button
              onClick={() => {
                setAdding(false);
                setTitle('');
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={!title.trim()}>
              Crear biblioteca
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export function Library({
  libraryId: wanted,
  onNavigate,
}: {
  libraryId: string | null;
  onNavigate: Navigate;
}) {
  const content = useContent();
  const { data } = useAula();
  const { canEdit } = content;
  const all = content.library;
  // La biblioteca sale de la URL; sin ella, la de la última clase abierta o la primera.
  const libraryId =
    (wanted && all.libraries.some((item) => item.id === wanted) ? wanted : null) ??
    all.entries.find((entry) => entry.id === data.lessonId)?.libraryId ??
    defaultLibraryId(content.bundle);
  const library = {
    libraries: all.libraries,
    units: unitsIn(all, libraryId),
    entries: entriesIn(all, libraryId),
  };
  const libraryTitle =
    all.libraries.find((item) => item.id === libraryId)?.title ?? 'M1 · Álgebra y funciones';
  const planning = usePlanning(libraryId);
  const ui = useUi();
  const [filter, setFilter] = useState<Filter>('todas');
  const [organizing, setOrganizing] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [prepare, setPrepare] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [copy, setCopy] = useState<string | null>(null);
  const [removeUnit, setRemoveUnit] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [unitAdding, setUnitAdding] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const addRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const shown: Filter = organizing ? 'todas' : filter;
  const editable = organizing && canEdit;

  useEffect(() => {
    if (addFor) addRef.current?.focus();
  }, [addFor]);
  useEffect(() => {
    if (unitAdding) unitRef.current?.focus();
  }, [unitAdding]);

  const submitLesson = (event: FormEvent, unitId: string, n: number) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const id = slugify(title, takenIds(content));
    const objective = newObjective.trim();
    planning({
      type: 'addLesson',
      unitId,
      lesson: { id, title, ...(objective ? { objective } : {}) },
    });
    setAddFor(null);
    setNewTitle('');
    setNewObjective('');
    ui.toast(`Clase «${title}» agregada a la unidad ${n}`);
  };
  const submitUnit = (event: FormEvent) => {
    event.preventDefault();
    if (!unitTitle.trim()) return;
    const id = uid('u');
    planning({ type: 'addUnit', id, title: unitTitle });
    setUnitAdding(false);
    setUnitTitle('');
    setAddFor(id);
    setFilter('todas');
  };

  const units = library.units.map((unit, k) => {
    const all = library.entries.filter((entry) => entry.unitId === unit.id);
    const items = all.filter((entry) => shown === 'todas' || entry.status === shown);
    return { unit, k, all, items };
  });
  const visible = shown === 'todas' ? units : units.filter((u) => u.items.length);
  const prepareEntry = prepare
    ? library.entries.find((entry) => entry.id === prepare)
    : undefined;
  const copyEntry = copy ? library.entries.find((entry) => entry.id === copy) : undefined;

  return (
    <Page>
        <PageHeader
          kicker={`Clases · ${libraryTitle}`}
          title="Tus clases"
          lead="Abre una clase para prepararla, revisarla o proyectarla. Las que están por preparar parten de la estructura base o de otra clase."
          actions={
          <>
            {!organizing && (
              <div role="group" aria-label="Filtrar por estado" className="pill-group">
                {FILTERS.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className="pill"
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {canEdit && (
            <Button
              variant={organizing ? 'primary' : 'secondary'}
              size="sm"
              aria-pressed={organizing}
              onClick={() => {
                setOrganizing((value) => !value);
                setMenu(null);
                setEditing(null);
              }}
            >
              <Settings2 size={18} aria-hidden="true" />
              {organizing ? 'Listo' : 'Organizar'}
            </Button>
            )}
          </>
          }
        />
        {!organizing && <TodayCard onNavigate={onNavigate} />}
        <LibraryBar libraryId={libraryId} organizing={editable} onNavigate={onNavigate} />
        {organizing && (
          <Notice role="status" tone="info">
            Modo organizar: cambia el nombre de la biblioteca y el nombre y el orden de sus
            unidades, mueve clases entre unidades o elimínalas. Cada eliminación se puede deshacer; los cambios quedan
            pendientes hasta que los guardes en el repositorio.
          </Notice>
        )}
        {visible.length === 0 && (
          <p role="status" className="empty-note">
            No hay clases con este estado.
          </p>
        )}
        {visible.map(({ unit, k, all, items }) => {
          const ready = all.filter((entry) => entry.status === 'lista').length;
          const progress = all.length
            ? `${ready} de ${all.length} ${all.length === 1 ? 'lista' : 'listas'}`
            : 'Sin clases';
          return (
            <section key={unit.id} aria-label={`Unidad ${k + 1} · ${unit.title}`} className="unit">
              <div className="unit-head">
                {editable && unit.id !== UNPLANNED_UNIT.id ? (
                  <>
                    <div className="unit-rename">
                      <span className="unit-n">Unidad {k + 1}</span>
                      <input
                        className="input"
                        aria-label={`Nombre de la unidad ${k + 1}`}
                        value={unit.title}
                        onChange={(event) =>
                          planning({ type: 'renameUnit', id: unit.id, title: event.target.value })
                        }
                      />
                    </div>
                    <div className="row">
                      <IconButton
                        outline
                        label={`Subir unidad ${k + 1}`}
                        disabled={k === 0}
                        onClick={() => planning({ type: 'moveUnit', id: unit.id, delta: -1 })}
                      >
                        <ChevronUp size={18} aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        outline
                        label={`Bajar unidad ${k + 1}`}
                        disabled={k === library.units.filter((u) => u.id !== UNPLANNED_UNIT.id).length - 1}
                        onClick={() => planning({ type: 'moveUnit', id: unit.id, delta: 1 })}
                      >
                        <ChevronDown size={18} aria-hidden="true" />
                      </IconButton>
                      <Button
                        variant="danger" size="sm"
                        onClick={() => {
                          if (all.length) {
                            setRemoveUnit(unit.id);
                            return;
                          }
                          const undo = content.snap();
                          planning({ type: 'removeUnit', id: unit.id, targetId: null });
                          ui.toast(`Unidad «${unit.title}» eliminada`, undo);
                        }}
                      >
                        Eliminar unidad
                      </Button>
                    </div>
                  </>
                ) : (
                  <h2 className="unit-title">
                    <span className="unit-n">Unidad {k + 1}</span>
                    {unit.title}
                  </h2>
                )}
                <div className="unit-progress" aria-label={progress}>
                  <span aria-hidden="true">
                    {all.map((entry) => (
                      <i key={entry.id} className={`seg mark-${entry.status}`} />
                    ))}
                  </span>
                  <span aria-hidden="true">{progress}</span>
                </div>
              </div>
              {items.map((entry) => {
                const siblings = all;
                const i = siblings.indexOf(entry);
                return (
                  <LessonRow
                    key={entry.id}
                    entry={entry}
                    libraryId={libraryId}
                    organizing={editable}
                    first={i === 0}
                    last={i === siblings.length - 1}
                    menuOpen={menu === entry.id}
                    editing={editing === entry.id}
                    onMenu={(open) => setMenu(open ? entry.id : null)}
                    onEditing={(open) => setEditing(open ? entry.id : null)}
                    onPrepare={() => setPrepare(entry.id)}
                    onDetails={() => setDetails(entry.id)}
                    onCopy={() => setCopy(entry.id)}
                    onNavigate={onNavigate}
                  />
                );
              })}
              {all.length === 0 && addFor !== unit.id && (
                <p className="empty-note small-note">Esta unidad aún no tiene clases.</p>
              )}
              {addFor === unit.id ? (
                <form className="add-form" onSubmit={(event) => submitLesson(event, unit.id, k + 1)}>
                  <label className="field">
                    Título de la clase
                    <input
                      ref={addRef}
                      value={newTitle}
                      placeholder="p. ej. Dominio y recorrido"
                      onChange={(event) => setNewTitle(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>
                      Objetivo <span className="field-note">(opcional)</span>
                    </span>
                    <textarea
                      rows={2}
                      value={newObjective}
                      placeholder="Qué aprenderán en esta clase"
                      onChange={(event) => setNewObjective(event.target.value)}
                    />
                  </label>
                  <div className="row row-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setAddFor(null);
                        setNewTitle('');
                        setNewObjective('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" variant="primary" size="sm" disabled={!newTitle.trim()}>
                      Agregar clase
                    </Button>
                  </div>
                </form>
              ) : (
                shown === 'todas' &&
                canEdit &&
                unit.id !== UNPLANNED_UNIT.id && (
                  <Button
                    variant="add"
                    onClick={() => {
                      setAddFor(unit.id);
                      setNewTitle('');
                      setNewObjective('');
                      setUnitAdding(false);
                    }}
                  >
                    + Agregar clase a la unidad {k + 1}
                  </Button>
                )
              )}
            </section>
          );
        })}
        {shown === 'todas' &&
          canEdit &&
          (unitAdding ? (
            <form className="add-form add-unit" onSubmit={submitUnit}>
              <label className="field">
                Nombre de la unidad {library.units.length + 1}
                <input
                  ref={unitRef}
                  value={unitTitle}
                  placeholder="p. ej. Funciones exponenciales"
                  onChange={(event) => setUnitTitle(event.target.value)}
                />
              </label>
              <div className="row">
                <Button
                  onClick={() => {
                    setUnitAdding(false);
                    setUnitTitle('');
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" disabled={!unitTitle.trim()}>
                  Crear unidad
                </Button>
              </div>
            </form>
          ) : (
            <Button
              variant="add" className="add-unit-btn"
              onClick={() => {
                setUnitAdding(true);
                setUnitTitle('');
              }}
            >
              + Nueva unidad
            </Button>
          ))}
      {prepareEntry && (
        <PrepareDialog
          entry={prepareEntry}
          libraryId={libraryId}
          onClose={() => setPrepare(null)}
          onNavigate={onNavigate}
        />
      )}
      {copyEntry && (
        <CopyDialog
          entry={copyEntry}
          libraryId={libraryId}
          onClose={() => setCopy(null)}
          onNavigate={onNavigate}
        />
      )}
      {removeUnit && (
        <RemoveUnitDialog
          unitId={removeUnit}
          libraryId={libraryId}
          onClose={() => setRemoveUnit(null)}
        />
      )}
      {details && <LessonDialog lessonId={details} onClose={() => setDetails(null)} />}
    </Page>
  );
}
