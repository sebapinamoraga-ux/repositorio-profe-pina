import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import type { Activity } from '@aula/content-model';
import * as ui from '@aula/pedagogical-ui';
import { useActivities } from '../../../app/catalog';
import { mascotGallery } from '../../../app/gallery';
import { mascotUrl } from '../../../app/mascot-assets';
import { mdxComponents } from '../../../slides/components';
import { SourceContent } from '../../../slides/SourceContent';
import type { EditedSlide } from '../../../store/schema';
import type { Block } from '../editor/blocks';
import { setParam } from '../editor/mdx-fields';
import { ParamFields } from '../ParamForm';
import { checkFormulas } from './formula-check';
import { PRESENCE } from './shared';

/** Formatos que la barra aplica al texto seleccionado del campo en que se escribe. */
export interface FormatApi {
  wrap: (before: string, after: string) => void;
  center: () => void;
}

/** El bloque tal como se verá: su MDX solo, a la escala del panel. */
function ScaledPreview({
  source,
  stage = 1000,
}: {
  source: string;
  stage?: number;
}) {
  const activities = useActivities();
  const deferred = useDeferredValue(source);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const measure = () =>
      setSize({
        width: outer.current?.clientWidth ?? 0,
        height: inner.current?.offsetHeight ?? 0,
      });
    measure();
    const observer = new ResizeObserver(measure);
    if (outer.current) observer.observe(outer.current);
    if (inner.current) observer.observe(inner.current);
    return () => observer.disconnect();
  }, []);
  const scale = size.width ? size.width / stage : 0.4;
  return (
    <div
      ref={outer}
      className="inline-preview-frame"
      style={{ height: size.height * scale || undefined }}
    >
      <ui.SlideContext.Provider
        value={{
          step: Number.POSITIVE_INFINITY,
          print: true,
          values: {},
          setValue: () => {},
          activities,
          mascotUrl,
          templates: mascotGallery.templates,
        }}
      >
        <div
          ref={inner}
          className="inline-preview-stage"
          style={{ width: stage, transform: `scale(${scale})` }}
        >
          <article className="slide slide-fragment layout-concepto">
            <div className="slide-body">
              <div className="slide-content">
                <SourceContent body={deferred} components={mdxComponents} />
              </div>
            </div>
          </article>
        </div>
      </ui.SlideContext.Provider>
    </div>
  );
}

interface Range {
  start: number;
  end: number;
}

/**
 * Escribir sobre un bloque: sus campos (texto, atributos, plantilla o parámetros), debajo cómo
 * se verá y, si una fórmula tiene un error, el aviso con su corrección. Cada tecla reemplaza
 * solo el rango de su campo en el MDX de la lámina.
 */
export function InlineEditor({
  slide,
  block,
  activities,
  format,
  issueCount,
  onBody,
  onReview,
}: {
  slide: EditedSlide;
  /** El bloque según el modelo; null mientras el MDX está a medias. */
  block: Block | null;
  activities: Record<string, Activity>;
  format: MutableRefObject<FormatApi | null>;
  /** Problemas de la clase, para el enlace a Revisión. */
  issueCount: number;
  onBody: (patch: Partial<EditedSlide>) => void;
  onReview: () => void;
}) {
  const body = slide.body;
  const [drafts, setDrafts] = useState<string[]>([]);
  const ranges = useRef<Range[]>([]);
  const focused = useRef<{
    index: number;
    el: HTMLTextAreaElement | HTMLInputElement;
  } | null>(null);
  const first = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  // Con el modelo al día, los campos vuelven a leerse de él (rangos y valores).
  useEffect(() => {
    if (!block) return;
    ranges.current = block.fields.map((field) =>
      field.kind === 'text' ||
      field.kind === 'attr' ||
      field.kind === 'template'
        ? { start: field.start, end: field.end }
        : { start: 0, end: 0 },
    );
    setDrafts(
      block.fields.map((field) =>
        field.kind === 'text' ||
        field.kind === 'attr' ||
        field.kind === 'template'
          ? field.value
          : '',
      ),
    );
  }, [block]);
  useEffect(() => {
    first.current?.focus();
  }, []);

  const change = (k: number, value: string) => {
    const range = ranges.current[k];
    if (!range) return;
    const delta = value.length - (range.end - range.start);
    ranges.current = ranges.current.map((other, j) =>
      j === k
        ? { start: other.start, end: other.start + value.length }
        : other.start >= range.end
          ? { start: other.start + delta, end: other.end + delta }
          : other,
    );
    setDrafts((prev) => prev.map((text, j) => (j === k ? value : text)));
    onBody({
      body: body.slice(0, range.start) + value + body.slice(range.end),
    });
  };

  useEffect(() => {
    const wrapSelection = (before: string, after: string, lines = false) => {
      const target = focused.current;
      if (!target) return;
      const { el, index } = target;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? start;
      const selected = el.value.slice(start, end);
      const lead =
        lines && start > 0 && el.value[start - 1] !== '\n' ? '\n' : '';
      const trail =
        lines && end < el.value.length && el.value[end] !== '\n' ? '\n' : '';
      const inserted = `${lead}${before}${selected}${after}${trail}`;
      change(index, el.value.slice(0, start) + inserted + el.value.slice(end));
      const from = start + lead.length + before.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(from, from + selected.length);
      });
    };
    format.current = {
      wrap: (before, after) => wrapSelection(before, after),
      center: () => wrapSelection('$$\n', '\n$$', true),
    };
    return () => {
      format.current = null;
    };
  });

  if (!block)
    return (
      <div className="inline-editor" role="group" aria-label="Escribir">
        <p className="muted small">
          El MDX está a medias. Termina de escribirlo o corrígelo en la vista
          avanzada.
        </p>
      </div>
    );

  const source = body.slice(block.start, block.end);
  const isFormula = block.kind === 'formula';
  let lastGroup: string | null = null;
  const alerts = block.fields.flatMap((field, k) => {
    if (field.kind !== 'text') return [];
    const text = drafts[k] ?? field.value;
    return checkFormulas(text, { raw: isFormula }).map((issue) => ({
      k,
      issue,
      text,
    }));
  });
  const alert = alerts[0];

  return (
    <div
      className="inline-editor"
      role="group"
      aria-label={`Escribir en «${block.label}»`}
    >
      <p className="inline-kicker">{block.label}</p>
      {block.fields.map((field, k) => {
        const newGroup = field.group !== lastGroup;
        lastGroup = field.group;
        const heading =
          newGroup && field.group ? (
            <p className="field-group">{field.group}</p>
          ) : null;
        if (field.kind === 'params')
          return (
            <div key={k} className="inline-field">
              {heading}
              <ParamFields
                field={field}
                activities={activities}
                steps={slide.steps}
                onChange={(name, value) => {
                  const patch: Partial<EditedSlide> = {
                    body: setParam(body, field, name, value),
                  };
                  if (
                    field.component === 'PreguntaPAES' &&
                    name === 'id' &&
                    typeof value === 'string'
                  )
                    patch.activities = [
                      ...new Set([
                        ...slide.activities.filter(
                          (a) => a !== field.attrs.id?.value,
                        ),
                        value,
                      ]),
                    ];
                  onBody(patch);
                }}
              />
            </div>
          );
        if (field.kind === 'fixed')
          return (
            <div key={k} className="inline-field">
              {heading}
              <p className="field-fixed">{field.value}</p>
            </div>
          );
        const value = drafts[k] ?? field.value;
        return (
          <label key={k} className="inline-field">
            {heading}
            <span className="inline-label">{field.label}</span>
            {field.kind === 'text' && (
              <textarea
                ref={(el) => {
                  if (k === 0) first.current = el;
                }}
                className="mono inline-text"
                rows={Math.min(
                  8,
                  Math.max(
                    2,
                    value.split('\n').length + Math.floor(value.length / 60),
                  ),
                )}
                value={value}
                onFocus={(event) => {
                  focused.current = { index: k, el: event.currentTarget };
                }}
                onChange={(event) => change(k, event.target.value)}
                onKeyDown={(event) => {
                  const mod = event.ctrlKey || event.metaKey;
                  if (mod && event.key.toLowerCase() === 'b') {
                    event.preventDefault();
                    format.current?.wrap('**', '**');
                  } else if (mod && event.key.toLowerCase() === 'm') {
                    event.preventDefault();
                    format.current?.wrap('$', '$');
                  }
                }}
              />
            )}
            {field.kind === 'attr' && (
              <input
                ref={(el) => {
                  if (k === 0) first.current = el;
                }}
                className="inline-input"
                value={value}
                onFocus={(event) => {
                  focused.current = { index: k, el: event.currentTarget };
                }}
                onChange={(event) => change(k, event.target.value)}
              />
            )}
            {field.kind === 'template' && (
              <select
                className="inline-input"
                value={value}
                onChange={(event) => change(k, event.target.value)}
              >
                {mascotGallery.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {PRESENCE[t.mascot.nivel]}
                  </option>
                ))}
              </select>
            )}
          </label>
        );
      })}
      {alert && (
        <div className="formula-alert" role="alert">
          <p className="formula-alert-title">Fórmula con un error</p>
          <p className="formula-alert-code">
            <code>
              {alert.issue.fragment.before}
              <mark>{alert.issue.fragment.bad || '␣'}</mark>
              {alert.issue.fragment.after}
            </code>
          </p>
          <p className="formula-alert-text">{alert.issue.message}</p>
          <div className="formula-alert-actions">
            {alert.issue.fix && (
              <button
                type="button"
                className="formula-fix"
                onClick={() => {
                  const next =
                    alert.text.slice(0, alert.issue.span.start) +
                    alert.issue.fix?.replacement +
                    alert.text.slice(alert.issue.span.end);
                  change(alert.k, next);
                }}
              >
                Cambiar a {alert.issue.fix.label}
              </button>
            )}
            <button type="button" className="formula-review" onClick={onReview}>
              {issueCount > 1
                ? `Ver los ${issueCount} en Revisión`
                : 'Ver en Revisión'}
            </button>
          </div>
        </div>
      )}
      <div className="inline-preview">
        <p className="inline-kicker">Así se verá</p>
        <ScaledPreview source={source} />
      </div>
    </div>
  );
}
