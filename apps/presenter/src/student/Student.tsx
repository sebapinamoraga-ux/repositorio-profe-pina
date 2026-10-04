import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import katex from 'katex';
import { ArrowLeft, List, Vote, WifiOff, X } from 'lucide-react';
import * as blocks from '@aula/pedagogical-ui';
import { katexOptions } from '@aula/content-model';
import { activities, catalog } from '../app/catalog';
import { mascotGallery } from '../app/gallery';
import { mascotUrl } from '../app/mascot-assets';
import { readRoute, useOnline } from '../app/route';
import { useAula } from '../store/AulaProvider';
import { pad2, PHASE_NAMES, repoDeck } from '../store/deck';
import { queueKey, resolveQueued, type QueuedVote } from '../store/live';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';
import { ReadContext, readComponents } from './read-components';
import { useRepaso, type StudentTheme } from './repaso';

interface SlideInfo {
  mascot: { pose: number; nivel: string; alt: string } | null;
  firstStep: number;
  onlySteps: boolean;
  formula: string | null;
}

/** Lo que el lienzo no necesita y el celular sí: mascota junto al título y enunciado para recordar. */
function slideInfo(text: string | undefined): SlideInfo {
  if (!text) return { mascot: null, firstStep: 1, onlySteps: false, formula: null };
  const body = text.replace(/^---[\s\S]*?\n---\n/, '');
  let mascot: SlideInfo['mascot'] = null;
  const plantilla = /<Composicion\s+plantilla="([^"]+)"/.exec(body)?.[1];
  const template = mascotGallery.templates.find((t) => t.id === plantilla);
  if (template) mascot = { pose: template.mascot.pose, nivel: template.mascot.nivel, alt: template.mascot.alt };
  const own = /<MascotaProfePina([\s\S]*?)\/>/.exec(body)?.[1];
  if (!mascot && own) {
    const pose = Number(/pose=\{(\d+)\}/.exec(own)?.[1]);
    const nivel = /nivel="([^"]+)"/.exec(own)?.[1] ?? 'pedagogica';
    const alt = /alt="([^"]*)"/.exec(own)?.[1] ?? '';
    if (pose) mascot = { pose, nivel, alt };
  }
  const steps = [...body.matchAll(/<Paso\s+n=\{(\d+)\}/g)].map((m) => Number(m[1]));
  const rest = body
    .replace(/<Paso[\s\S]*?<\/Paso>/g, '')
    .replace(/<MascotaProfePina[\s\S]*?\/>/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  return {
    mascot,
    firstStep: steps.length ? Math.min(...steps) : 1,
    onlySteps: steps.length > 0 && !rest,
    formula: /\$\$([\s\S]*?)\$\$/.exec(body)?.[1]?.trim() ?? null,
  };
}

const THEMES: [StudentTheme, string, string][] = [
  ['claro', 'Claro', 'Papel cálido, como en la proyección.'],
  ['oscuro', 'Oscuro', 'Fondo tinta y texto papel. Menos brillo de noche.'],
  ['contraste', 'Alto contraste', 'Texto negro, bordes gruesos y colores más oscuros.'],
];

export function Student({ onChangeRole }: { onChangeRole: () => void }) {
  const { live, send, device, presenterOnline } = useAula();
  const ui = useUi();
  const online = useOnline();
  const rootRef = useRef<HTMLDivElement>(null);
  const [route] = useState(readRoute);
  const [lessonId, setLessonId] = useState(() => {
    const wanted = route.get('clase');
    if (wanted && catalog.some((l) => l.meta.id === wanted)) return wanted;
    return catalog.some((l) => l.meta.id === live.lessonId)
      ? live.lessonId
      : (catalog[0]?.meta.id ?? '');
  });
  const deck = useMemo(() => repoDeck(lessonId), [lessonId]);
  const slides = useMemo(() => deck?.slides ?? [], [deck]);
  const repaso = useRepaso(lessonId);
  const { progress } = repaso;
  const index = Math.min(progress.index, Math.max(0, slides.length - 1));
  const slide = slides[index];

  const infos = useMemo(
    () =>
      (catalog.find((lesson) => lesson.meta.id === lessonId)?.slides ?? []).map(
        ({ text }) => slideInfo(text),
      ),
    [lessonId],
  );
  const info = infos[index];

  const initialCode = route.get('codigo') ?? '';
  const [mode, setMode] = useState<'read' | 'resume' | 'summary' | 'vote'>(() =>
    initialCode
      ? 'vote'
      : progress.index > 0 && Object.keys(progress.seen).length > 1
        ? 'resume'
        : 'read',
  );
  const [sheet, setSheet] = useState<'index' | 'look' | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});

  // Votación desde el celular.
  const [code, setCode] = useState(initialCode.replace(/\D/g, '').slice(0, 4));
  const [codeError, setCodeError] = useState(false);
  const [joined, setJoined] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [mine, setMine] = useState<{ key: string; option: string } | null>(null);
  const [changing, setChanging] = useState(false);
  const [queued, setQueued] = useState<QueuedVote | null>(null);
  const [lostFor, setLostFor] = useState<string | null>(null);
  const vote = live.vote;
  const voteActivity = vote.activity ? activities[vote.activity] : undefined;
  const voteKey = vote.activity ? queueKey({ activity: vote.activity, round: vote.round }) : '';

  const scrollTop = () => {
    let node = rootRef.current?.parentElement ?? null;
    while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
    (node ?? document.scrollingElement)?.scrollTo({ top: 0 });
  };
  const goTo = useCallback(
    (i: number) => {
      const target = slides[i];
      if (!target) return;
      repaso.go(i, target.id);
      setOpen(false);
    },
    [repaso, slides],
  );
  const step = useCallback(
    (delta: number) => {
      goTo(index + delta);
      scrollTop();
    },
    [goTo, index],
  );

  // La lámina en pantalla queda marcada como vista.
  const { go: markSeen } = repaso;
  const currentId = slide?.id;
  useEffect(() => {
    if (currentId && mode === 'read') markSeen(index, currentId);
  }, [currentId, index, markSeen, mode]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (mode !== 'read' || sheet) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select'))
        return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [mode, sheet, step]);

  // Al reconectar: enviar lo guardado si sigue la misma ronda; si no, queda perdido.
  useEffect(() => {
    if (!online || !queued) return;
    const key = queueKey(queued);
    if (resolveQueued(queued, vote) === 'send') {
      send({ type: 'castVote', device, option: queued.option, round: queued.round });
      setMine({ key, option: queued.option });
    } else setLostFor(key);
    setQueued(null);
  }, [online, queued, vote, send, device]);

  if (!deck || !slide)
    return (
      <div className="student theme-claro">
        <main className="student-main">
          <h1>No hay clases publicadas</h1>
          <p>Cuando tu profe publique una clase, aparecerá aquí para repasar.</p>
          <button type="button" className="s-btn" onClick={onChangeRole}>
            Cambiar de rol
          </button>
        </main>
      </div>
    );

  const n = slides.length;
  const seenCount = slides.filter((s) => progress.seen[s.id]).length;
  const questions = slides.flatMap((s, i) =>
    s.activities.flatMap((id) => {
      const activity = activities[id];
      if (!activity) return [];
      const answer = progress.answers[id];
      const ok = Boolean(answer && activity.options?.find((o) => o.correct)?.id === answer);
      return [{ id, i, ok, answer }];
    }),
  );
  const seenText =
    seenCount === n
      ? `Viste las ${n} láminas.`
      : `Viste ${seenCount} de ${n} láminas; ${n - seenCount === 1 ? 'te falta 1' : `te faltan ${n - seenCount}`}.`;
  const questionList = questions.length > 0 && (
    <ul className="s-list">
      {questions.map((q) => (
        <li key={q.id}>
          <button
            type="button"
            className="s-row"
            onClick={() => {
              goTo(q.i);
              setMode('read');
            }}
          >
            <span>Ticket PAES · lámina {pad2(q.i + 1)}</span>
            <b className={!q.answer ? 'is-muted' : q.ok ? 'is-ok' : 'is-err'}>
              {!q.answer ? 'Sin responder' : q.ok ? '✓ Correcta' : `Respondiste ${q.answer} · reintentar`}
            </b>
          </button>
        </li>
      ))}
    </ul>
  );

  const joinedHere = joined;
  const sentHere = mine?.key === voteKey && Boolean(voteKey);
  const lost = joinedHere && !queued && lostFor === voteKey && Boolean(voteKey);
  const canVote = joinedHere && !queued && !lost && vote.open && Boolean(voteActivity) && (!sentHere || changing);
  const sendVote = () => {
    if (!pick || !vote.activity) return;
    if (!online) {
      setQueued({ activity: vote.activity, round: vote.round, option: pick });
      setPick(null);
      setChanging(false);
      return;
    }
    send({ type: 'castVote', device, option: pick, round: vote.round });
    setMine({ key: voteKey, option: pick });
    setPick(null);
    setChanging(false);
  };

  return (
    <div ref={rootRef} className={`student theme-${repaso.theme}`}>
      <header className="s-header">
        <div className="s-header-row">
          <span className="s-brand" aria-label="Profe Piña">
            p<span>.</span>
          </span>
          <span className="s-title">{deck.meta.title}</span>
          <button type="button" className="s-icon" aria-label="Índice de láminas" onClick={() => setSheet('index')}>
            <List size={18} aria-hidden="true" />
            {pad2(index + 1)}/{n}
          </button>
          <button type="button" className="s-icon s-aa" aria-label="Apariencia" onClick={() => setSheet('look')}>
            Aa
          </button>
          <button
            type="button"
            className="s-icon"
            aria-label="Responder en clase"
            onClick={() => {
              setMode('vote');
              setSheet(null);
            }}
          >
            <Vote size={20} aria-hidden="true" />
          </button>
        </div>
        <div aria-hidden="true" className="s-progress">
          <div style={{ width: `${((index + 1) / n) * 100}%` }} />
        </div>
        {!online && (
          <div role="status" className="s-offline">
            <p>
              <WifiOff size={18} aria-hidden="true" />
              <span>
                {mode === 'vote'
                  ? 'Sin conexión. Para responder en clase necesitas internet; lo que elijas se guardará y se enviará al reconectar.'
                  : 'Sin conexión. El repaso sigue funcionando y tu avance se guarda en este dispositivo.'}
              </span>
            </p>
          </div>
        )}
      </header>

      {mode === 'read' && (
        <>
          <main className="s-read">
            <p className="s-eyebrow">
              {PHASE_NAMES[slide.phase]}
              <span aria-hidden="true" />
              {pad2(index + 1)}
            </p>
            <div className="s-heading">
              <h1>{slide.title}</h1>
              {info?.mascot && (
                <img
                  src={mascotUrl(info.mascot.pose)}
                  alt={info.mascot.alt}
                  className={info.mascot.nivel === 'sutil' ? 'is-subtle' : ''}
                />
              )}
            </div>
            <div className="read-body">
              {info?.onlySteps && infos[index - 1]?.formula && (
                <section className="recall">
                  <div className="block-label">Recuerda el enunciado · lámina {pad2(index)}</div>
                  <div
                    className="read-formula"
                    dangerouslySetInnerHTML={{
                      __html: katex.renderToString(infos[index - 1]?.formula ?? '', {
                        ...katexOptions,
                        displayMode: true,
                      }),
                    }}
                  />
                </section>
              )}
              <blocks.SlideContext.Provider
                value={{
                  step: slide.steps,
                  print: false,
                  values: values[slide.id] ?? {},
                  setValue: (key, value) =>
                    setValues((current) => ({
                      ...current,
                      [slide.id]: { ...current[slide.id], [key]: value },
                    })),
                  activities,
                  mascotUrl,
                  templates: mascotGallery.templates,
                }}
              >
                <ReadContext.Provider
                  value={{
                    fold: slide.phase === 'practica' || slide.phase === 'cierre',
                    firstStep: info?.firstStep ?? 1,
                    open,
                    setOpen,
                    answers: progress.answers,
                    answer: repaso.answer,
                  }}
                >
                  {slide.body.kind === 'compiled' && (
                    <slide.body.Content key={slide.id} components={readComponents} />
                  )}
                </ReadContext.Provider>
              </blocks.SlideContext.Provider>
            </div>
          </main>
          <nav aria-label="Avanzar en el repaso" className="s-nav">
            <div>
              <button type="button" className="s-btn" disabled={index === 0} onClick={() => step(-1)}>
                Anterior
              </button>
              <button
                type="button"
                className="s-btn s-primary"
                onClick={() => {
                  if (index === n - 1) {
                    setMode('summary');
                    scrollTop();
                  } else step(1);
                }}
              >
                {index === n - 1 ? 'Fin del repaso' : 'Siguiente lámina'}
              </button>
            </div>
          </nav>
        </>
      )}

      {mode === 'resume' && (
        <main className="s-panel-main" aria-labelledby="resume-h">
          <p className="s-kicker">Tu repaso</p>
          <h1 id="resume-h">
            Vas en la lámina {pad2(index + 1)} de {n}
          </h1>
          <div
            role="progressbar"
            aria-label="Láminas vistas"
            aria-valuemin={0}
            aria-valuemax={n}
            aria-valuenow={seenCount}
            className="s-bar"
          >
            <div style={{ width: `${(seenCount / n) * 100}%` }} />
          </div>
          <p className="s-muted">{seenText}</p>
          {questionList}
          <div className="s-stack">
            <button type="button" className="s-btn s-primary s-big" onClick={() => setMode('read')}>
              Seguir en la lámina {pad2(index + 1)}
            </button>
            <button
              type="button"
              className="s-btn"
              onClick={() => {
                goTo(0);
                setMode('read');
              }}
            >
              Empezar desde el inicio
            </button>
          </div>
        </main>
      )}

      {mode === 'summary' && (
        <main className="s-panel-main" aria-labelledby="sum-h">
          <p className="s-kicker">Fin del repaso</p>
          <h1 id="sum-h">
            {seenCount === n && questions.every((q) => q.ok)
              ? 'Repasaste toda la clase'
              : 'Casi listo: revisa lo pendiente'}
          </h1>
          <p className="s-muted">{seenText}</p>
          {questions.length > 0 && <h2>Preguntas</h2>}
          {questionList}
          {seenCount < n && (
            <>
              <h2>Láminas que no viste</h2>
              <ul className="s-list">
                {slides.map((s, i) =>
                  progress.seen[s.id] ? null : (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="s-row s-row-index"
                        onClick={() => {
                          goTo(i);
                          setMode('read');
                        }}
                      >
                        <span className="s-muted">{pad2(i + 1)}</span>
                        <span>{s.title}</span>
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </>
          )}
          <div className="s-stack">
            <button type="button" className="s-btn" onClick={() => setMode('read')}>
              Volver a la última lámina
            </button>
            <button
              type="button"
              className="s-btn"
              onClick={() => {
                goTo(0);
                setMode('read');
              }}
            >
              Repasar desde el inicio
            </button>
          </div>
        </main>
      )}

      {mode === 'vote' && (
        <main className="s-panel-main">
          <button type="button" className="s-back" onClick={() => setMode('read')}>
            <ArrowLeft size={20} aria-hidden="true" />
            Volver al repaso
          </button>
          <h1>Responder en clase</h1>
          {!joinedHere && (
            <>
              <p className="s-muted">
                Escribe el código que aparece en la proyección. Tu respuesta es anónima.
              </p>
              <label className="s-field">
                Código de la sesión
                <input
                  value={code}
                  inputMode="numeric"
                  maxLength={4}
                  autoComplete="off"
                  placeholder="0000"
                  className={codeError ? 'is-error' : ''}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, '').slice(0, 4));
                    setCodeError(false);
                  }}
                />
              </label>
              {codeError && (
                <p role="alert" className="s-error">
                  Ese código no corresponde a una clase abierta.
                </p>
              )}
              <button
                type="button"
                className="s-btn s-primary s-big"
                disabled={!online}
                onClick={() => {
                  if (code === live.joinCode && presenterOnline) setJoined(true);
                  else setCodeError(true);
                }}
              >
                Entrar
              </button>
              <p className="s-muted s-small">
                En esta etapa la votación funciona entre pestañas de un mismo navegador, para
                ensayar.
              </p>
            </>
          )}
          {joinedHere && !queued && !lost && !sentHere && !(vote.open && voteActivity) && (
            <p role="status" className="s-card">
              No hay una votación abierta en este momento. Deja esta pantalla abierta:
              aparecerá cuando tu profe la inicie.
            </p>
          )}
          {canVote && voteActivity && (
            <>
              <p className="s-muted">
                {changing
                  ? 'Elige otra alternativa. Se reemplaza tu respuesta anterior; no se cuenta dos veces.'
                  : 'Elige la alternativa que coincide con tu resultado. Solo se cuenta una respuesta por dispositivo.'}
              </p>
              <div role="group" aria-label="Alternativas" className="s-options">
                {voteActivity.options?.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={pick === option.id}
                    className="s-option"
                    onClick={() => setPick(option.id)}
                  >
                    <b>{option.id}</b>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="s-btn s-ink s-big" disabled={!pick} onClick={sendVote}>
                {changing
                  ? 'Reemplazar mi respuesta'
                  : online
                    ? 'Enviar respuesta anónima'
                    : 'Guardar y enviar al reconectar'}
              </button>
              {changing && (
                <button
                  type="button"
                  className="s-btn"
                  onClick={() => {
                    setChanging(false);
                    setPick(null);
                  }}
                >
                  Mantener mi respuesta {mine?.option}
                </button>
              )}
            </>
          )}
          {joinedHere && queued && (
            <div role="status" className="s-card is-warn">
              <p>
                <b>Respuesta {queued.option} guardada en tu celular.</b> Se enviará sola cuando
                vuelva la conexión, si la votación sigue abierta.
              </p>
              <button
                type="button"
                className="s-btn s-small-btn"
                onClick={() => {
                  setPick(queued.option);
                  setQueued(null);
                }}
              >
                Cambiar alternativa
              </button>
            </div>
          )}
          {lost && (
            <p role="status" className="s-card">
              La votación se cerró antes de que llegara tu respuesta. Puedes revisar la solución
              en la lámina del ticket.
            </p>
          )}
          {joinedHere && !queued && sentHere && !changing && (
            <div role="status" className="s-card is-ok">
              <p>
                Respuesta <b>{mine?.option}</b> enviada de forma anónima. Tu profe mostrará el
                resultado al curso.
              </p>
              {vote.open ? (
                <button
                  type="button"
                  className="s-btn s-small-btn"
                  onClick={() => {
                    setChanging(true);
                    setPick(mine?.option ?? null);
                  }}
                >
                  Cambiar respuesta
                </button>
              ) : (
                <p className="s-muted s-small">La votación ya está cerrada.</p>
              )}
            </div>
          )}
        </main>
      )}

      {sheet && (
        <Modal
          label={sheet === 'look' ? 'Apariencia' : 'Láminas de la clase'}
          onClose={() => setSheet(null)}
          placement="sheet"
          className={`s-sheet theme-${repaso.theme}`}
        >
          <div className="s-sheet-head">
            <h2>{sheet === 'look' ? 'Apariencia' : 'Láminas de la clase'}</h2>
            <button type="button" className="s-icon-plain" aria-label="Cerrar" onClick={() => setSheet(null)}>
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          {sheet === 'index' ? (
            <>
              {catalog.length > 1 && (
                <label className="s-field s-lesson-pick">
                  Clase
                  <select
                    value={lessonId}
                    onChange={(event) => {
                      setLessonId(event.target.value);
                      setSheet(null);
                    }}
                  >
                    {catalog.map((lesson) => (
                      <option key={lesson.meta.id} value={lesson.meta.id}>
                        {lesson.meta.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="s-muted s-small">
                Revisaste {seenCount} de {n} láminas. Tu avance queda guardado en este
                dispositivo.
              </p>
              <ol className="s-index">
                {slides.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-current={i === index ? 'true' : undefined}
                      onClick={() => {
                        goTo(i);
                        setSheet(null);
                        setMode('read');
                        scrollTop();
                      }}
                    >
                      <span className="s-muted">{pad2(i + 1)}</span>
                      <span>{s.title}</span>
                      <span className="s-seen">{progress.seen[s.id] ? '✓ Vista' : ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="s-btn s-full"
                onClick={() => {
                  const undo = repaso.reset();
                  setSheet(null);
                  setMode('read');
                  ui.toast('Avance borrado', undo);
                }}
              >
                Borrar mi avance
              </button>
            </>
          ) : (
            <>
              <div role="radiogroup" aria-label="Tema" className="s-themes">
                {THEMES.map(([key, label, desc]) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={repaso.theme === key}
                    className="s-theme"
                    onClick={() => repaso.setTheme(key)}
                  >
                    <span aria-hidden="true" className={`s-swatch swatch-${key}`}>
                      Aa
                    </span>
                    <span>
                      <b>{label}</b>
                      <span>{desc}</span>
                    </span>
                    <span className="s-check">{repaso.theme === key ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="s-btn s-full"
                onClick={() => {
                  setSheet(null);
                  onChangeRole();
                }}
              >
                Cambiar de rol
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
