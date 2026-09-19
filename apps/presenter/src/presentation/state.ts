export interface PresentationState {
  index: number;
  steps: Record<string, number>;
  values: Record<string, Record<string, string>>;
  generation: number;
}
export const initialState: PresentationState = {
  index: 0,
  steps: {},
  values: {},
  generation: 0,
};
export type Action =
  | { type: 'next' | 'previous'; slides: { id: string; steps: number }[] }
  | { type: 'jump'; index: number }
  | { type: 'value'; slide: string; key: string; value: string }
  | { type: 'reset' };
export function reducer(
  state: PresentationState,
  action: Action,
): PresentationState {
  if (action.type === 'reset')
    return { ...initialState, generation: state.generation + 1 };
  if (action.type === 'jump') return { ...state, index: action.index };
  if (action.type === 'value')
    return {
      ...state,
      values: {
        ...state.values,
        [action.slide]: {
          ...state.values[action.slide],
          [action.key]: action.value,
        },
      },
    };
  const slide = action.slides[state.index];
  if (!slide) return state;
  const step = state.steps[slide.id] ?? 0;
  if (action.type === 'next') {
    if (step < slide.steps)
      return { ...state, steps: { ...state.steps, [slide.id]: step + 1 } };
    return {
      ...state,
      index: Math.min(state.index + 1, action.slides.length - 1),
    };
  }
  if (step > 0)
    return { ...state, steps: { ...state.steps, [slide.id]: step - 1 } };
  return { ...state, index: Math.max(0, state.index - 1) };
}
