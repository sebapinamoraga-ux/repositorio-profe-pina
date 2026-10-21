/** MDX inicial de cada bloque que se inserta con la barra Insertar. */
export const TEXT_SOURCE = 'Un párrafo con **lo importante** destacado.';
export const FORMULA_SOURCE = '$$\nax+by=c\n$$';
export const CARD_SOURCE =
  '<Tarjeta titulo="Encabezado de la tarjeta">\nEscribe el contenido. Usa $x$ para fórmulas.\n</Tarjeta>';
export const PANELS_SOURCE = [
  '<Paneles>',
  '<div>',
  '<Tarjeta titulo="Panel 1">',
  'Contenido del primer panel.',
  '</Tarjeta>',
  '</div>',
  '<div>',
  '<Tarjeta titulo="Panel 2">',
  'Contenido del segundo panel.',
  '</Tarjeta>',
  '</div>',
  '</Paneles>',
].join('\n');

/** La pregunta del banco; el paso en que se muestra su respuesta. */
export const questionSource = (id: string, step: number) =>
  `<PreguntaPAES id="${id}" paso={${step}} />`;

export interface Family {
  key: string;
  label: string;
  component: string;
  /** Tono del color de la familia (tokens de la app). */
  tone:
    | 'blue'
    | 'objective'
    | 'procedure'
    | 'yellow'
    | 'success'
    | 'reflection';
  title: string;
  body: string;
}

/** Bloques «por función»: cada uno lleva el color de su función pedagógica. */
export const FAMILIES: Family[] = [
  {
    key: 'definicion',
    label: 'Definición',
    component: 'Definicion',
    tone: 'blue',
    title: 'Definición',
    body: 'Enuncia la definición formal con **las palabras clave**.',
  },
  {
    key: 'objetivo',
    label: 'Objetivo',
    component: 'Objetivo',
    tone: 'objective',
    title: 'Objetivo de clase',
    body: 'Lo que el estudiante podrá hacer al terminar.',
  },
  {
    key: 'ejemplo',
    label: 'Ejemplo',
    component: 'EjemploResuelto',
    tone: 'procedure',
    title: 'Ejemplo resuelto',
    body: 'Cada paso indica qué operación se aplicó y para qué.',
  },
  {
    key: 'practica',
    label: 'Práctica',
    component: 'PracticaGuiada',
    tone: 'yellow',
    title: 'Práctica guiada',
    body: 'Consigna, modalidad y tiempo de trabajo.',
  },
  {
    key: 'error',
    label: 'Error típico',
    component: 'ErrorTipico',
    tone: 'yellow',
    title: 'Error típico',
    body: 'Muestra el error y la evidencia del fallo.',
  },
  {
    key: 'comprobacion',
    label: 'Comprobación',
    component: 'Comprobacion',
    tone: 'success',
    title: 'Comprobación',
    body: 'Comprueba el resultado en el enunciado original.',
  },
  {
    key: 'cierre',
    label: 'Cierre',
    component: 'Cierre',
    tone: 'reflection',
    title: 'Cierre',
    body: '¿Qué aprendiste hoy? ¿Qué te ayudó de la presentación?',
  },
];

export const familySource = (family: Family) =>
  `<${family.component} titulo="${family.title}">\n${family.body}\n</${family.component}>`;
