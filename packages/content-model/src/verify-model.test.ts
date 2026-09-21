import { expect, it } from 'vitest';
import { activitySchema, type Activity } from './index';
import { verifyActivity } from './verify-model';

function activity(overrides: Record<string, unknown> = {}): Activity {
  return activitySchema.parse({
    id: 'entradas',
    type: 'paes',
    prompt: 'Preventa y evento.',
    answer: 'B · 80 y 40.',
    solution: 'Reducción da y = 40 y x = 80.',
    skills: ['Modelar'],
    source: { kind: 'original', reference: 'Propia' },
    model: {
      equations: [
        [1, 1, 120],
        [2, 3, 280],
      ],
    },
    options: [
      {
        id: 'A',
        text: '40 y 80',
        correct: false,
        explanation: 'Precios cambiados.',
        pair: [40, 80],
      },
      {
        id: 'B',
        text: '80 y 40',
        correct: true,
        explanation: 'Cumple ambas.',
        pair: [80, 40],
      },
      {
        id: 'C',
        text: '160 y −40',
        correct: false,
        explanation: 'Resta invertida.',
        pair: [160, -40],
      },
      {
        id: 'D',
        text: '−40 y 160',
        correct: false,
        explanation: 'Signo.',
        pair: [-40, 160],
      },
    ],
    ...overrides,
  });
}

it('acepta una actividad coherente', () => {
  expect(verifyActivity(activity())).toEqual([]);
});
it('detecta una alternativa correcta que no cumple el sistema', () => {
  const broken = activity({
    model: {
      equations: [
        [1, 1, 120],
        [2, 3, 300],
      ],
    },
  });
  expect(verifyActivity(broken).join(' ')).toMatch(/correcta B.*no cumple/);
});
it('detecta un distractor que también es solución', () => {
  const options = activity().options!.map((o) =>
    o.id === 'A'
      ? { ...o, pair: [80, 40] as [number, number], text: '80 y 40' }
      : o,
  );
  expect(verifyActivity(activity({ options })).join(' ')).toMatch(
    /A \(80, 40\) cumple el sistema pero está marcada como incorrecta/,
  );
});
it('detecta un texto que no coincide con el par', () => {
  const options = activity().options!.map((o) =>
    o.id === 'D' ? { ...o, text: '40 y 160' } : o,
  );
  expect(verifyActivity(activity({ options })).join(' ')).toMatch(
    /alternativa D no muestra el valor -40/,
  );
});
it('no confunde 40 con −40 ni con 400', () => {
  const options = activity().options!.map((o) =>
    o.id === 'A' ? { ...o, text: '−40 y 400' } : o,
  );
  expect(verifyActivity(activity({ options })).join(' ')).toMatch(
    /alternativa A no muestra el valor 40/,
  );
});
it('detecta una respuesta que no empieza con la alternativa correcta', () => {
  expect(
    verifyActivity(activity({ answer: 'C · 80 y 40.' })).join(' '),
  ).toMatch(/no empieza con la alternativa correcta B/);
});
it('reconoce miles con punto en el texto', () => {
  const big = activity({
    model: {
      equations: [
        [2, 3, 5100],
        [4, 1, 6700],
      ],
    },
    solution: 'Da x = 1.500 e y = 700.',
    answer: 'B · 1.500 y 700.',
    options: [
      {
        id: 'A',
        text: '700 y 1.500',
        correct: false,
        explanation: 'Invertido.',
        pair: [700, 1500],
      },
      {
        id: 'B',
        text: '1.500 y 700',
        correct: true,
        explanation: 'Cumple.',
        pair: [1500, 700],
      },
      {
        id: 'C',
        text: '1.000 y 1.033',
        correct: false,
        explanation: 'Otro.',
        pair: [1000, 1033],
      },
      {
        id: 'D',
        text: '0 y 6.700',
        correct: false,
        explanation: 'Otro.',
        pair: [0, 6700],
      },
    ],
  });
  expect(verifyActivity(big)).toEqual([]);
});
it('el esquema exige pair en todas las alternativas si hay model', () => {
  const options = activity().options!.map(({ pair, ...rest }, i) =>
    i === 0 ? rest : { ...rest, pair },
  );
  expect(() => activity({ options })).toThrow(
    /cada alternativa debe declarar su `pair`/,
  );
});
it('el esquema rechaza un pair sin model', () => {
  expect(() => activity({ model: undefined })).toThrow(
    /requiere declarar el `model`/,
  );
});
