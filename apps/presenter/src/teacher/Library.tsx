import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, Settings2, Trash2, X } from 'lucide-react';
import { mascotGallery } from '../app/gallery';
import { useAula } from '../store/AulaProvider';
import { editableSlides, hasSlides, repoMetas, skeleton } from '../store/deck';
import { ORIGINAL_LESSON_ID } from '../store/seed';
import type { LessonMark, LibraryEntry, TeacherData, View } from '../store/schema';
import { pendingNotes, slugify, uid } from '../store/teacher';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';
import { useLessonIssues } from './issues';

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

function slideCount(data: TeacherData, id: string, count: number | undefined) {
  return count ?? data.edits[id]?.length ?? 0;
}

function LessonRow({
  entry,
  data,
  organizing,
  first,
  last,
  menuOpen,
  editing,
  onMenu,
  onEditing,
  onPrepare,
  onNavigate,
}: {
  entry: LibraryEntry;
  data: TeacherData;
  organizing: boolean;
  first: boolean;
  last: boolean;
  menuOpen: boolean;
  editing: boolean;
  onMenu: (open: boolean) => void;
  onEditing: (open: boolean) => void;
  onPrepare: () => void;
  onNavigate: (view: View) => void;
}) {
  const { dispatch, snap } = useAula();
  const ui = useUi();
  const has = hasSlides(data, entry.id);
  const issues = useLessonIssues(data, entry.id);
  const count = slideCount(data, entry.id, issues?.count);
  const original = entry.id === ORIGINAL_LESSON_ID;
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
  const duplicate = async () => {
    const slides = await editableSlides(data, entry.id);
    let id = `${entry.id}-copia`;
    for (let k = 2; data.library.some((item) => item.id === id); k++)
      id = `${entry.id}-copia-${k}`;
    dispatch({ type: 'duplicateLesson', id: entry.id, newId: id, slides });
    onMenu(false);
    ui.toast(`«${entry.title}» duplicada como «${entry.title} (copia)»`);
  };
  const remove = () => {
    const undo = snap(['library', 'edits', 'lessonId', 'units']);
    dispatch({ type: 'removeLesson', id: entry.id });
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
                  onChange={(event) =>
                    dispatch({ type: 'updateLesson', id: entry.id, patch: { title: event.target.value } })
                  }
                />
              </label>
              <label className="field">
                Objetivo
                <textarea
                  rows={2}
                  value={entry.objective}
                  onChange={(event) =>
                    dispatch({
                      type: 'updateLesson',
                      id: entry.id,
                      patch: { objective: event.target.value },
                    })
                  }
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
                    const undo = snap(['library']);
                    dispatch({ type: 'setLessonUnit', id: entry.id, unitId: event.target.value });
                    const k = data.units.findIndex((u) => u.id === event.target.value);
                    ui.toast(`«${entry.title}» movida a la unidad ${k + 1}`, undo);
                  }}
                >
                  {data.units.map((unit, k) => (
                    <option key={unit.id} value={unit.id}>
                      {k + 1} · {unit.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="square-btn"
                aria-label={`Subir «${entry.title}»`}
                disabled={first}
                onClick={() => dispatch({ type: 'moveLesson', id: entry.id, delta: -1 })}
              >
                <ChevronUp size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="square-btn"
                aria-label={`Bajar «${entry.title}»`}
                disabled={last}
                onClick={() => dispatch({ type: 'moveLesson', id: entry.id, delta: 1 })}
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
              {!has && (
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
              <button
                type="button"
                className="square-btn more-btn"
                aria-expanded={menuOpen}
                aria-label={`Más acciones para ${entry.title}`}
                onClick={() => onMenu(!menuOpen)}
              >
                ⋯
              </button>
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
            <button type="button" className="btn btn-small" onClick={() => void duplicate()}>
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
                onClick={() => {
                  dispatch({ type: 'updateLesson', id: entry.id, patch: { status: 'lista' } });
                  onMenu(false);
                }}
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
              onClick={() => {
                dispatch({ type: 'updateLesson', id: entry.id, patch: { status: 'en-preparacion' } });
                onMenu(false);
              }}
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
  const sources = data.library.filter((item) => hasSlides(data, item.id));
  const [mode, setMode] = useState<'base' | 'other'>('base');
  const [source, setSource] = useState(
    (sources.find((item) => item.id === data.lessonId) ?? sources[0])?.id ?? '',
  );
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    const slides =
      mode === 'other' && source
        ? await editableSlides(data, source)
        : skeleton(entry.title, mascotGallery.templates);
    dispatch({ type: 'prepareLesson', id: entry.id, slides });
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
        <button type="button" className="btn btn-ink" disabled={busy} onClick={() => void confirm()}>
          Crear y abrir en editor
        </button>
      </div>
    </Modal>
  );
}

function RemoveUnitDialog({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const { data, dispatch, snap } = useAula();
  const ui = useUi();
  const k = data.units.findIndex((u) => u.id === unitId);
  const unit = data.units[k];
  const lessons = data.library.filter((entry) => entry.unitId === unitId);
  const hasOriginal = lessons.some((entry) => entry.id === ORIGINAL_LESSON_ID);
  const targets = data.units.filter((u) => u.id !== unitId);
  const [mode, setMode] = useState<'move' | 'all'>(targets.length ? 'move' : 'all');
  const [target, setTarget] = useState(targets[0]?.id ?? '');
  if (!unit) return null;
  const confirm = () => {
    const undo = snap(['units', 'library', 'edits', 'lessonId']);
    if (mode === 'move' && target) {
      dispatch({ type: 'removeUnit', id: unitId, targetId: target });
      const n = data.units.findIndex((u) => u.id === target) + 1;
      ui.toast(`Unidad «${unit.title}» eliminada; sus clases pasaron a la unidad ${n}`, undo);
    } else {
      if (hasOriginal) return;
      dispatch({ type: 'removeUnit', id: unitId, targetId: null });
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
                Unidad {data.units.indexOf(u) + 1} · {u.title}
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
  const { data, dispatch, snap } = useAula();
  const ui = useUi();
  const [filter, setFilter] = useState<Filter>('todas');
  const [organizing, setOrganizing] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [prepare, setPrepare] = useState<string | null>(null);
  const [removeUnit, setRemoveUnit] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newObjective, setNewObjective] = useState('');
  const [unitAdding, setUnitAdding] = useState(false);
  const [unitTitle, setUnitTitle] = useState('');
  const addRef = useRef<HTMLInputElement>(null);
  const unitRef = useRef<HTMLInputElement>(null);
  const shown: Filter = organizing ? 'todas' : filter;

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
    const id = slugify(title, new Set(data.library.map((entry) => entry.id)));
    dispatch({ type: 'addLesson', unitId, id, title, objective: newObjective });
    setAddFor(null);
    setNewTitle('');
    setNewObjective('');
    ui.toast(`Clase «${title}» agregada a la unidad ${n}`);
  };
  const submitUnit = (event: FormEvent) => {
    event.preventDefault();
    if (!unitTitle.trim()) return;
    const id = uid('u');
    dispatch({ type: 'addUnit', id, title: unitTitle });
    setUnitAdding(false);
    setUnitTitle('');
    setAddFor(id);
    setFilter('todas');
  };

  const syncRepo = async () => {
    const ok = await ui.confirm({
      title: '¿Actualizar la biblioteca desde el repositorio?',
      body: 'Las unidades, el orden, los títulos y los estados vuelven a los de la planificación y las clases del repositorio; las clases que quitaste reaparecen. Se conservan tus notas, cursos, sesiones, láminas editadas y las clases creadas en este navegador.',
      ok: 'Actualizar',
    });
    if (!ok) return;
    const undo = snap(['units', 'library', 'seenRepo', 'lessonId']);
    dispatch({ type: 'syncFromRepo', repo: repoMetas });
    ui.toast('Biblioteca actualizada desde el repositorio', undo);
  };

  const units = data.units.map((unit, k) => {
    const all = data.library.filter((entry) => entry.unitId === unit.id);
    const items = all.filter((entry) => shown === 'todas' || entry.status === shown);
    return { unit, k, all, items };
  });
  const visible = shown === 'todas' ? units : units.filter((u) => u.items.length);
  const prepareEntry = prepare ? data.library.find((entry) => entry.id === prepare) : undefined;

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
            {!organizing && (
              <button type="button" className="btn btn-small" onClick={syncRepo}>
                <RefreshCw size={18} aria-hidden="true" />
                Actualizar desde el repositorio
              </button>
            )}
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
          </div>
        </header>
        {organizing && (
          <p role="status" className="alert alert-info">
            Modo organizar: cambia el nombre y el orden de las unidades, mueve clases entre
            unidades o elimínalas. Los cambios se guardan al instante y cada eliminación se
            puede deshacer.
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
                {organizing ? (
                  <>
                    <div className="unit-rename">
                      <span className="unit-n">Unidad {k + 1}</span>
                      <input
                        className="input"
                        aria-label={`Nombre de la unidad ${k + 1}`}
                        value={unit.title}
                        onChange={(event) =>
                          dispatch({ type: 'renameUnit', id: unit.id, title: event.target.value })
                        }
                      />
                    </div>
                    <div className="row">
                      <button
                        type="button"
                        className="square-btn"
                        aria-label={`Subir unidad ${k + 1}`}
                        disabled={k === 0}
                        onClick={() => dispatch({ type: 'moveUnit', id: unit.id, delta: -1 })}
                      >
                        <ChevronUp size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="square-btn"
                        aria-label={`Bajar unidad ${k + 1}`}
                        disabled={k === data.units.length - 1}
                        onClick={() => dispatch({ type: 'moveUnit', id: unit.id, delta: 1 })}
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
                          const undo = snap(['units']);
                          dispatch({ type: 'removeUnit', id: unit.id, targetId: null });
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
                    data={data}
                    organizing={organizing}
                    first={i === 0}
                    last={i === siblings.length - 1}
                    menuOpen={menu === entry.id}
                    editing={editing === entry.id}
                    onMenu={(open) => setMenu(open ? entry.id : null)}
                    onEditing={(open) => setEditing(open ? entry.id : null)}
                    onPrepare={() => setPrepare(entry.id)}
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
                shown === 'todas' && (
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
          (unitAdding ? (
            <form className="add-form add-unit" onSubmit={submitUnit}>
              <label className="field">
                Nombre de la unidad {data.units.length + 1}
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
    </main>
  );
}
