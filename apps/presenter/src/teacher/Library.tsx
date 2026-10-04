import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, Settings2, Trash2, X } from 'lucide-react';
import { mascotGallery } from '../app/gallery';
import { useContent } from '../content/ContentProvider';
import {
  UNPLANNED_UNIT,
  type LibraryEntry,
  type PlanningAction,
} from '../content/library';
import {
  createLesson,
  editableSlides,
  findLesson,
  planningWrites,
  removeLessonFiles,
  writeLesson,
} from '../content/ops';
import { useAula } from '../store/AulaProvider';
import { hasSlides, lessonEntry, skeleton } from '../store/deck';
import { ORIGINAL_LESSON_ID } from '../store/seed';
import type { LessonMark, View } from '../store/schema';
import { pendingNotes, slugify, uid } from '../store/teacher';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';
import { useLessonIssues } from './issues';
import { LessonDialog } from './LessonForm';
import { ConnectHint } from './SaveBar';

/** Aplica cambios de la planificación sobre el contenido efectivo. */
function usePlanning() {
  const content = useContent();
  return (...actions: PlanningAction[]) =>
    content.edit(planningWrites(content.bundle, content.files, ...actions));
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
  organizing,
  first,
  last,
  menuOpen,
  editing,
  onMenu,
  onEditing,
  onPrepare,
  onDetails,
  onNavigate,
}: {
  entry: LibraryEntry;
  organizing: boolean;
  first: boolean;
  last: boolean;
  menuOpen: boolean;
  editing: boolean;
  onMenu: (open: boolean) => void;
  onEditing: (open: boolean) => void;
  onPrepare: () => void;
  onDetails: () => void;
  onNavigate: (view: View) => void;
}) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const planning = usePlanning();
  const { library, canEdit } = content;
  const ui = useUi();
  const has = hasSlides(content, entry.id);
  const issues = useLessonIssues(entry.id);
  const count = issues?.count ?? lessonEntry(content, entry.id)?.slides.length ?? 0;
  const original = entry.id === ORIGINAL_LESSON_ID;
  const planned = entry.unitId !== UNPLANNED_UNIT.id;
  const firstUnit = library.units.find((u) => u.id !== UNPLANNED_UNIT.id)?.id ?? 'u1';
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

  const open = (view: View) => {
    dispatch({ type: 'openLesson', id: entry.id });
    onNavigate(view);
  };
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
    const taken = new Set([
      ...library.entries.map((item) => item.id),
      ...content.bundle.lessons.map((item) => item.meta.id),
    ]);
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
      ...planningWrites(content.bundle, content.files, {
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
      ...planningWrites(content.bundle, content.files, {
        type: 'removeLesson',
        id: entry.id,
      }),
    ]);
    if (data.lessonId === entry.id)
      dispatch({ type: 'openLesson', id: ORIGINAL_LESSON_ID });
    onMenu(false);
    ui.toast(
      has ? `«${entry.title}» eliminada` : `«${entry.title}» quitada de la biblioteca`,
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
            </div>
          ) : (
            <>
              <div className="lesson-title">
                <h3>{entry.title || 'Sin título'}</h3>
                {active && <span className="badge-active">Activa</span>}
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
            <button type="button" className="notes-chip" onClick={() => open('editor')}>
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
                    const k = library.units.findIndex((u) => u.id === event.target.value);
                    ui.toast(`«${entry.title}» movida a la unidad ${k + 1}`, undo);
                  }}
                >
                  {library.units.map((unit, k) => (
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
              <button
                type="button"
                className="square-btn"
                aria-label={`Subir «${entry.title}»`}
                disabled={first || !planned}
                onClick={() => planning({ type: 'moveLesson', id: entry.id, delta: -1 })}
              >
                <ChevronUp size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="square-btn"
                aria-label={`Bajar «${entry.title}»`}
                disabled={last || !planned}
                onClick={() => planning({ type: 'moveLesson', id: entry.id, delta: 1 })}
              >
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {!original && (
                <button
                  type="button"
                  className="square-btn is-danger"
                  aria-label={`Eliminar «${entry.title}»`}
                  onClick={remove}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          ) : editing ? (
            <button type="button" className="btn btn-small btn-ink" onClick={() => onEditing(false)}>
              Listo
            </button>
          ) : (
            <div className="row">
              {!has && canEdit && (
                <button type="button" className="btn btn-small btn-ink" onClick={onPrepare}>
                  Preparar
                </button>
              )}
              {has && (
                <button
                  type="button"
                  className={`btn btn-small ${entry.status === 'lista' ? '' : 'btn-ink'}`}
                  onClick={() => open('editor')}
                >
                  Editar
                </button>
              )}
              {has && entry.status === 'lista' && (
                <button type="button" className="btn btn-small btn-accent" onClick={() => open('presentar')}>
                  Presentar
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  className="square-btn more-btn"
                  aria-expanded={menuOpen}
                  aria-label={`Más acciones para ${entry.title}`}
                  onClick={() => onMenu(!menuOpen)}
                >
                  ⋯
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {menuOpen && !organizing && (
        <div role="group" aria-label="Más acciones" className="lesson-menu">
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              onEditing(true);
              onMenu(false);
            }}
          >
            Editar título y objetivo
          </button>
          {has && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => {
                onDetails();
                onMenu(false);
              }}
            >
              Datos de la clase
            </button>
          )}
          {has && (
            <button type="button" className="btn btn-small" onClick={duplicate}>
              Duplicar
            </button>
          )}
          {has && entry.status === 'en-preparacion' && (
            <>
              <button
                type="button"
                className="btn btn-small btn-ok-soft"
                disabled={blocked}
                aria-describedby={issues?.errors ? `why-${entry.id}` : undefined}
                onClick={() => setMark('lista')}
              >
                Marcar como lista
              </button>
              {issues && issues.errors > 0 && (
                <p id={`why-${entry.id}`} className="menu-why">
                  Para marcarla como lista, corrige primero los errores de revisión en el
                  editor.
                </p>
              )}
            </>
          )}
          {entry.status === 'lista' && !original && (
            <button
              type="button"
              className="btn btn-small"
              onClick={() => setMark('en-preparacion')}
            >
              Volver a preparación
            </button>
          )}
          {!original && (
            <button type="button" className="btn btn-small btn-danger-soft" onClick={remove}>
              {has ? 'Eliminar clase' : 'Quitar de la biblioteca'}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function PrepareDialog({
  entry,
  onClose,
  onNavigate,
}: {
  entry: LibraryEntry;
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const sources = content.library.entries.filter((item) => hasSlides(content, item.id));
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
      ...planningWrites(content.bundle, content.files, {
        type: 'updateLesson',
        id: entry.id,
        patch: { title: undefined, objective: undefined, mark: 'en-preparacion' },
      }),
    ]);
    dispatch({ type: 'openLesson', id: entry.id });
    onClose();
    onNavigate('editor');
  };
  return (
    <Modal label="Preparar clase" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="kicker">Preparar clase</p>
          <h2>{entry.title}</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
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
          <span>Copia sus láminas para adaptarlas. La clase original no cambia.</span>
        </button>
      </div>
      {mode === 'other' && (
        <label className="field">
          Clase de origen
          <select value={source} onChange={(event) => setSource(event.target.value)}>
            {sources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-ink" onClick={confirm}>
          Crear y abrir en editor
        </button>
      </div>
    </Modal>
  );
}

function RemoveUnitDialog({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const content = useContent();
  const { library } = content;
  const ui = useUi();
  const k = library.units.findIndex((u) => u.id === unitId);
  const unit = library.units[k];
  const lessons = library.entries.filter((entry) => entry.unitId === unitId);
  const hasOriginal = lessons.some((entry) => entry.id === ORIGINAL_LESSON_ID);
  const targets = library.units.filter(
    (u) => u.id !== unitId && u.id !== UNPLANNED_UNIT.id,
  );
  const [mode, setMode] = useState<'move' | 'all'>(targets.length ? 'move' : 'all');
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  if (!unit) return null;
  const confirm = () => {
    const undo = content.snap();
    if (mode === 'move' && target) {
      content.edit(
        planningWrites(content.bundle, content.files, {
          type: 'removeUnit',
          id: unitId,
          targetId: target,
        }),
      );
      const n = library.units.findIndex((u) => u.id === target) + 1;
      ui.toast(`Unidad «${unit.title}» eliminada; sus clases pasaron a la unidad ${n}`, undo);
    } else {
      if (hasOriginal) return;
      content.edit([
        ...lessons.flatMap((entry) =>
          removeLessonFiles(content.bundle, content.files, entry.id),
        ),
        ...planningWrites(content.bundle, content.files, {
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
        <p className="kicker kicker-danger">Eliminar unidad {k + 1}</p>
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
                Unidad {library.units.indexOf(u) + 1} · {u.title}
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
        <button type="button" className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" onClick={confirm}>
          Eliminar unidad
        </button>
      </div>
    </Modal>
  );
}

export function Library({ onNavigate }: { onNavigate: (view: View) => void }) {
  const content = useContent();
  const { library, canEdit } = content;
  const planning = usePlanning();
  const ui = useUi();
  const [filter, setFilter] = useState<Filter>('todas');
  const [organizing, setOrganizing] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [prepare, setPrepare] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);
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
    const id = slugify(
      title,
      new Set([
        ...library.entries.map((entry) => entry.id),
        ...content.bundle.lessons.map((lesson) => lesson.meta.id),
      ]),
    );
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

  return (
    <main className="page">
      <div className="page-inner">
        <header className="library-head">
          <div>
            <p className="kicker">Biblioteca · M1 · Álgebra y funciones</p>
            <h1 className="page-title">Tus clases</h1>
            <p className="page-lead">
              Abre una clase para editarla o proyectarla. Las que están por preparar parten
              de la estructura base o de otra clase.
            </p>
          </div>
          <div className="row">
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
            <button
              type="button"
              className={`btn btn-small ${organizing ? 'btn-ink' : ''}`}
              aria-pressed={organizing}
              onClick={() => {
                setOrganizing((value) => !value);
                setMenu(null);
                setEditing(null);
              }}
            >
              <Settings2 size={18} aria-hidden="true" />
              {organizing ? 'Listo' : 'Organizar'}
            </button>
            )}
          </div>
        </header>
        {!canEdit && <ConnectHint onNavigate={onNavigate} />}
        {organizing && (
          <p role="status" className="alert alert-info">
            Modo organizar: cambia el nombre y el orden de las unidades, mueve clases entre
            unidades o elimínalas. Cada eliminación se puede deshacer; los cambios quedan
            pendientes hasta que los guardes en el repositorio.
          </p>
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
                      <button
                        type="button"
                        className="square-btn"
                        aria-label={`Subir unidad ${k + 1}`}
                        disabled={k === 0}
                        onClick={() => planning({ type: 'moveUnit', id: unit.id, delta: -1 })}
                      >
                        <ChevronUp size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="square-btn"
                        aria-label={`Bajar unidad ${k + 1}`}
                        disabled={k === library.units.filter((u) => u.id !== UNPLANNED_UNIT.id).length - 1}
                        onClick={() => planning({ type: 'moveUnit', id: unit.id, delta: 1 })}
                      >
                        <ChevronDown size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="btn btn-small btn-danger-soft"
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
                      </button>
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
                    organizing={editable}
                    first={i === 0}
                    last={i === siblings.length - 1}
                    menuOpen={menu === entry.id}
                    editing={editing === entry.id}
                    onMenu={(open) => setMenu(open ? entry.id : null)}
                    onEditing={(open) => setEditing(open ? entry.id : null)}
                    onPrepare={() => setPrepare(entry.id)}
                    onDetails={() => setDetails(entry.id)}
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
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => {
                        setAddFor(null);
                        setNewTitle('');
                        setNewObjective('');
                      }}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-small btn-ink" disabled={!newTitle.trim()}>
                      Agregar clase
                    </button>
                  </div>
                </form>
              ) : (
                shown === 'todas' &&
                canEdit &&
                unit.id !== UNPLANNED_UNIT.id && (
                  <button
                    type="button"
                    className="add-dashed"
                    onClick={() => {
                      setAddFor(unit.id);
                      setNewTitle('');
                      setNewObjective('');
                      setUnitAdding(false);
                    }}
                  >
                    + Agregar clase a la unidad {k + 1}
                  </button>
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
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setUnitAdding(false);
                    setUnitTitle('');
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-ink" disabled={!unitTitle.trim()}>
                  Crear unidad
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="add-dashed add-unit-btn"
              onClick={() => {
                setUnitAdding(true);
                setUnitTitle('');
              }}
            >
              + Nueva unidad
            </button>
          ))}
      </div>
      {prepareEntry && (
        <PrepareDialog
          entry={prepareEntry}
          onClose={() => setPrepare(null)}
          onNavigate={onNavigate}
        />
      )}
      {removeUnit && <RemoveUnitDialog unitId={removeUnit} onClose={() => setRemoveUnit(null)} />}
      {details && <LessonDialog lessonId={details} onClose={() => setDetails(null)} />}
    </main>
  );
}
