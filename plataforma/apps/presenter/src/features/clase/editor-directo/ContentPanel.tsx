import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { mascotGallery } from '../../../app/gallery';
import { useContent } from '../../../content/ContentProvider';
import type { EditedSlide } from '../../../store/schema';
import { IconButton } from '../../../ui/Button';
import { Notice } from '../../../ui/Layout';
import type { Field } from '../editor/mdx-fields';
import { ParamFields } from '../ParamForm';
import { PRESENCE } from './shared';

type FieldsModule = typeof import('../editor/mdx-fields');

/**
 * Provisional hasta la edición directa sobre la lámina: los campos de cada bloque y los pasos
 * revelables, en el panel derecho.
 */
export function ContentPanel({
  slide,
  layout,
  open,
  editable,
  onUpdate,
  onClose,
}: {
  slide: EditedSlide;
  layout: 'wide' | 'mid' | 'narrow';
  open: boolean;
  editable: boolean;
  onUpdate: (patch: Partial<EditedSlide>) => void;
  onClose: () => void;
}) {
  const content = useContent();
  const [fieldsModule, setFieldsModule] = useState<FieldsModule | null>(null);
  useEffect(() => {
    void import('../editor/mdx-fields').then(setFieldsModule);
  }, []);
  const fields = useMemo<Field[] | 'error' | null>(() => {
    if (!fieldsModule) return null;
    try {
      return fieldsModule.extractFields(slide.body);
    } catch {
      return 'error';
    }
  }, [fieldsModule, slide.body]);

  const editors = (() => {
    if (fields === null)
      return <p className="muted small">Leyendo el contenido…</p>;
    if (fields === 'error')
      return (
        <Notice tone="error" className="small">
          El MDX de esta lámina tiene un error de sintaxis. Corrígelo en la
          vista avanzada (menú ⋯ de la lámina).
        </Notice>
      );
    let lastGroup: string | null = null;
    return fields.map((field, k) => {
      const newGroup = field.group !== lastGroup;
      lastGroup = field.group;
      const change = (value: string) => {
        const now = fieldsModule?.extractFields(slide.body)[k];
        if (
          !now ||
          now.kind === 'fixed' ||
          now.kind === 'params' ||
          !fieldsModule
        )
          return;
        onUpdate({ body: fieldsModule.spliceField(slide.body, now, value) });
      };
      if (field.kind === 'params')
        return (
          <div
            key={`${k}-${field.group}-${field.label}`}
            className={`field-block ${newGroup && k ? 'is-new-group' : ''}`}
          >
            {newGroup && field.group && (
              <p className="field-group">{field.group}</p>
            )}
            <ParamFields
              field={field}
              activities={content.bundle.activities}
              steps={slide.steps}
              onChange={(name, value) => {
                const now = fieldsModule?.extractFields(slide.body)[k];
                if (!now || now.kind !== 'params' || !fieldsModule) return;
                const body = fieldsModule.setParam(
                  slide.body,
                  now,
                  name,
                  value,
                );
                const patch: Partial<EditedSlide> = { body };
                if (
                  now.component === 'PreguntaPAES' &&
                  name === 'id' &&
                  typeof value === 'string'
                )
                  patch.activities = [
                    ...new Set([
                      ...slide.activities.filter(
                        (a) => a !== now.attrs.id?.value,
                      ),
                      value,
                    ]),
                  ];
                onUpdate(patch);
              }}
            />
          </div>
        );
      return (
        <div
          key={`${k}-${field.group}-${field.label}`}
          className={`field-block ${newGroup && k ? 'is-new-group' : ''}`}
        >
          {newGroup && field.group && (
            <p className="field-group">{field.group}</p>
          )}
          <label className="field-plain">
            {field.label}
            {field.kind === 'text' && (
              <textarea
                className="mono"
                disabled={!editable}
                rows={Math.min(
                  8,
                  Math.max(
                    2,
                    Math.ceil(field.value.length / 42) +
                      (field.value.match(/\n/g)?.length ?? 0),
                  ),
                )}
                value={field.value}
                onChange={(event) => change(event.target.value)}
              />
            )}
            {field.kind === 'attr' && (
              <input
                value={field.value}
                disabled={!editable}
                onChange={(event) => change(event.target.value)}
              />
            )}
            {field.kind === 'template' && (
              <select
                value={field.value}
                disabled={!editable}
                onChange={(event) => change(event.target.value)}
              >
                {mascotGallery.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} · {PRESENCE[t.mascot.nivel]}
                  </option>
                ))}
              </select>
            )}
            {field.kind === 'fixed' && (
              <span className="field-fixed">{field.value}</span>
            )}
          </label>
        </div>
      );
    });
  })();

  return (
    <section
      aria-label="Contenido de la lámina"
      className={`editor-props is-${layout} ${layout === 'mid' && !open ? 'is-hidden' : ''}`}
    >
      <div className="props-head">
        <h2>Contenido</h2>
        {layout === 'mid' && (
          <IconButton label="Cerrar contenido" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
      <div className="props-grid">
        <div className="field">
          Pasos revelables
          <div className="stepper">
            <IconButton
              outline
              label="Menos pasos"
              disabled={!editable || slide.steps === 0}
              onClick={() => onUpdate({ steps: Math.max(0, slide.steps - 1) })}
            >
              −
            </IconButton>
            <span>{slide.steps}</span>
            <IconButton
              outline
              label="Más pasos"
              disabled={!editable || slide.steps === 12}
              onClick={() => onUpdate({ steps: Math.min(12, slide.steps + 1) })}
            >
              +
            </IconButton>
          </div>
        </div>
      </div>
      <div className="props-fields">
        <p className="kicker">Contenido de los bloques</p>
        {editors}
        <p className="muted small">
          Usa $…$ para fórmulas, **…** para destacar y líneas «1. » para listas.
          El color de cada bloque lo define su función.
        </p>
      </div>
    </section>
  );
}
