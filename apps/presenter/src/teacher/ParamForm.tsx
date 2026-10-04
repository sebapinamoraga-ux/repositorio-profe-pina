import { useState } from 'react';
import type { Activity } from '@aula/content-model';
import {
  INTERACTIVE_SPECS,
  visibleParams,
  type ParamSpec,
  type ParamValue,
} from '@aula/content-model/interactive-params';
import type { Field } from '../editor/mdx-fields';

type ParamsField = Extract<Field, { kind: 'params' }>;

const toNumber = (text: string) => {
  const normalized = text.trim().replace(',', '.').replace('−', '-');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
};

/** Texto que se edita libre y se aplica cuando es válido (números, listas). */
function DraftInput({
  value,
  parse,
  onCommit,
  label,
  multiline = false,
}: {
  value: string;
  parse: (text: string) => ParamValue | undefined | null;
  onCommit: (value: ParamValue | undefined) => void;
  label: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const parsed = draft === null ? undefined : parse(draft);
  const change = (next: string) => {
    setDraft(next);
    const result = parse(next);
    if (result !== null) onCommit(result);
  };
  const props = {
    'aria-label': label,
    'aria-invalid': parsed === null ? true : undefined,
    value: text,
    onBlur: () => setDraft(null),
  } as const;
  return multiline ? (
    <textarea rows={3} {...props} onChange={(event) => change(event.target.value)} />
  ) : (
    <input {...props} inputMode="decimal" onChange={(event) => change(event.target.value)} />
  );
}

function ParamInput({
  spec,
  value,
  options,
  onChange,
}: {
  spec: ParamSpec;
  value: ParamValue | undefined;
  options: readonly string[];
  onChange: (value: ParamValue | undefined) => void;
}) {
  const label = `${spec.label}${spec.required ? '' : ' (opcional)'}`;
  const optional = (text: string) => (text ? text : undefined);
  switch (spec.kind) {
    case 'number':
      return (
        <DraftInput
          label={spec.label}
          value={typeof value === 'number' ? String(value) : ''}
          parse={(text) => (text.trim() === '' ? (spec.required ? null : undefined) : toNumber(text))}
          onCommit={onChange}
        />
      );
    case 'text':
      return (
        <input
          aria-label={label}
          value={typeof value === 'string' ? value : ''}
          placeholder={typeof spec.fallback === 'string' ? spec.fallback : undefined}
          onChange={(event) => onChange(spec.required ? event.target.value : optional(event.target.value))}
        />
      );
    case 'longtext':
      return (
        <textarea
          aria-label={label}
          rows={2}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(spec.required ? event.target.value : optional(event.target.value))}
        />
      );
    case 'boolean': {
      const checked = typeof value === 'boolean' ? value : spec.fallback === true;
      return (
        <input
          type="checkbox"
          aria-label={spec.label}
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked === (spec.fallback === true) ? undefined : event.target.checked)
          }
        />
      );
    }
    case 'enum': {
      const current = typeof value === 'string' ? value : '';
      const all = current && !options.includes(current) ? [current, ...options] : options;
      return (
        <select aria-label={spec.label} value={current} onChange={(event) => onChange(event.target.value)}>
          {!current && <option value="">Elegir…</option>}
          {all.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    case 'numbers':
      return (
        <DraftInput
          label={spec.label}
          value={Array.isArray(value) ? value.join('; ') : ''}
          parse={(text) => {
            if (!text.trim()) return spec.required ? null : undefined;
            const items = text.split(/[;\n]/).map((item) => toNumber(item));
            return items.every((item): item is number => item !== null) ? items : null;
          }}
          onCommit={onChange}
        />
      );
    case 'texts':
      return (
        <DraftInput
          multiline
          label={spec.label}
          value={Array.isArray(value) ? value.map(String).join('\n') : ''}
          parse={(text) => {
            const items = text.split('\n').filter((line) => line.trim());
            if (!items.length) return spec.required ? null : undefined;
            return items;
          }}
          onCommit={onChange}
        />
      );
  }
}

/** Formulario de los parámetros de un interactivo, una pregunta PAES o la mascota. */
export function ParamFields({
  field,
  activities,
  steps,
  onChange,
}: {
  field: ParamsField;
  activities: Record<string, Activity>;
  steps: number;
  onChange: (name: string, value: ParamValue | undefined) => void;
}) {
  const spec = INTERACTIVE_SPECS[field.component];
  if (!spec) return null;
  const values = Object.fromEntries(
    Object.entries(field.attrs).map(([name, attr]) => [name, attr.value]),
  );
  const optionsFor = (param: ParamSpec): readonly string[] => {
    if (field.component === 'PreguntaPAES' && param.name === 'id')
      return Object.values(activities)
        .filter((activity) => activity.type === 'paes')
        .map((activity) => activity.id);
    return param.options ?? [];
  };
  return (
    <fieldset className="param-form">
      <legend>{spec.label}</legend>
      {visibleParams(spec, values).map((param) => (
        <label
          key={param.name}
          className={param.kind === 'boolean' ? 'check-row' : 'field-plain'}
        >
          {param.kind !== 'boolean' && (
            <span>
              {param.label}
              {!param.required && <span className="field-note"> (opcional)</span>}
            </span>
          )}
          <ParamInput
            spec={param}
            value={values[param.name]}
            options={optionsFor(param)}
            onChange={(value) => onChange(param.name, value)}
          />
          {param.kind === 'boolean' && <span>{param.label}</span>}
          {param.help && <span className="field-note">{param.help}</span>}
          {field.component === 'PreguntaPAES' && param.name === 'paso' && steps === 0 && (
            <span className="field-note">La lámina necesita al menos un paso revelable.</span>
          )}
        </label>
      ))}
    </fieldset>
  );
}
