import { useDeferredValue, useMemo, useState } from 'react';
import { lessonFormat } from '@aula/content-model';
import { slidePath } from '@aula/content-model/content-files';
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
import type { EditedSlide, View } from '../../../store/schema';
import { useUi } from '../../../ui/UiProvider';
import type { LessonIssues } from '../issues';
import { AdvancedPanel } from './AdvancedPanel';
import { BatchBar } from './BatchBar';
import { ContentPanel } from './ContentPanel';
import { useLessonHistory } from './HistoryContext';
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
import { PreviewPane } from './PreviewPane';
import { ShortcutsDialog } from './ShortcutsDialog';
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
import { useEditorKeys } from './useEditorKeys';

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

/**
 * Editor de una lista de láminas (la clase o el repaso): lista por tramos, barra de la lámina y
 * panel de contenido. La lámina seleccionada la decide la URL (`slideId`).
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
  onNavigate: (view: View) => void;
}

function LoadedEditor({
  lessonId,
  list: listName,
  slideId,
  issues,
  onSelect,
  onOpenDetails,
}: EditorProps) {
  const { dispatch } = useAula();
  const content = useContent();
  const ui = useUi();
  const history = useLessonHistory();
  const { width, ref: rootRef } = useElementWidth();
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const layout = width >= 1100 ? 'wide' : width >= 700 ? 'mid' : 'narrow';
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
  const [propsOpen, setPropsOpen] = useState(false);
  const [dialog, setDialog] = useState<'nueva' | 'atajos' | null>(null);
  const [newTarget, setNewTarget] = useState<DropTarget | null>(null);

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
  const update = (i: number, patch: Partial<EditedSlide>) => {
    const [label, key] = describePatch(patch, current[i]?.id ?? '');
    commit(
      current.map((item, k) => (k === i ? { ...item, ...patch } : item)),
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
  const indexOfId = (id: string | undefined) =>
    Math.max(
      0,
      current.findIndex((s) => s.id === id),
    );
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
    if (commit(order, label, undefined, tramoIds ? next : undefined))
      select(created.id);
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

  useEditorKeys(root, {
    onMove: step,
    onDuplicate: () => duplicate(),
    onShortcuts: () => setDialog('atajos'),
    onClearSelection: () => setMulti([]),
    hasSelection: multi.length > 0,
  });

  const slideIds = new Set(all.map((s) => s.id));
  const dupTarget = newTarget ?? afterCurrent();
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
        onPick={pick}
        onMove={moveSlides}
        onNew={openNew}
        onOpenDetails={onOpenDetails}
      />
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
              onRemove={remove}
              onAdvanced={setAdvanced}
              onShortcuts={() => setDialog('atajos')}
            />
          )}
          <PreviewPane
            lessonId={lessonId}
            listName={listName}
            meta={meta}
            deck={currentDeck}
            index={index}
            slide={slide}
            slideIds={slideIds}
            number={number}
            issues={issues}
            layout={layout}
            propsOpen={propsOpen}
            onToggleProps={() => setPropsOpen((open) => !open)}
          />
        </div>
      )}
      {slide && (
        <ContentPanel
          slide={slide}
          layout={layout}
          open={propsOpen}
          editable={editable}
          onUpdate={(patch) => update(index, patch)}
          onClose={() => setPropsOpen(false)}
        />
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
      {dialog === 'atajos' && (
        <ShortcutsDialog onClose={() => setDialog(null)} />
      )}
    </main>
  );
}
