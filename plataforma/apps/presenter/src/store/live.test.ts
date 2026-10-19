import { describe, expect, it } from 'vitest';
import { initialLive, liveReducer, resolveQueued, voteCounts } from './live';

const slides = [
  { id: 'a', steps: 1 },
  { id: 'b', steps: 0 },
];
const opened = liveReducer(initialLive('clase'), {
  type: 'openVote',
  activity: 'entradas',
});

describe('votación anónima', () => {
  it('abrir pone los conteos en cero y suma una ronda', () => {
    expect(opened.vote).toMatchObject({ open: true, round: 1, ballots: {} });
    const again = liveReducer(
      liveReducer(opened, { type: 'castVote', device: 'd1', option: 'B', round: 1 }),
      { type: 'openVote', activity: 'entradas' },
    );
    expect(again.vote.round).toBe(2);
    expect(voteCounts(again.vote, ['A', 'B']).total).toBe(0);
  });
  it('un dispositivo que cambia de alternativa reemplaza su respuesta', () => {
    let state = liveReducer(opened, { type: 'castVote', device: 'd1', option: 'A', round: 1 });
    state = liveReducer(state, { type: 'castVote', device: 'd2', option: 'B', round: 1 });
    state = liveReducer(state, { type: 'castVote', device: 'd1', option: 'B', round: 1 });
    expect(voteCounts(state.vote, ['A', 'B', 'C'])).toEqual({
      counts: { A: 0, B: 2, C: 0 },
      total: 2,
    });
    expect(
      liveReducer(state, { type: 'castVote', device: 'd1', option: 'B', round: 1 }),
    ).toBe(state);
  });
  it('con la votación cerrada o de otra ronda no se cuenta', () => {
    const closed = liveReducer(opened, { type: 'closeVote' });
    expect(closed.vote).toMatchObject({ open: false, closed: true });
    expect(
      liveReducer(closed, { type: 'castVote', device: 'd1', option: 'A', round: 1 }),
    ).toBe(closed);
    expect(
      liveReducer(opened, { type: 'castVote', device: 'd1', option: 'A', round: 0 }),
    ).toBe(opened);
  });
  it('reabrir conserva los conteos', () => {
    const voted = liveReducer(opened, { type: 'castVote', device: 'd1', option: 'C', round: 1 });
    const reopened = liveReducer(liveReducer(voted, { type: 'closeVote' }), {
      type: 'reopenVote',
    });
    expect(reopened.vote.open).toBe(true);
    expect(voteCounts(reopened.vote, ['C']).counts.C).toBe(1);
  });
  it('la cola sin conexión solo se envía en la misma ronda abierta', () => {
    const queued = { activity: 'entradas', round: 1, option: 'B' };
    expect(resolveQueued(queued, opened.vote)).toBe('send');
    const next = liveReducer(opened, { type: 'openVote', activity: 'entradas' });
    expect(resolveQueued(queued, next.vote)).toBe('lost');
    expect(resolveQueued(queued, liveReducer(opened, { type: 'closeVote' }).vote)).toBe(
      'lost',
    );
  });
});

describe('proyección compartida', () => {
  it('cambiar de clase reinicia pasos y votación', () => {
    let state = liveReducer(opened, { type: 'next', slides });
    expect(state.steps).toEqual({ a: 1 });
    state = liveReducer(state, { type: 'load', lessonId: 'otra', index: 0 });
    expect(state).toMatchObject({ lessonId: 'otra', steps: {}, index: 0 });
    expect(state.vote.open).toBe(false);
  });
  it('reiniciar vuelve a la primera lámina y cierra la votación', () => {
    const moved = liveReducer(liveReducer(opened, { type: 'jump', index: 1 }), {
      type: 'reset',
    });
    expect(moved).toMatchObject({ index: 0, lessonId: 'clase' });
    expect(moved.vote.activity).toBeNull();
    expect(moved.generation).toBe(1);
  });
});
