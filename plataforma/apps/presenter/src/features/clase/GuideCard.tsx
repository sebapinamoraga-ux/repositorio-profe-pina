import { useState, type ReactNode } from 'react';
import katex from 'katex';
import { Compass } from 'lucide-react';
import { katexOptions } from '@aula/content-model';
import { guidePath } from '@aula/content-model/content-files';
import {
  GUIDE_SECTIONS,
  REQUIRED_GUIDE_SECTIONS,
  formatGuide,
  guideTemplate,
  isGuideSectionBlank,
  parseGuide,
} from '@aula/content-model/guide';
import { useContent } from '../../content/ContentProvider';
import { findLesson } from '../../content/ops';
import { useUi } from '../../ui/UiProvider';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Layout';

/** Texto en línea de la guía: `$…$` con KaTeX, `**negrita**` y `código`. */
function inline(text: string): ReactNode[] {
  return text.split(/(\$[^$]+\$|\*\*[^*]+\*\*|`[^`]+`)/).map((part, k) => {
    if (/^\$[^$]+\$$/.test(part))
      return (
        <span
          key={k}
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(part.slice(1, -1), {
              ...katexOptions,
              throwOnError: false,
            }),
          }}
        />
      );
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(part)) return <code key={k}>{part.slice(1, -1)}</code>;
    return part;
  });
}

/** Un apartado de la guía: párrafos y listas con guion, sin el resto de Markdown. */
function GuideText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let items: string[] = [];
  const flush = () => {
    if (items.length)
      blocks.push(
        <ul key={blocks.length}>
          {items.map((item, k) => (
            <li key={k}>{inline(item)}</li>
          ))}
        </ul>,
      );
    items = [];
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('- ')) items.push(line.slice(2));
    else {
      flush();
      if (line.trim()) blocks.push(<p key={blocks.length}>{inline(line)}</p>);
    }
  }
  flush();
  return <>{blocks}</>;
}

/**
 * Guía pedagógica de la clase (`guia.md`): propósito, evidencia, errores esperados y
 * decisiones. Se lee antes de tocar las láminas y se edita por apartados.
 */
export function GuideCard({ lessonId }: { lessonId: string }) {
  const content = useContent();
  const ui = useUi();
  const lesson = findLesson(content.bundle, lessonId);
  const [draft, setDraft] = useState<Map<string, string> | null>(null);
  if (!lesson) return null;
  const guide = lesson.guide ? parseGuide(lesson.guide.text) : null;
  const published = lesson.meta.status === 'published';
  const required = new Set<string>(REQUIRED_GUIDE_SECTIONS);
  const tab = (
    <>
      <Compass size={20} aria-hidden="true" />
      Guía pedagógica
    </>
  );

  if (!guide)
    return (
      <Card tone="reflexion" tab={tab} aria-label="Guía pedagógica">
        <p className="muted">
          Esta clase aún no tiene guía: el propósito, la evidencia de
          aprendizaje y los errores esperados que las láminas deben servir.
        </p>
        <Button
          variant="add"
          disabled={!content.canEdit}
          onClick={() =>
            content.edit([
              { path: guidePath(lesson.dir), text: guideTemplate(lesson.meta) },
            ])
          }
        >
          Crear la guía
        </Button>
      </Card>
    );

  const apply = () => {
    if (!draft) return;
    const undo = content.snap();
    const sections = new Map(guide.sections);
    for (const [title, text] of draft) sections.set(title, text.trim());
    content.edit([
      {
        path: guidePath(lesson.dir),
        text: formatGuide({ title: guide.title, sections }),
      },
    ]);
    setDraft(null);
    ui.toast('Guía actualizada; queda pendiente hasta guardar.', undo);
  };

  if (draft)
    return (
      <Card
        tone="reflexion"
        tab={tab}
        aria-label="Guía pedagógica"
        className="guide-card"
      >
        {GUIDE_SECTIONS.map(({ title, hint }) => (
          <label key={title} className="field">
            <span>
              {title}
              {required.has(title) && (
                <span className="guide-required">
                  {' '}
                  · necesaria para publicar
                </span>
              )}
            </span>
            <textarea
              rows={4}
              value={draft.get(title) ?? ''}
              placeholder={hint}
              onChange={(event) =>
                setDraft(new Map(draft).set(title, event.target.value))
              }
            />
          </label>
        ))}
        <div className="row">
          <Button variant="primary" onClick={apply}>
            Aplicar
          </Button>
          <Button variant="quiet" onClick={() => setDraft(null)}>
            Cancelar
          </Button>
        </div>
      </Card>
    );

  const startEditing = () =>
    setDraft(
      new Map(
        GUIDE_SECTIONS.map(({ title }) => {
          const text = guide.sections.get(title) ?? '';
          return [title, isGuideSectionBlank(text) ? '' : text];
        }),
      ),
    );
  return (
    <Card
      tone="reflexion"
      tab={tab}
      aria-label="Guía pedagógica"
      className="guide-card"
    >
      <dl className="guide-sections">
        {GUIDE_SECTIONS.map(({ title, hint }) => {
          const text = guide.sections.get(title) ?? '';
          const blank = isGuideSectionBlank(text);
          return (
            <div key={title} className="guide-section">
              <dt>{title}</dt>
              {blank ? (
                <dd
                  className={
                    required.has(title) && published ? 'guide-missing' : 'muted'
                  }
                >
                  Por completar: {hint.charAt(0).toLowerCase() + hint.slice(1)}
                </dd>
              ) : (
                <dd className="guide-text">
                  <GuideText text={text} />
                </dd>
              )}
            </div>
          );
        })}
      </dl>
      <Button disabled={!content.canEdit} onClick={startEditing}>
        Editar la guía
      </Button>
    </Card>
  );
}
