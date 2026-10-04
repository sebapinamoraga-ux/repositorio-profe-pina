import {
  initialState,
  reducer as presentationReducer,
  type Action as PresentationAction,
  type PresentationState,
} from '../presentation/state';

/** Una papeleta por dispositivo: cambiar de alternativa reemplaza la anterior. */
export interface VoteState {
  open: boolean;
  closed: boolean;
  activity: string | null;
  ballots: Record<string, string>;
  round: number;
}

/** Estado de la proyección compartido entre presentador, control remoto y estudiantes. */
export interface LiveState extends PresentationState {
  lessonId: string;
  joinCode: string;
  vote: VoteState;
}

export type LiveAction =
  | PresentationAction
  | { type: 'load'; lessonId: string; index: number }
  | { type: 'replaceLive'; live: LiveState }
  | { type: 'setJoinCode'; code: string }
  | { type: 'openVote'; activity: string }
  | { type: 'castVote'; device: string; option: string; round: number }
  | { type: 'closeVote' }
  | { type: 'reopenVote' }
  | { type: 'clearVote' };

export const emptyVote: VoteState = {
  open: false,
  closed: false,
  activity: null,
  ballots: {},
  round: 0,
};

export function initialLive(lessonId: string, joinCode = ''): LiveState {
  return { ...initialState, lessonId, joinCode, vote: emptyVote };
}

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case 'load':
      if (action.lessonId === state.lessonId)
        return { ...state, index: action.index };
      return {
        ...initialLive(action.lessonId, state.joinCode),
        index: action.index,
        generation: state.generation + 1,
      };
    case 'replaceLive':
      return action.live;
    case 'setJoinCode':
      return { ...state, joinCode: action.code };
    case 'reset':
      return {
        ...state,
        ...presentationReducer(state, action),
        vote: { ...emptyVote, round: state.vote.round },
      };
    case 'openVote':
      return {
        ...state,
        vote: {
          open: true,
          closed: false,
          activity: action.activity,
          ballots: {},
          round: state.vote.round + 1,
        },
      };
    case 'castVote': {
      const vote = state.vote;
      if (!vote.open || action.round !== vote.round) return state;
      if (vote.ballots[action.device] === action.option) return state;
      return {
        ...state,
        vote: {
          ...vote,
          ballots: { ...vote.ballots, [action.device]: action.option },
        },
      };
    }
    case 'closeVote':
      if (!state.vote.activity) return state;
      return { ...state, vote: { ...state.vote, open: false, closed: true } };
    case 'reopenVote':
      if (!state.vote.activity) return state;
      return { ...state, vote: { ...state.vote, open: true, closed: false } };
    case 'clearVote':
      return { ...state, vote: { ...emptyVote, round: state.vote.round } };
    default:
      return { ...state, ...presentationReducer(state, action) };
  }
}

export function voteCounts(vote: VoteState, optionIds: readonly string[]) {
  const counts: Record<string, number> = Object.fromEntries(
    optionIds.map((id) => [id, 0]),
  );
  for (const option of Object.values(vote.ballots))
    counts[option] = (counts[option] ?? 0) + 1;
  return { counts, total: Object.keys(vote.ballots).length };
}

/** Un voto emitido sin conexión solo vale si la ronda sigue siendo la misma al reconectar. */
export interface QueuedVote {
  activity: string;
  round: number;
  option: string;
}
export const queueKey = (vote: { activity: string; round: number }) =>
  `${vote.activity}:${vote.round}`;
export function resolveQueued(
  queued: QueuedVote,
  vote: VoteState,
): 'send' | 'lost' {
  return vote.open &&
    vote.activity === queued.activity &&
    vote.round === queued.round
    ? 'send'
    : 'lost';
}
