/**
 * Parámetros de los interactivos y bloques fijos que el editor ofrece como formulario.
 * content:check usa los mismos requisitos, así que un formulario completo siempre compila.
 */
export type ParamValue = number | string | boolean | number[] | string[];

export type ParamKind =
  | 'number'
  | 'text'
  | 'longtext'
  | 'boolean'
  | 'enum'
  | 'numbers'
  | 'texts';

export interface ParamSpec {
  name: string;
  label: string;
  kind: ParamKind;
  required?: boolean;
  options?: readonly string[];
  help?: string;
  /** Valor que usa el componente si se omite (para mostrarlo en el formulario). */
  fallback?: ParamValue;
}

export interface InteractiveSpec {
  label: string;
  params: readonly ParamSpec[];
  /** Parámetros que solo aplican según otros valores (p. ej. los coeficientes según `tipo`). */
  visible?: (values: Readonly<Record<string, ParamValue>>) => ReadonlySet<string> | null;
}

const n = (name: string, label: string, required = true, fallback?: number): ParamSpec => ({
  name,
  label,
  kind: 'number',
  required,
  ...(fallback === undefined ? {} : { fallback }),
});
const t = (name: string, label: string, required = true, fallback?: string): ParamSpec => ({
  name,
  label,
  kind: 'text',
  required,
  ...(fallback === undefined ? {} : { fallback }),
});
const descripcion: ParamSpec = {
  name: 'descripcion',
  label: 'Descripción accesible',
  kind: 'longtext',
  required: true,
  help: 'Lo que muestra el gráfico, en una o dos frases.',
};
const ventana = [n('xMin', 'x mínimo'), n('xMax', 'x máximo'), n('yMin', 'y mínimo'), n('yMax', 'y máximo')];

const FUNCTION_COEFFICIENTS: Record<string, readonly string[]> = {
  afin: ['m', 'n'],
  cuadratica: ['a', 'b', 'c'],
  circunferencia: ['h', 'k', 'r'],
};
const ALL_COEFFICIENTS = new Set(Object.values(FUNCTION_COEFFICIENTS).flat());

export const INTERACTIVE_SPECS: Readonly<Record<string, InteractiveSpec>> = {
  GraficoRectas: {
    label: 'Gráfico de dos rectas',
    params: [
      n('a1', 'a₁ (recta 1: a₁x + b₁y = c₁)'),
      n('b1', 'b₁'),
      n('c1', 'c₁'),
      n('a2', 'a₂ (recta 2: a₂x + b₂y = c₂)'),
      n('b2', 'b₂'),
      n('c2', 'c₂'),
      n('max', 'Máximo de los ejes'),
      descripcion,
    ],
  },
  GraficoDosCondiciones: {
    label: 'Gráfico interactivo de dos condiciones',
    params: [
      t('id', 'Identificador del interactivo'),
      n('a1', 'a₁'),
      n('b1', 'b₁'),
      n('c1', 'c₁'),
      n('a2', 'a₂'),
      n('b2', 'b₂'),
      n('c2', 'c₂'),
      n('xMax', 'x máximo'),
      n('yMax', 'y máximo'),
      n('xInicial', 'x inicial', false, 0),
      n('xEstatico', 'x en la versión impresa'),
      n('paso', 'Paso del control', false, 100),
      t('etiqueta1', 'Etiqueta 1', false, 'Condición 1'),
      t('etiqueta2', 'Etiqueta 2', false, 'Condición 2'),
    ],
  },
  GraficoSistema: {
    label: 'Gráfico del sistema',
    params: [n('sumaInicial', 'Suma inicial', false, 7), n('sumaEstatica', 'Suma impresa', false, 7)],
  },
  GraficoFuncion: {
    label: 'Gráfico de función',
    params: [
      {
        name: 'tipo',
        label: 'Tipo de curva',
        kind: 'enum',
        required: true,
        options: ['afin', 'cuadratica', 'circunferencia'],
      },
      n('m', 'm (pendiente)'),
      n('n', 'n (coeficiente de posición)'),
      n('a', 'a'),
      n('b', 'b'),
      n('c', 'c'),
      n('h', 'h (centro x)'),
      n('k', 'k (centro y)'),
      n('r', 'r (radio)'),
      ...ventana,
      n('paso', 'Paso de la grilla', false, 1),
      n('pasoY', 'Paso vertical', false),
      t('ejeX', 'Nombre del eje x', false, 'x'),
      t('ejeY', 'Nombre del eje y', false, 'y'),
      { name: 'puntosX', label: 'Puntos marcados (valores de x)', kind: 'numbers' },
      n('rectaVertical', 'Recta vertical en x =', false),
      { name: 'marcarCorteY', label: 'Marcar el corte con el eje y', kind: 'boolean', fallback: false },
      n('pendienteEn', 'Triángulo de pendiente desde x =', false),
      t('etiqueta', 'Etiqueta'),
      descripcion,
    ],
    visible: (values) => {
      const tipo = typeof values.tipo === 'string' ? values.tipo : '';
      const keep = new Set(FUNCTION_COEFFICIENTS[tipo] ?? []);
      return new Set(
        (INTERACTIVE_SPECS.GraficoFuncion?.params ?? [])
          .map((p) => p.name)
          .filter((name) => !ALL_COEFFICIENTS.has(name) || keep.has(name)),
      );
    },
  },
  GraficoComparacion: {
    label: 'Comparación de dos rectas',
    params: [
      n('m1', 'm₁'),
      n('n1', 'n₁'),
      n('m2', 'm₂'),
      n('n2', 'n₂'),
      ...ventana,
      n('pasoX', 'Paso horizontal', false, 1),
      n('pasoY', 'Paso vertical', false, 1),
      t('ejeX', 'Nombre del eje x', false, 'x'),
      t('ejeY', 'Nombre del eje y', false, 'y'),
      t('etiqueta1', 'Etiqueta recta 1'),
      t('etiqueta2', 'Etiqueta recta 2'),
      { name: 'resaltarMenor', label: 'Resaltar la menor', kind: 'boolean', fallback: false },
      { name: 'marcarInterseccion', label: 'Marcar la intersección', kind: 'boolean', fallback: true },
      { name: 'rotularInterseccion', label: 'Rotular la intersección', kind: 'boolean', fallback: true },
      descripcion,
    ],
  },
  RectaIntervalos: {
    label: 'Recta numérica con intervalos',
    params: [
      n('min', 'Mínimo'),
      n('max', 'Máximo'),
      n('paso', 'Paso', false, 1),
      {
        name: 'intervalos',
        label: 'Intervalos',
        kind: 'texts',
        required: true,
        help: 'Por ejemplo [0; 7,5[ o ]7,5; +∞[.',
      },
      { name: 'etiquetas', label: 'Etiquetas', kind: 'texts' },
      { name: 'tonos', label: 'Tonos (1 o 2)', kind: 'numbers' },
      descripcion,
    ],
  },
  DiagramaSagital: {
    label: 'Diagrama sagital',
    params: [
      { name: 'entradas', label: 'Entradas', kind: 'texts', required: true },
      { name: 'salidas', label: 'Salidas', kind: 'texts', required: true },
      {
        name: 'flechas',
        label: 'Flechas',
        kind: 'texts',
        required: true,
        help: 'Una por línea, como «1 → 500».',
      },
      t('tituloEntradas', 'Título de las entradas'),
      t('tituloSalidas', 'Título de las salidas'),
      descripcion,
    ],
  },
  MaquinaFuncion: {
    label: 'Máquina de función',
    params: [t('entrada', 'Entrada'), t('regla', 'Regla'), t('salida', 'Salida'), descripcion],
  },
  ExploradorCuadratica: {
    label: 'Explorador de la parábola',
    params: [
      t('id', 'Identificador del interactivo'),
      n('b', 'b (fijo)'),
      n('aInicial', 'a inicial'),
      n('cInicial', 'c inicial'),
      n('aEstatico', 'a en la versión impresa'),
      n('cEstatico', 'c en la versión impresa'),
      n('aMin', 'a mínimo', false, -3),
      n('aMax', 'a máximo', false, 3),
      n('aPaso', 'Paso de a', false, 0.5),
      n('cMin', 'c mínimo', false, -4),
      n('cMax', 'c máximo', false, 4),
      n('cPaso', 'Paso de c', false, 1),
      ...ventana,
      n('paso', 'Paso de la grilla', false, 1),
      n('pasoY', 'Paso vertical', false),
      descripcion,
    ],
  },
  PreguntaPAES: {
    label: 'Pregunta PAES',
    params: [
      { name: 'id', label: 'Actividad del banco', kind: 'enum', required: true },
      n('paso', 'Paso en que aparece', false, 1),
    ],
  },
  MascotaProfePina: {
    label: 'Mascota',
    params: [
      n('pose', 'Pose'),
      { name: 'nivel', label: 'Presencia', kind: 'enum', required: true, options: ['sutil', 'pedagogica', 'marca'] },
      {
        name: 'ubicacion',
        label: 'Ubicación',
        kind: 'enum',
        required: true,
        options: ['superior-derecha', 'inferior-derecha', 'lateral-derecha', 'junto-bloque', 'grafico'],
      },
      { name: 'alt', label: 'Texto alternativo', kind: 'longtext', required: true },
    ],
  },
};

/** Parámetros que aplican a un uso concreto (según `tipo` u otros valores). */
export function visibleParams(
  spec: InteractiveSpec,
  values: Readonly<Record<string, ParamValue>>,
): ParamSpec[] {
  const visible = spec.visible?.(values) ?? null;
  return spec.params.filter((param) => !visible || visible.has(param.name));
}

/** Atributos obligatorios que faltan; mismo criterio en content:check y en el formulario. */
export function missingParams(
  component: string,
  present: ReadonlySet<string>,
  values: Readonly<Record<string, ParamValue>> = {},
): string[] {
  const spec = INTERACTIVE_SPECS[component];
  if (!spec) return [];
  return visibleParams(spec, values)
    .filter((param) => param.required && !present.has(param.name))
    .map((param) => param.name);
}

/** Lee un atributo JSX literal. null si es una expresión que el formulario no sabe editar. */
export function parseLiteral(value: unknown): ParamValue | null {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return true;
  if (typeof value !== 'object' || !('value' in value) || typeof value.value !== 'string')
    return null;
  const text = value.value.trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const quoted = /^(['"])((?:\\.|(?!\1).)*)\1$/s.exec(text);
  if (quoted) return (quoted[2] ?? '').replace(/\\(.)/g, '$1');
  if (text.startsWith('[') && text.endsWith(']')) {
    const inner = text.slice(1, -1).trim();
    if (!inner) return [];
    const items = [...inner.matchAll(/\s*(?:(-?\d+(?:\.\d+)?)|(['"])((?:\\.|(?!\2).)*)\2)\s*(?:,|$)/gs)];
    const consumed = items.reduce((sum, m) => sum + m[0].length, 0);
    if (consumed !== inner.length) return null;
    if (items.every((m) => m[1] !== undefined)) return items.map((m) => Number(m[1]));
    if (items.every((m) => m[1] === undefined))
      return items.map((m) => (m[3] ?? '').replace(/\\(.)/g, '$1'));
    return null;
  }
  return null;
}

const quoteSingle = (text: string) => `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** Escribe `nombre=valor` como lo haría a mano la autora (booleanos verdaderos sin valor). */
export function printAttribute(name: string, value: ParamValue): string {
  if (value === true) return name;
  if (value === false) return `${name}={false}`;
  if (typeof value === 'number') return `${name}={${value}}`;
  if (typeof value === 'string')
    return value.includes('"') ? `${name}={${quoteSingle(value)}}` : `${name}="${value}"`;
  if (value.every((item): item is number => typeof item === 'number'))
    return `${name}={[${value.join(', ')}]}`;
  return `${name}={[${value.map((item) => quoteSingle(String(item))).join(', ')}]}`;
}
