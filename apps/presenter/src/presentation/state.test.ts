import { expect, it } from 'vitest';
import { initialState, reducer } from './state';
const slides = [
  { id: 'a', steps: 2 },
  { id: 'b', steps: 1 },
];
it('revela antes de avanzar, conserva estados y reinicia respuestas', () => {
  let state = reducer(initialState, { type: 'next', slides });
  expect(state.index).toBe(0);
  expect(state.steps.a).toBe(1);
  state = reducer(state, { type: 'next', slides });
  state = reducer(state, { type: 'next', slides });
  expect(state.index).toBe(1);
  state = reducer(state, { type: 'previous', slides });
  expect(state.steps.a).toBe(2);
  state = reducer(state, { type: 'value', slide: 'a', key: 'q', value: 'B' });
  state = reducer(state, { type: 'reset' });
  expect(state.values).toEqual({});
  expect(state.steps).toEqual({});
});
