import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import * as ui from '@aula/pedagogical-ui';
import { useActivities } from '../../../app/catalog';
import { mascotGallery } from '../../../app/gallery';
import { mascotUrl } from '../../../app/mascot-assets';
import { FitSlide } from '../../../slides/FitSlide';
import { Frame } from '../../../slides/SlideView';
import type { DeckSlide, LessonMeta } from '../../../store/deck';
import type { Block } from '../editor/blocks';
import { EditableContent } from './EditableContent';
import { CanvasContext } from './EditorBloque';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Rectángulo de cada bloque dentro del lienzo, en píxeles de pantalla. El envoltorio de cada
 * bloque no tiene caja: el rectángulo es la unión de sus hijos. Se recalcula cuando cambia la
 * lámina o su tamaño.
 */
function useBlockRects(frame: HTMLElement | null, watch: unknown) {
  const [rects, setRects] = useState<ReadonlyMap<number, Rect>>(new Map());
  const pending = useRef(0);
  const measure = useCallback(() => {
    if (!frame) return;
    const origin = frame.getBoundingClientRect();
    const next = new Map<number, Rect>();
    for (const wrapper of frame.querySelectorAll<HTMLElement>(
      '[data-bloque]',
    )) {
      const index = Number(wrapper.dataset.bloque);
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;
      for (const child of wrapper.children) {
        const box = child.getBoundingClientRect();
        if (!box.width && !box.height) continue;
        left = Math.min(left, box.left);
        top = Math.min(top, box.top);
        right = Math.max(right, box.right);
        bottom = Math.max(bottom, box.bottom);
      }
      if (right > left)
        next.set(index, {
          x: left - origin.left,
          y: top - origin.top,
          w: right - left,
          h: bottom - top,
        });
    }
    setRects((prev) => {
      if (
        prev.size === next.size &&
        [...next].every(([k, r]) => {
          const old = prev.get(k);
          return (
            old &&
            Math.abs(old.x - r.x) < 0.5 &&
            Math.abs(old.y - r.y) < 0.5 &&
            Math.abs(old.w - r.w) < 0.5 &&
            Math.abs(old.h - r.h) < 0.5
          );
        })
      )
        return prev;
      return next;
    });
  }, [frame]);
  const schedule = useCallback(() => {
    cancelAnimationFrame(pending.current);
    pending.current = requestAnimationFrame(measure);
  }, [measure]);
  useEffect(() => {
    if (!frame) return;
    schedule();
    const resize = new ResizeObserver(schedule);
    resize.observe(frame);
    const mutate = new MutationObserver(schedule);
    mutate.observe(frame, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
    return () => {
      cancelAnimationFrame(pending.current);
      resize.disconnect();
      mutate.disconnect();
    };
  }, [frame, schedule]);
  useEffect(schedule, [watch, schedule]);
  return rects;
}

/** Posición de un panel flotante bajo (o sobre) un rectángulo, dentro del ancho del lienzo. */
export function anchorBelow(rect: Rect, width: number, canvasWidth: number) {
  const left = Math.min(Math.max(rect.x, 0), Math.max(canvasWidth - width, 0));
  return { left, top: rect.y + rect.h + 12, width };
}

/**
 * Lienzo de edición directa: la lámina real (a escala) con una capa encima donde se elige un
 * bloque, se ve su paso, se marcan sus comentarios y errores y aparecen su barra y su editor.
 * No cambia lo que dibujan el Presentador, el PDF ni el Estudiante.
 */
export function Canvas({
  meta,
  deckSlide,
  index,
  total,
  body,
  blocks,
  selected,
  editing,
  mode,
  view,
  editable,
  interactive = true,
  errors,
  marks,
  toolbar,
  popover,
  onSelect,
  onEdit,
  onStepView,
  onRemove,
  onFocusNote,
}: {
  meta: LessonMeta;
  deckSlide: DeckSlide;
  index: number;
  total: number;
  body: string;
  blocks: readonly Block[] | null;
  selected: number | null;
  editing: number | null;
  mode: 'todo' | 'proyectar';
  view: number;
  editable: boolean;
  /** Sin capa de edición (celular: la lámina solo se ve). */
  interactive?: boolean;
  /** Mensaje de error por bloque (fórmulas). */
  errors: ReadonlyMap<number, string>;
  /** Comentarios por bloque: cantidad y el primero. */
  marks: ReadonlyMap<number, { count: number; first: string }>;
  toolbar: (block: Block, rect: Rect) => ReactNode;
  popover: (block: Block | null, rect: Rect | null) => ReactNode;
  onSelect: (index: number | null) => void;
  onEdit: (index: number | null) => void;
  onStepView: (delta: -1 | 1) => void;
  onRemove: (index: number) => void;
  onFocusNote: (first: string) => void;
}) {
  const activities = useActivities();
  const [values, setValues] = useState<Record<string, string>>({});
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const width = size.width;
  const rects = useBlockRects(frame, `${body}|${mode}|${view}|${editing}`);
  const stepOf = useMemo(
    () => new Map((blocks ?? []).map((block) => [block.index, block.step])),
    [blocks],
  );
  useEffect(() => {
    if (!frame) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: frame.clientWidth, height: frame.clientHeight }),
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame]);

  const projecting = mode === 'proyectar' || !interactive;
  const list = blocks ?? [];
  const current =
    selected === null ? null : (list.find((b) => b.index === selected) ?? null);
  const currentRect = current ? (rects.get(current.index) ?? null) : null;
  const editingBlock =
    editing === null ? null : (list.find((b) => b.index === editing) ?? null);
  const editingRect = editingBlock
    ? (rects.get(editingBlock.index) ?? null)
    : null;

  const click = (event: MouseEvent) => {
    if (projecting) return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest('.canvas-float')) return;
    const holder = target.closest('[data-bloque]');
    const clicked =
      holder instanceof HTMLElement ? Number(holder.dataset.bloque) : null;
    if (clicked === null) {
      onSelect(null);
      onEdit(null);
      return;
    }
    if (
      clicked === selected &&
      editable &&
      event.detail === 1 &&
      editing !== clicked
    ) {
      // Otro clic sobre el bloque elegido: escribir.
      onEdit(clicked);
      return;
    }
    onSelect(clicked);
    if (editing !== null && editing !== clicked) onEdit(null);
  };
  const keys = (event: KeyboardEvent) => {
    if (projecting) return;
    const target = event.target;
    // Un menú abierto dentro de la barra (p. ej. «Más») maneja sus propias teclas.
    if (target instanceof Element && target.closest('.menu')) return;
    const inField =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName));
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (editing !== null) onEdit(null);
      else onSelect(null);
      return;
    }
    if (inField) return;
    const order = list.map((b) => b.index);
    const at = selected === null ? -1 : order.indexOf(selected);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next =
        order[
          Math.min(
            Math.max(at + (event.key === 'ArrowDown' ? 1 : -1), 0),
            order.length - 1,
          )
        ];
      if (next !== undefined) onSelect(next);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      onStepView(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Enter' && selected !== null && editable) {
      event.preventDefault();
      onEdit(selected);
    } else if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      selected !== null &&
      editable
    ) {
      event.preventDefault();
      onRemove(selected);
    }
  };

  const hiddenNow = (b: Block) => b.step > view;
  const popoverNode = popover(current, currentRect);
  return (
    <div className="canvas">
      <CanvasContext.Provider value={{ mode, view, stepOf, editing }}>
        <ui.SlideContext.Provider
          value={{
            step: projecting ? view : Number.POSITIVE_INFINITY,
            print: false,
            values,
            setValue: (key, value) =>
              setValues((prev) => ({ ...prev, [key]: value })),
            activities,
            mascotUrl,
            templates: mascotGallery.templates,
          }}
        >
          <div
            ref={setFrame}
            className={`canvas-frame ${projecting ? 'is-projecting' : ''}`}
            tabIndex={0}
            role="group"
            aria-label="Lámina: usa las flechas para recorrer sus bloques y Enter para escribir"
            onClick={click}
            onKeyDown={keys}
          >
            <FitSlide mode="width">
              <Frame meta={meta} slide={deckSlide} index={index} total={total}>
                <EditableContent body={body} />
              </Frame>
            </FitSlide>
            {!projecting && (
              <div className="canvas-overlay">
                {list.map((block) => {
                  const rect = rects.get(block.index);
                  if (!rect) return null;
                  const error = errors.get(block.index);
                  const mark = marks.get(block.index);
                  return (
                    <div
                      key={block.index}
                      className={[
                        'canvas-box',
                        block.index === selected ? 'is-selected' : '',
                        error ? 'has-error' : '',
                        mark ? 'has-note' : '',
                      ].join(' ')}
                      style={{
                        left: rect.x,
                        top: rect.y,
                        width: rect.w,
                        height: rect.h,
                      }}
                    >
                      {block.step > 0 && block.component !== 'Composicion' && (
                        <span
                          className={`step-tag ${hiddenNow(block) ? 'is-hidden' : ''}`}
                        >
                          Paso {block.step}
                        </span>
                      )}
                      {error && (
                        <span className="error-tag canvas-float">{error}</span>
                      )}
                      {mark && (
                        <button
                          type="button"
                          className="note-mark canvas-float"
                          aria-label={`${mark.count} ${mark.count === 1 ? 'comentario' : 'comentarios'} en «${block.summary}»`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onFocusNote(mark.first);
                          }}
                        >
                          {mark.count}
                        </button>
                      )}
                    </div>
                  );
                })}
                {current && currentRect && editing === null && (
                  <FloatBox rect={currentRect} canvasWidth={width}>
                    {toolbar(current, currentRect)}
                  </FloatBox>
                )}
                {editingBlock && editingRect && (
                  <FloatBox rect={editingRect} canvasWidth={width}>
                    {toolbar(editingBlock, editingRect)}
                  </FloatBox>
                )}
                {popoverNode && (
                  <div
                    className="canvas-float canvas-popover"
                    style={
                      currentRect
                        ? anchorBelow(
                            currentRect,
                            Math.min(380, width - 16),
                            width,
                          )
                        : { left: 8, top: 8, width: 380 }
                    }
                  >
                    {popoverNode}
                  </div>
                )}
              </div>
            )}
          </div>
        </ui.SlideContext.Provider>
      </CanvasContext.Provider>
      {blocks !== null && blocks.length === 0 && (
        <p className="canvas-empty">
          Lámina vacía.
          <br />
          Inserta un bloque con la barra de arriba.
        </p>
      )}
    </div>
  );
}

/**
 * La barra va sobre el bloque, alineada a su borde derecho; si no cabe arriba, debajo, y nunca
 * se sale del lienzo por la izquierda.
 */
function FloatBox({
  rect,
  canvasWidth,
  children,
}: {
  rect: Rect;
  canvasWidth: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [own, setOwn] = useState(0);
  useEffect(() => {
    const node = box.current;
    if (!node) return;
    setOwn(node.offsetWidth);
    const observer = new ResizeObserver(() => setOwn(node.offsetWidth));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const top = rect.y - 48 < 0 ? rect.y + rect.h + 12 : rect.y - 48;
  const left = Math.max(
    4,
    Math.min(rect.x + rect.w - own, canvasWidth - own - 4),
  );
  return (
    <div ref={box} className="canvas-float" style={{ top, left }}>
      {children}
    </div>
  );
}
