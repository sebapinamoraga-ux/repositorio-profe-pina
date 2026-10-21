import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { lessonFormat } from '@aula/content-model';
import { slidePath } from '@aula/content-model/content-files';
import type { Navigate } from '../../../app/routes';
import { mascotGallery } from '../../../app/gallery';
import { useContent } from '../../../content/ContentProvider';
import {
  editableRepaso,
  editableSlides,
  findLesson,
  slideFile,
  tramoGroups,
  writeRepaso,
  writeSlides,
} from '../../../content/ops';
import { useAula } from '../../../store/AulaProvider';
import {
  blankSlide,
  deckSlides,
  lessonEntry,
  lessonMeta,
  PHASE_NAMES,
  slideFromTemplate,
  type BlankLayout,
} from '../../../store/deck';
import { makeNote } from '../../../store/notes';
import type { EditedSlide } from '../../../store/schema';
import { Sheet } from '../../../ui/Sheet';
import { useUi } from '../../../ui/UiProvider';
import {
  addStep,
  duplicateBlock,
  extractBlocks,
  findBlockByRef,
  insertBlock,
  moveBlock,
  questionIds,
  removeBlock,
  removeStep,
  setBlockStep,
  type BlockEdit,
} from '../editor/blocks';
import type { LessonIssues } from '../issues';
import { AdvancedPanel } from './AdvancedPanel';
import { BatchBar } from './BatchBar';
import { BlockToolbar } from './BlockToolbar';
import {
  CARD_SOURCE,
  FORMULA_SOURCE,
  PANELS_SOURCE,
  TEXT_SOURCE,
  familySource,
  questionSource,
  type Family,
} from './block-templates';
import { Canvas } from './Canvas';
import { CommentPopover } from './CommentPopover';
import { FocusMode } from './FocusMode';
import { MiniSlide } from './MiniSlide';
import {
  ActionsSheet,
  InsertSheet,
  PhoneBlocks,
  PhoneHeader,
  PhoneSteps,
} from './phone';
import { useCoarsePointer } from './touch';
import { formulaErrorBlocks } from './error-blocks';
import { useLessonHistory } from './HistoryContext';
import { InlineEditor, type FormatApi } from './InlineEditor';
import { InsertBar, type InsertKind } from './InsertBar';
import {
  insertId,
  locate,
  moveIds,
  removeId,
  stepTarget,
  type DropTarget,
} from './layout-ops';
import { NewSlideDialog } from './NewSlideDialog';
import { PrepareLesson } from './PrepareLesson';
import { ShortcutsDialog } from './ShortcutsDialog';
import { SidePanel, type SideTab } from './SidePanel';
import { SlideBar } from './SlideBar';
import { SlideList } from './SlideList';
import {
  LAYOUTS,
  slideNumber,
  uniqueId,
  useElementWidth,
  useLessonNotes,
  type SlideListName,
} from './shared';
import { StepTimeline } from './StepTimeline';
import { TourPill, useTour } from './tour';
import { useEditorKeys } from './useEditorKeys';
import { VariantDialog } from './VariantDialog';
import { applyVariant } from './variant';

/** Etiqueta y clave de fusión del historial para un cambio de una lámina. */
function describePatch(
  patch: Partial<EditedSlide>,
  id: string,
): [string, string] {
  if ('title' in patch)
    return ['Cambió el título de la lámina', `titulo:${id}`];
  if ('body' in patch)
    return ['Editó el contenido de la lámina', `cuerpo:${id}`];
  if ('layout' in patch)
    return ['Cambió el diseño de la lámina', `diseno:${id}`];
  if ('phase' in patch)
    return ['Cambió el momento de la lámina', `momento:${id}`];
  if ('steps' in patch) return ['Cambió los pasos de la lámina', `pasos:${id}`];
  if ('id' in patch)
    return ['Cambió el identificador de la lámina', `id:${id}`];
  return ['Cambió la lámina', `lamina:${id}`];
}

/** Lo que cambia en la lámina cuando cambia un bloque (y las preguntas del banco que usa). */
interface Selection {
  slide: string;
  block: number | null;
  editing: number | null;
  commenting: number | null;
  step: number | null;
}

/**
 * Editor de una lista de láminas (la clase o el repaso): lista por tramos, barra de la lámina y
 * lienzo de edición directa. La lámina seleccionada la decide la URL (`slideId`).
 */
export function EditorDirecto(props: EditorProps) {
  const content = useContent();
  if (!findLesson(content.bundle, props.lessonId))
    return (
      <PrepareLesson lessonId={props.lessonId} onNavigate={props.onNavigate} />
    );
  return <LoadedEditor {...props} />;
}

interface EditorProps {
  lessonId: string;
  list: SlideListName;
  slideId: string | null;
  /** Revisión de esta lista (null mientras se revisa). */
  issues: LessonIssues | null;
  onSelect: (id: string) => void;
  onOpenDetails: () => void;
  onNavigate: Navigate;
}

function LoadedEditor({
  lessonId,
  list: listName,
  slideId,
  issues,
  onSelect,
  onOpenDetails,
  onNavigate,
}: EditorProps) {
  const { data, dispatch } = useAula();
  const content = useContent();
  const ui = useUi();
  const history = useLessonHistory();
  const { width, ref: rootRef } = useElementWidth();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const layout = width >= 1100 ? 'wide' : width >= 700 ? 'mid' : 'narrow';
  const coarse = useCoarsePointer();
  // Celular: pantallas de lista y de lámina. Tableta con el dedo: barras de 44 px, modo enfoque.
  const phone = layout === 'narrow';
  const touch = phone || (layout !== 'wide' && coarse);
  const meta = lessonMeta(content, lessonId);
  const video =
    lessonFormat(lessonEntry(content, lessonId)?.meta ?? {}) === 'video';
  const lesson = findLesson(content.bundle, lessonId);
  const slides = useMemo(
    () => (lesson ? editableSlides(lesson) : []),
    [lesson],
  );
  const repaso = useMemo(() => editableRepaso(lesson), [lesson]);
  const { notes, pendingFor, pending: pendingNotes } = useLessonNotes(lessonId);

  const [multi, setMulti] = useState<string[]>([]);
  const [advanced, setAdvanced] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [tab, setTab] = useState<SideTab>('comentarios');
  const [focusNote, setFocusNote] = useState<string | null>(null);
  const [mode, setMode] = useState<'todo' | 'proyectar'>('todo');
  const [dialog, setDialog] = useState<'nueva' | 'atajos' | 'variante' | null>(
    null,
  );
  const [newTarget, setNewTarget] = useState<DropTarget | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const format = useRef<FormatApi | null>(null);
  const [screen, setScreen] = useState<'lista' | 'lamina'>(
    slideId ? 'lamina' : 'lista',
  );
  const [sheet, setSheet] = useState<
    'insertar' | 'acciones' | 'comentarios' | null
  >(null);
  const [draftSignal, setDraftSignal] = useState(0);

  const current = listName === 'repaso' ? repaso : slides;
  const found = current.findIndex((item) => item.id === slideId);
  const index = found >= 0 ? found : 0;
  const slide = current[index];
  const deck = useMemo(() => (lesson ? deckSlides(lesson) : []), [lesson]);
  const repasoDeck = useMemo(
    () => (lesson ? deckSlides(lesson, 'repaso') : []),
    [lesson],
  );
  const currentDeck = listName === 'repaso' ? repasoDeck : deck;
  const deferred = useDeferredValue(currentDeck);
  const listDeck =
    deferred.length === currentDeck.length &&
    deferred.every((d, k) => d.id === currentDeck[k]?.id)
      ? deferred
      : currentDeck;

  // Tramos de clase.yaml; sin ellos (o en el repaso) la lista es un solo grupo sin encabezado.
  const tramoIds =
    listName === 'slides' && lesson ? tramoGroups(lesson.meta) : null;
  const tramos = tramoIds ? (lesson?.meta.tramos ?? null) : null;
  const groups: string[][] = tramoIds ?? [current.map((item) => item.id)];
  const editable = content.canEdit;

  const number = slideNumber(listName, index);
  const all = [...slides, ...repaso];
  const canRemove = listName === 'repaso' || slides.length > 1;

  // Lo elegido en el lienzo vale solo para la lámina en que se eligió.
  const sel: Selection =
    selection && slide && selection.slide === slide.id
      ? selection
      : {
          slide: slide?.id ?? '',
          block: null,
          editing: null,
          commenting: null,
          step: null,
        };
  const patchSel = (patch: Partial<Omit<Selection, 'slide'>>) =>
    setSelection({ ...sel, ...patch, slide: slide?.id ?? '' });

  // Bloques de la lámina; null si el MDX no se puede interpretar (solo lectura).
  const model = useMemo(
    () => (slide ? extractBlocks(slide.body) : null),
    [slide],
  );
  const blocks = model?.ok ? model.blocks : null;
  const selectedBlock =
    blocks && sel.block !== null
      ? (blocks.find((b) => b.index === sel.block) ?? null)
      : null;
  const view = sel.step ?? selectedBlock?.step ?? slide?.steps ?? 0;
  const viewStep = Math.min(view, slide?.steps ?? 0);

  const commit = (
    next: EditedSlide[],
    label = 'Editó las láminas',
    key?: string,
    layoutHint?: string[][],
  ) => {
    if (!content.canEdit) {
      ui.toast('Conecta la app con GitHub en Ajustes para editar.');
      return false;
    }
    const undo = content.snap();
    content.edit(
      listName === 'repaso'
        ? writeRepaso(content.bundle, lessonId, next)
        : writeSlides(
            content.bundle,
            lessonId,
            next,
            layoutHint ? { groups: layoutHint } : {},
          ),
    );
    history.rec(label, undo, key);
    return true;
  };
  const update = (
    i: number,
    patch: Partial<EditedSlide>,
    named?: [string, string],
  ) => {
    const target = current[i];
    if (!target) return false;
    const full = { ...patch };
    // Las preguntas del banco que usa la lámina se declaran en su encabezado.
    if (full.body !== undefined) {
      const next = extractBlocks(full.body);
      if (next.ok) {
        const ids = questionIds(next.blocks);
        const same =
          ids.length === (full.activities ?? target.activities).length &&
          ids.every((id) =>
            (full.activities ?? target.activities).includes(id),
          );
        if (!same) full.activities = ids;
      }
    }
    const [label, key] = named ?? describePatch(full, target.id);
    return commit(
      current.map((item, k) => (k === i ? { ...item, ...full } : item)),
      label,
      key,
    );
  };
  const select = (id: string | undefined) => {
    if (id) onSelect(id);
    setMulti([]);
  };
  const tramoName = (k: number) => tramos?.[k]?.label ?? '';
  const emptied = (k: number) =>
    ui.toast(`El tramo «${tramoName(k)}» quedaría sin láminas`);

  /** Selección: con Mayús o Ctrl se suma o quita; sin ellas, se elige solo esa lámina. */
  const pick = (id: string, additive: boolean) => {
    if (!additive) {
      select(id);
      return;
    }
    const base = multi.length ? multi : slide ? [slide.id] : [];
    const next = base.includes(id)
      ? base.filter((other) => other !== id)
      : [...base, id];
    setMulti(
      next.length > 1
        ? current.map((s) => s.id).filter((s) => next.includes(s))
        : [],
    );
    if (next.length === 1 && next[0]) onSelect(next[0]);
  };

  /** Reordena: un grupo por tramo si la clase los tiene; si no, la lista entera es un grupo. */
  const place = (next: string[][], label: string) => {
    const order = next
      .flat()
      .flatMap((id) => current.find((s) => s.id === id) ?? []);
    return commit(order, label, undefined, tramoIds ? next : undefined);
  };
  const indexOfId = (id: string | undefined) =>
    Math.max(
      0,
      current.findIndex((s) => s.id === id),
    );
  const moveSlides = (ids: string[], target: DropTarget) => {
    const result = moveIds(groups, ids, target);
    if (!result.ok) {
      emptied(result.emptied);
      return;
    }
    const before = locate(groups, ids[0] ?? '')?.tramo;
    const label =
      ids.length > 1
        ? `Movió ${ids.length} láminas`
        : tramos && before !== target.tramo
          ? `Movió la lámina ${slideNumber(listName, indexOfId(ids[0]))} al tramo ${target.tramo + 1}`
          : `Movió la lámina ${slideNumber(listName, indexOfId(ids[0]))}`;
    place(result.groups, label);
  };
  const step = (direction: -1 | 1) => {
    if (!slide) return;
    const target = stepTarget(groups, slide.id, direction);
    if (target) moveSlides([slide.id], target);
  };

  /** Agrega una lámina nueva en `target` y la selecciona. */
  const addSlide = (
    created: EditedSlide,
    target: DropTarget,
    label: string,
  ) => {
    const next = insertId(groups, created.id, target);
    const order = next
      .flat()
      .flatMap((id) =>
        id === created.id
          ? [created]
          : (current.find((s) => s.id === id) ?? []),
      );
    if (commit(order, label, undefined, tramoIds ? next : undefined)) {
      select(created.id);
      if (phone) setScreen('lamina');
    }
  };
  /** Copia la lámina a continuación con otros números (solo en texto y fórmulas). */
  const createVariant = (replacements: Map<string, string>) => {
    if (!slide) return;
    const id = uniqueId(`${slide.id}-variante`, all);
    const undo = content.snap();
    setDialog(null);
    addSlide(
      { ...slide, id, body: applyVariant(slide.body, replacements) },
      afterCurrent(),
      `Creó una variante de la lámina ${number}`,
    );
    ui.toast(`Variante creada como «${id}»`, undo);
  };
  const afterCurrent = (): DropTarget => {
    const here = slide ? locate(groups, slide.id) : null;
    return here ? { tramo: here.tramo, at: here.at + 1 } : { tramo: 0, at: 0 };
  };
  const duplicate = (target: DropTarget = afterCurrent()) => {
    if (!slide) return;
    const id = uniqueId(`${slide.id}-copia`, all);
    addSlide({ ...slide, id }, target, `Duplicó la lámina ${number}`);
  };
  const remove = () => {
    if (!slide || !canRemove) return;
    const result = removeId(groups, slide.id);
    if (!result.ok) {
      emptied(result.emptied);
      return;
    }
    const undo = content.snap();
    const neighbour = current[index + 1] ?? current[index - 1];
    commit(
      current.filter((_, k) => k !== index),
      `Eliminó la lámina ${number}`,
      undefined,
      tramoIds ? result.groups : undefined,
    );
    select(neighbour?.id);
    ui.toast(
      `${listName === 'repaso' ? 'Lámina de repaso' : 'Lámina'} ${number} «${slide.title}» eliminada`,
      undo,
    );
  };
  const rename = (id: string) => {
    if (!slide) return;
    const old = slide.id;
    update(index, { id });
    // Los comentarios de la lámina la siguen por su identificador.
    for (const note of notes)
      if (note.slideId === old)
        dispatch({ type: 'updateNote', id: note.id, patch: { slideId: id } });
    select(id);
  };
  const restoreSlide = () => {
    if (!lesson || !slide) return;
    const undo = content.snap();
    content.discard([slidePath(lesson.dir, slideFile(slide))]);
    ui.toast('Se descartaron los cambios sin guardar de esta lámina', undo);
  };
  const restoreLesson = () => {
    if (!lesson) return;
    const undo = content.snap();
    content.discard(
      content.pending.filter((path) => path.startsWith(`${lesson.dir}/`)),
    );
    ui.toast('Se descartaron los cambios sin guardar de esta clase', undo);
  };

  const batch = (patch: Partial<EditedSlide>, what: string) => {
    const ids = multi;
    const undo = content.snap();
    const ok = commit(
      current.map((item) =>
        ids.includes(item.id) ? { ...item, ...patch } : item,
      ),
      `${what} en ${ids.length} láminas`,
    );
    if (ok) ui.toast(`${what} en ${ids.length} láminas`, undo);
  };

  const openNew = (tramo: number | null) => {
    setNewTarget(
      tramo === null
        ? afterCurrent()
        : { tramo, at: groups[tramo]?.length ?? 0 },
    );
    setDialog('nueva');
  };
  const targetNumber = () => {
    const target = newTarget ?? afterCurrent();
    const position =
      groups.slice(0, target.tramo).reduce((sum, g) => sum + g.length, 0) +
      target.at;
    return slideNumber(listName, position);
  };
  const created = (
    label: string,
    make: (id: string) => EditedSlide,
    base: string,
  ) => {
    const target = newTarget ?? afterCurrent();
    const next = make(uniqueId(base, all));
    setDialog(null);
    addSlide(next, target, label);
  };

  // ---- Bloques de la lámina ------------------------------------------------------------
  const stepName = (n: number) => (n === 0 ? 'Inicial' : `Paso ${n}`);
  /** Aplica una operación sobre el MDX; devuelve el modelo nuevo para elegir el bloque. */
  const applyBlockEdit = (
    edit: BlockEdit,
    label: string,
    key?: string,
    patch: Partial<EditedSlide> = {},
  ) => {
    if (!slide) return null;
    if (!edit.ok) {
      ui.toast(edit.reason);
      return null;
    }
    const next: Partial<EditedSlide> = { ...patch, body: edit.body };
    if (edit.steps !== undefined) next.steps = edit.steps;
    if (!update(index, next, [label, key ?? `${label}:${slide.id}`]))
      return null;
    const after = extractBlocks(edit.body);
    return { select: edit.select, blocks: after.ok ? after.blocks : [] };
  };
  const setStepOf = (i: number, n: number) => {
    const block = blocks?.find((b) => b.index === i);
    if (!slide || !block) return;
    const done = applyBlockEdit(
      setBlockStep(slide.body, i, n),
      `Pasó «${block.summary}» a ${stepName(n)}`,
    );
    if (done) patchSel({ block: done.select ?? i, step: n });
  };
  const moveBlockBy = (i: number, direction: -1 | 1) => {
    const block = blocks?.find((b) => b.index === i);
    if (!slide || !block) return;
    const done = applyBlockEdit(
      moveBlock(slide.body, i, direction),
      `Movió «${block.summary}»`,
    );
    if (done) patchSel({ block: done.select ?? i });
  };
  const duplicateBlockAt = (i: number) => {
    const block = blocks?.find((b) => b.index === i);
    if (!slide || !block) return;
    const done = applyBlockEdit(
      duplicateBlock(slide.body, i),
      `Duplicó «${block.summary}»`,
    );
    if (done) patchSel({ block: done.select ?? i, editing: null });
  };
  const removeBlockAt = (i: number) => {
    const block = blocks?.find((b) => b.index === i);
    if (!slide || !block) return;
    const undo = content.snap();
    const done = applyBlockEdit(
      removeBlock(slide.body, i),
      `Eliminó «${block.summary}»`,
    );
    if (!done) return;
    patchSel({ block: null, editing: null, commenting: null });
    ui.toast(`${block.label} «${block.summary}» eliminada`, undo);
  };
  const writeBlock = (patch: Partial<EditedSlide>) => {
    if (!selectedBlock && sel.editing === null) return;
    const label = selectedBlock?.label ?? 'bloque';
    update(index, patch, [
      `Escribió en «${selectedBlock?.summary ?? label}»`,
      `bloque:${slide?.id}:${sel.editing}`,
    ]);
  };
  const addStepToSlide = () => {
    if (!slide) return;
    const done = applyBlockEdit(
      addStep(slide.body, slide.steps),
      'Agregó un paso',
    );
    if (done) patchSel({ step: slide.steps + 1 });
  };
  const removeStepAt = (n: number) => {
    if (!slide) return;
    const undo = content.snap();
    const done = applyBlockEdit(
      removeStep(slide.body, n, slide.steps),
      `Quitó el paso ${n}`,
    );
    if (done) {
      patchSel({
        step: Math.min(sel.step ?? 0, n - 1),
        block: null,
        editing: null,
      });
      ui.toast(`Paso ${n} quitado: sus bloques pasaron al paso anterior`, undo);
    }
  };

  /** Dónde se inserta lo nuevo: después del bloque elegido y en su paso, o al final. */
  const insertTarget = () => {
    const after =
      selectedBlock && selectedBlock.component !== 'Composicion'
        ? selectedBlock
        : null;
    return {
      after: after ? after.index : null,
      step: after ? after.step : viewStep,
      text: after
        ? `después de «${after.summary}», en ${stepName(after.step)}`
        : `al final, en ${stepName(viewStep)}`,
    };
  };
  const insert = (source: string, extra: Partial<EditedSlide> = {}) => {
    if (!slide) return;
    const where = insertTarget();
    const done = applyBlockEdit(
      insertBlock(slide.body, { after: where.after }, where.step, source),
      'Agregó un bloque',
      undefined,
      extra,
    );
    if (!done || done.select === undefined) return;
    const created = done.blocks.find((b) => b.index === done.select);
    patchSel({
      block: done.select,
      editing: created && created.kind !== 'fixed' ? done.select : null,
    });
  };
  const paes = Object.values(content.bundle.activities).filter(
    (activity) => activity.type === 'paes',
  );
  const onInsert = (kind: InsertKind) => {
    if (kind === 'texto') insert(TEXT_SOURCE);
    else if (kind === 'formula') insert(FORMULA_SOURCE);
    else if (kind === 'tarjeta') insert(CARD_SOURCE);
    else if (kind === 'paneles') insert(PANELS_SOURCE);
    else if (slide) {
      const unused =
        paes.find((a) => !slide.activities.includes(a.id)) ?? paes[0];
      if (unused)
        insert(questionSource(unused.id, 1), {
          steps: Math.max(slide.steps, 1),
        });
    }
  };
  const onFamily = (family: Family) => insert(familySource(family));

  const addBlockComment = (text: string) => {
    if (!slide || !selectedBlock) return;
    dispatch({
      type: 'addNote',
      note: makeNote(data, {
        text,
        lessonId,
        slideId: slide.id,
        slideTitle: slide.title,
        source: 'editor',
        blockRef: { index: selectedBlock.index, label: selectedBlock.summary },
      }),
    });
    patchSel({ commenting: null });
    setTab('comentarios');
    ui.toast('Comentario agregado');
  };

  // Marcas del lienzo: comentarios pendientes por bloque y errores de fórmula por bloque.
  const marks = useMemo(() => {
    const map = new Map<number, { count: number; first: string }>();
    if (!slide || !blocks) return map;
    for (const note of pendingNotes) {
      if (note.slideId !== slide.id || !note.blockRef) continue;
      const target = findBlockByRef(blocks, note.blockRef);
      if (!target) continue;
      const known = map.get(target.index);
      map.set(target.index, {
        count: (known?.count ?? 0) + 1,
        first: known?.first ?? note.id,
      });
    }
    return map;
  }, [pendingNotes, slide, blocks]);
  const errors = useMemo(
    () =>
      slide && blocks
        ? formulaErrorBlocks(issues?.perSlide[index] ?? null, slide, blocks)
        : new Map<number, string>(),
    [issues, index, slide, blocks],
  );
  const canMove = useMemo(
    () =>
      slide && selectedBlock
        ? {
            up: moveBlock(slide.body, selectedBlock.index, -1).ok,
            down: moveBlock(slide.body, selectedBlock.index, 1).ok,
          }
        : { up: false, down: false },
    [slide, selectedBlock],
  );

  /** Con el dedo, «Comentar» abre el panel de comentarios con el campo listo. */
  const openComment = (index: number) => {
    patchSel({ block: index, commenting: null });
    setTab('comentarios');
    setDraftSignal((n) => n + 1);
    if (phone) setSheet('comentarios');
    else setSideOpen(true);
  };
  const stepView = (delta: -1 | 1) => {
    if (!slide) return;
    patchSel({ step: Math.min(Math.max(viewStep + delta, 0), slide.steps) });
  };
  const tour = useTour({
    steps: slide?.steps ?? 0,
    enabled: Boolean(slide) && (slide?.steps ?? 0) > 0,
    onView: (n) =>
      patchSel({ step: n, block: null, editing: null, commenting: null }),
    onMode: setMode,
    mode,
  });

  useEditorKeys(root, {
    onMove: step,
    onDuplicate: () => duplicate(),
    onShortcuts: () => setDialog('atajos'),
    onClearSelection: () => setMulti([]),
    hasSelection: multi.length > 0,
  });
  useEffect(() => {
    // «?» y Ctrl + D del editor no deben actuar con un bloque en escritura.
    if (sel.editing === null) return;
    setMulti([]);
  }, [sel.editing]);

  const dupTarget = newTarget ?? afterCurrent();
  const where = insertTarget();
  const editingBlock = blocks?.find((b) => b.index === sel.editing) ?? null;
  const toolbarFor = (
    block: NonNullable<typeof editingBlock>,
    editingNow: boolean,
  ) =>
    slide && (
      <BlockToolbar
        block={block}
        steps={slide.steps}
        editing={editingNow}
        editable={editable}
        compact={touch}
        canMove={canMove}
        format={format}
        onStep={(n) => setStepOf(block.index, n)}
        onEdit={() => patchSel({ editing: block.index })}
        onComment={() =>
          touch
            ? openComment(block.index)
            : patchSel({ commenting: block.index })
        }
        onMove={(direction) => moveBlockBy(block.index, direction)}
        onDuplicate={() => duplicateBlockAt(block.index)}
        onRemove={() => removeBlockAt(block.index)}
        onDragStart={() => undefined}
        onDone={() => patchSel({ editing: null })}
      />
    );
  const inlineEditor = (hidePreview: boolean) =>
    slide && (
      <InlineEditor
        slide={slide}
        block={editingBlock}
        activities={content.bundle.activities}
        format={format}
        issueCount={issues?.errors ?? 0}
        hidePreview={hidePreview}
        onBody={writeBlock}
        onReview={() => {
          patchSel({ editing: null });
          setTab('revision');
          if (phone) setSheet('comentarios');
          else setSideOpen(true);
        }}
      />
    );
  const sidePanel = (panelLayout: 'wide' | 'mid' | 'narrow') =>
    slide && (
      <SidePanel
        lessonId={lessonId}
        listName={listName}
        slides={current}
        slide={slide}
        blocks={blocks}
        selected={selectedBlock}
        issues={issues}
        tab={tab}
        focusNote={focusNote}
        draftSignal={draftSignal}
        layout={panelLayout}
        open={sideOpen || panelLayout === 'narrow'}
        onTab={setTab}
        onGoSlide={(id) => {
          setSheet(null);
          select(id);
        }}
        onGoBlock={(i) => {
          setSheet(null);
          patchSel({ block: i, editing: null });
        }}
        onClose={() => setSideOpen(false)}
      />
    );
  const focusMode =
    touch && slide && editingBlock ? (
      <FocusMode
        label={editingBlock.summary}
        slide={
          <MiniSlide
            meta={meta}
            deckSlide={
              currentDeck[index] ??
              (currentDeck[0] as NonNullable<(typeof currentDeck)[number]>)
            }
            index={index}
            total={currentDeck.length}
            body={slide.body}
          />
        }
        editor={
          <>
            {!editingBlock.inherited &&
              editingBlock.component !== 'Composicion' && (
                <label className="field focus-step">
                  Aparece en
                  <select
                    value={editingBlock.step}
                    disabled={!editable}
                    onChange={(event) =>
                      setStepOf(editingBlock.index, Number(event.target.value))
                    }
                  >
                    {Array.from({ length: slide.steps + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {stepName(n)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            {inlineEditor(true)}
          </>
        }
        formats={toolbarFor(editingBlock, true)}
        onDone={() => patchSel({ editing: null })}
      />
    ) : null;
  const dialogs = (
    <>
      {dialog === 'nueva' && (
        <NewSlideDialog
          number={targetNumber()}
          where={
            tramos
              ? `${dupTarget.tramo + 1} · ${tramoName(dupTarget.tramo)}`
              : null
          }
          duplicateOf={slide ? number : null}
          repaso={listName === 'repaso'}
          sheet={touch}
          onBlank={(layoutName: BlankLayout) =>
            created(
              `Agregó una lámina en blanco (${layoutName})`,
              (id) => blankSlide(layoutName, id),
              `nueva-${layoutName}`,
            )
          }
          onDuplicate={() => {
            setDialog(null);
            duplicate(dupTarget);
          }}
          onTemplate={(templateId) => {
            const template = mascotGallery.templates.find(
              (t) => t.id === templateId,
            );
            if (template)
              created(
                `Agregó la lámina «${template.heading}»`,
                (id) => slideFromTemplate(template, id),
                template.id,
              );
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'variante' && slide && (
        <VariantDialog
          number={number}
          body={slide.body}
          onCreate={createVariant}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'atajos' && (
        <ShortcutsDialog onClose={() => setDialog(null)} />
      )}
      {slide && advanced && (
        <AdvancedPanel
          slide={slide}
          number={number}
          taken={all.filter((s) => s !== slide).map((s) => s.id)}
          editable={editable}
          slideChanged={
            Boolean(lesson) &&
            content.pending.includes(
              slidePath(lesson?.dir ?? '', slideFile(slide)),
            )
          }
          lessonChanged={
            Boolean(lesson) &&
            content.pending.some((path) => path.startsWith(`${lesson?.dir}/`))
          }
          onRename={rename}
          onBody={(body) => update(index, { body })}
          onDiscardSlide={restoreSlide}
          onDiscardLesson={restoreLesson}
          onClose={() => setAdvanced(false)}
        />
      )}
      {focusMode}
    </>
  );

  if (phone)
    return (
      <main
        ref={(node) => {
          rootRef(node);
          setRoot(node);
        }}
        className="editor is-narrow"
      >
        {screen === 'lista' || !slide ? (
          <SlideList
            listName={listName}
            slides={current}
            deck={listDeck}
            meta={meta}
            tramos={tramos}
            groups={groups}
            selectedId={slide?.id}
            multi={multi}
            issues={issues}
            pendingFor={pendingFor}
            pendingTotal={pendingNotes.length}
            editable={editable}
            layout="narrow"
            touch
            onPick={(id, additive) => {
              pick(id, additive);
              if (!additive) setScreen('lamina');
            }}
            onMove={moveSlides}
            onNew={openNew}
            onOpenDetails={onOpenDetails}
          />
        ) : (
          <div className="phone-slide">
            <PhoneHeader
              number={number}
              title={slide.title}
              onBack={() => setScreen('lista')}
              onActions={() => setSheet('acciones')}
            />
            <div className="phone-canvas">
              <Canvas
                meta={meta}
                deckSlide={
                  currentDeck[index] ??
                  (currentDeck[0] as NonNullable<(typeof currentDeck)[number]>)
                }
                index={index}
                total={currentDeck.length}
                body={slide.body}
                blocks={blocks}
                selected={null}
                editing={null}
                mode="todo"
                view={viewStep}
                editable={false}
                interactive={false}
                errors={errors}
                marks={marks}
                toolbar={() => null}
                popover={() => null}
                onSelect={() => undefined}
                onEdit={() => undefined}
                onStepView={() => undefined}
                onRemove={() => undefined}
                onFocusNote={() => undefined}
              />
            </div>
            <PhoneSteps
              steps={slide.steps}
              view={viewStep}
              editable={editable && blocks !== null}
              onView={(n) => patchSel({ step: n })}
              onAdd={addStepToSlide}
              onRemove={removeStepAt}
            />
            {blocks ? (
              <PhoneBlocks
                blocks={blocks}
                steps={slide.steps}
                editable={editable}
                marks={marks}
                onOpen={(i) => patchSel({ block: i, editing: i })}
                onMove={moveBlockBy}
                onStep={setStepOf}
                onDuplicate={duplicateBlockAt}
                onRemove={removeBlockAt}
                onComment={openComment}
                onInsert={() => setSheet('insertar')}
              />
            ) : (
              <p className="canvas-readonly" role="status">
                {model && !model.ok ? model.reason : ''}
              </p>
            )}
          </div>
        )}
        {slide && sheet === 'insertar' && (
          <InsertSheet
            canAskQuestion={paes.length > 0}
            where={where.text}
            onInsert={onInsert}
            onFamily={onFamily}
            onClose={() => setSheet(null)}
          />
        )}
        {slide && sheet === 'acciones' && (
          <ActionsSheet
            slide={slide}
            number={number}
            video={video}
            editable={editable}
            canRemove={canRemove}
            tramos={tramos}
            currentTramo={locate(groups, slide.id)?.tramo ?? 0}
            onUpdate={(patch) => update(index, patch)}
            onDuplicate={() => duplicate()}
            onVariant={blocks ? () => setDialog('variante') : null}
            onMoveToTramo={(to) =>
              moveSlides([slide.id], { tramo: to, at: groups[to]?.length ?? 0 })
            }
            onReview={() => {
              setTab('revision');
              setSheet('comentarios');
            }}
            onAdvanced={() => setAdvanced(true)}
            onPresent={() =>
              onNavigate('presentar', { lesson: lessonId, slide: slide.id })
            }
            onRemove={() => {
              remove();
              setScreen('lista');
            }}
            onClose={() => setSheet(null)}
          />
        )}
        {slide && sheet === 'comentarios' && (
          <Sheet
            label="Comentarios y revisión"
            size="tall"
            onClose={() => setSheet(null)}
          >
            {sidePanel('narrow')}
          </Sheet>
        )}
        {dialogs}
      </main>
    );
  return (
    <main
      ref={(node) => {
        rootRef(node);
        setRoot(node);
      }}
      className={`editor is-${layout}`}
    >
      <SlideList
        listName={listName}
        slides={current}
        deck={listDeck}
        meta={meta}
        tramos={tramos}
        groups={groups}
        selectedId={slide?.id}
        multi={multi}
        issues={issues}
        pendingFor={pendingFor}
        pendingTotal={pendingNotes.length}
        editable={editable}
        layout={layout}
        touch={touch}
        onPick={pick}
        onMove={moveSlides}
        onNew={openNew}
        onOpenDetails={onOpenDetails}
      />
      {!slide && (
        <section aria-label="Lámina" className="editor-preview">
          <p className="empty-note">
            {listName === 'repaso'
              ? 'El repaso aún no tiene láminas. Agrega una para que el estudiante siga explorando en el celular.'
              : 'Esta clase aún no tiene láminas.'}
          </p>
        </section>
      )}
      {slide && (
        <div className="editor-center">
          {multi.length > 1 ? (
            <BatchBar
              count={multi.length}
              tramos={tramos}
              onLayout={(value) =>
                batch(
                  { layout: value },
                  `Diseño «${LAYOUTS.find(([key]) => key === value)?.[1] ?? value}»`,
                )
              }
              onPhase={(value) =>
                batch({ phase: value }, `Momento «${PHASE_NAMES[value]}»`)
              }
              onMoveTo={(tramo) =>
                moveSlides(multi, { tramo, at: groups[tramo]?.length ?? 0 })
              }
              onDone={() => setMulti([])}
            />
          ) : (
            <SlideBar
              slide={slide}
              number={number}
              video={video}
              editable={editable}
              canRemove={canRemove}
              advanced={advanced}
              onUpdate={(patch) => update(index, patch)}
              onDuplicate={() => duplicate()}
              onVariant={blocks ? () => setDialog('variante') : null}
              onRemove={remove}
              onAdvanced={setAdvanced}
              onShortcuts={() => setDialog('atajos')}
            />
          )}
          <InsertBar
            enabled={editable && blocks !== null && mode === 'todo'}
            where={where.text}
            canAskQuestion={paes.length > 0}
            onInsert={onInsert}
            onFamily={onFamily}
            {...(layout === 'wide'
              ? {}
              : { onPanel: () => setSideOpen((open) => !open) })}
          />
          <div className="canvas-scroll">
            {tour.active && (
              <TourPill
                view={viewStep}
                steps={slide.steps}
                onStop={tour.stop}
              />
            )}
            <section aria-label="Vista previa" className="editor-preview-stage">
              <Canvas
                meta={meta}
                deckSlide={
                  currentDeck[index] ??
                  (currentDeck[0] as NonNullable<(typeof currentDeck)[number]>)
                }
                index={index}
                total={currentDeck.length}
                body={slide.body}
                blocks={blocks}
                selected={mode === 'proyectar' ? null : sel.block}
                editing={sel.editing}
                mode={mode}
                view={viewStep}
                editable={editable}
                errors={errors}
                marks={marks}
                onSelect={(i) =>
                  patchSel({
                    block: i,
                    editing: i === sel.editing ? sel.editing : null,
                    commenting: null,
                    step: i === null ? sel.step : null,
                  })
                }
                onEdit={(i) =>
                  patchSel({ editing: i, ...(i !== null ? { block: i } : {}) })
                }
                onStepView={stepView}
                onRemove={removeBlockAt}
                onFocusNote={(id) => {
                  setTab('comentarios');
                  setFocusNote(id);
                  setSideOpen(true);
                }}
                toolbar={(block) =>
                  toolbarFor(block, sel.editing === block.index)
                }
                popover={(block) =>
                  block && sel.commenting === block.index ? (
                    <CommentPopover
                      label={block.summary}
                      onAdd={addBlockComment}
                      onCancel={() => patchSel({ commenting: null })}
                    />
                  ) : null
                }
              />
              {mode === 'todo' && blocks === null && (
                <p className="canvas-readonly" role="status">
                  {model && !model.ok ? model.reason : ''}
                </p>
              )}
            </section>
            {sel.editing !== null && !touch && (
              <section
                className="inline-dock"
                aria-label="Escribir en el bloque"
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    patchSel({ editing: null });
                  }
                }}
              >
                {inlineEditor(false)}
              </section>
            )}
            <StepTimeline
              blocks={blocks ?? []}
              steps={slide.steps}
              view={viewStep}
              mode={mode}
              selected={sel.block}
              editable={editable && blocks !== null}
              compact={touch}
              onMode={(next) => {
                setMode(next);
                if (next === 'proyectar')
                  patchSel({ block: null, editing: null, commenting: null });
              }}
              onView={(n) => patchSel({ step: n })}
              onAdd={addStepToSlide}
              onRemove={removeStepAt}
              onAssign={setStepOf}
              onSelect={(i) => patchSel({ block: i, editing: null })}
            />
          </div>
        </div>
      )}
      {sidePanel(layout)}
      {dialogs}
    </main>
  );
}
