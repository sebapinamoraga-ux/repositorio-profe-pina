import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Maximize,
  Menu,
  MessageSquarePlus,
  Minimize,
  Printer,
  RotateCcw,
  Timer,
  Vote,
  X,
} from 'lucide-react';
import { activities } from '../app/catalog';
import { readRoute, useRoute, useViewportWidth } from '../app/route';
import { FitSlide } from '../slides/FitSlide';
import { SlideView } from '../slides/SlideView';
import { useAula } from '../store/AulaProvider';
import { deckFor, hasSlides, pad2 } from '../store/deck';
import { voteCounts } from '../store/live';
import type { View } from '../store/schema';
import { nowParts } from '../store/teacher';
import { Modal } from '../ui/Modal';
import { qrPath } from '../ui/qr';
import { useUi } from '../ui/UiProvider';
import { makeNote } from './notes';
import { tramoAt, usePace } from './pace';

const PACE_VISIBLE = 'profe-pina-ritmo-ver';

function readPaceVisible() {
  try {
    return localStorage.getItem(PACE_VISIBLE) !== '0';
  } catch {
    return true;
  }
}

export function studentJoinUrl(code: string) {
  return `${window.location.origin}${window.location.pathname}#rol=estudiante&codigo=${code}`;
}

function Qr({ text }: { text: string }) {
  const { d, size } = qrPath(text);
  return (
    <svg
      className="qr"
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Código QR para responder desde el celular"
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#fffdfa" />
      <path d={d} fill="#17223b" />
    </svg>
  );
}

export function Presenter({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch, live, send, setPresenting } = useAula();
  const { route, replace } = useRoute();
  const ui = useUi();
  const width = useViewportWidth();
  const wide = width >= 750;
  const rootRef = useRef<HTMLElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Un enlace con #clase=… abre esa clase si existe en la biblioteca o en el repositorio.
  const urlLesson = route.get('clase');
  const lessonId =
    urlLesson && hasSlides(data, urlLesson) ? urlLesson : data.lessonId;
  useEffect(() => {
    if (lessonId !== data.lessonId) dispatch({ type: 'openLesson', id: lessonId });
  }, [lessonId, data.lessonId, dispatch]);

  const deck = deckFor(data, lessonId);
  const { meta, slides } = deck;
  const slidesRef = useRef(slides);
  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    setPresenting(true);
    return () => setPresenting(false);
  }, [setPresenting]);

  // Al entrar: la lámina del enlace, o donde quedó la proyección de esta clase.
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  // La lámina del enlace se lee una vez: después la URL refleja la proyección.
  const [initialSlide] = useState(() => readRoute().get('slide'));
  useEffect(() => {
    const fromUrl = slidesRef.current.findIndex(
      (slide) => slide.id === initialSlide,
    );
    const current = liveRef.current;
    send({
      type: 'load',
      lessonId,
      index:
        fromUrl >= 0
          ? fromUrl
          : current.lessonId === lessonId
            ? current.index
            : 0,
    });
  }, [lessonId, send, initialSlide]);

  const sameLesson = live.lessonId === lessonId;
  const index = sameLesson
    ? Math.min(live.index, Math.max(0, slides.length - 1))
    : 0;
  const slide = slides[index];
  const step = slide && sameLesson ? (live.steps[slide.id] ?? 0) : 0;

  useEffect(() => {
    if (slide && sameLesson) replace({ clase: lessonId, slide: slide.id });
  }, [lessonId, slide, sameLesson, replace]);

  const [menu, setMenu] = useState(false);
  const [votePanel, setVotePanel] = useState(false);
  const [note, setNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteScope, setNoteScope] = useState<'slide' | 'lesson'>('slide');
  const [paceOn, setPaceOn] = useState(readPaceVisible);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [message, setMessage] = useState('');

  const session = data.activeSession;
  const tramo = slide ? tramoAt(meta, slides, index) : null;
  const pace = usePace(
    [lessonId, live.generation, session ? `${session.date} ${session.start}` : 'libre'].join('|'),
    tramo?.label ?? null,
    true,
  );

  const next = useCallback(() => send({ type: 'next', slides: slidesRef.current }), [send]);
  const previous = useCallback(
    () => send({ type: 'previous', slides: slidesRef.current }),
    [send],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (rootRef.current ?? document.documentElement).requestFullscreen();
    } catch {
      setMessage('No fue posible abrir pantalla completa. Usa el menú del navegador.');
      setTimeout(() => setMessage(''), 3500);
    }
  }, []);
  useEffect(() => {
    const listener = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);

  const togglePace = useCallback(() => {
    setPaceOn((value) => {
      try {
        localStorage.setItem(PACE_VISIBLE, value ? '0' : '1');
      } catch {
        /* Preferencia solo en memoria. */
      }
      ui.say(value ? 'Ritmo de la clase oculto' : 'Ritmo de la clase visible');
      return !value;
    });
  }, [ui]);

  // Controles que se ocultan solos tras unos segundos sin actividad.
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = menu || votePanel || note;
  const busyRef = useRef(busy);
  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);
  const wake = useCallback(() => {
    setIdle(false);
    clearTimeout(idleTimer.current);
    const arm = () => {
      idleTimer.current = setTimeout(() => {
        const bar = rootRef.current?.querySelector('.presenter-bar');
        if (busyRef.current || bar?.matches(':hover, :focus-within')) arm();
        else setIdle(true);
      }, 3000);
    };
    arm();
  }, []);
  useEffect(() => {
    wake();
    const node = rootRef.current;
    node?.addEventListener('mousemove', wake);
    node?.addEventListener('pointerdown', wake);
    return () => {
      clearTimeout(idleTimer.current);
      node?.removeEventListener('mousemove', wake);
      node?.removeEventListener('pointerdown', wake);
    };
  }, [wake]);

  useEffect(() => {
    if (note) noteRef.current?.focus();
  }, [note]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      wake();
      if (event.key === 'Escape') {
        setNote(false);
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (
        target instanceof HTMLElement &&
        target.closest('button,a') &&
        [' ', 'Enter'].includes(event.key)
      )
        return;
      if (menu) return;
      if (['ArrowRight', ' ', 'PageDown'].includes(event.key)) {
        event.preventDefault();
        next();
      }
      if (['ArrowLeft', 'PageUp'].includes(event.key)) {
        event.preventDefault();
        previous();
      }
      if (note || event.ctrlKey || event.metaKey || event.altKey) return;
      const letter = event.key.toLowerCase();
      if (letter === 'n') {
        event.preventDefault();
        setNote(true);
      }
      if (letter === 'm') setMenu(true);
      if (letter === 'f') void toggleFullscreen();
      if (letter === 'r' && tramo) togglePace();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [menu, note, next, previous, toggleFullscreen, togglePace, tramo, wake]);

  if (!slide)
    return (
      <main className="presenter presenter-empty">
        <div className="empty-card">
          <h1>Esta clase aún no tiene láminas</h1>
          <p>Prepárala desde la biblioteca o ábrela en el editor.</p>
          <div className="row">
            <button type="button" className="btn btn-paper" onClick={() => onNavigate('biblioteca')}>
              Ir a la biblioteca
            </button>
            <button type="button" className="btn btn-accent" onClick={() => onNavigate('editor')}>
              Abrir en editor
            </button>
          </div>
        </div>
      </main>
    );

  const atStart = index === 0 && step === 0;
  const atEnd = index === slides.length - 1 && step === slide.steps;
  const slideNotes = data.notes.filter(
    (n) => n.lessonId === lessonId && n.slideId === slide.id && n.status === 'pendiente',
  ).length;

  const activityId = slide.activities[0];
  const activity = activityId ? activities[activityId] : undefined;
  const vote = live.vote;
  const voteMine = Boolean(activityId) && vote.activity === activityId;
  const optionIds = activity?.options?.map((o) => o.id) ?? [];
  const tally = voteCounts(vote, optionIds);
  const correct = activity?.options?.find((o) => o.correct)?.id ?? null;
  const course = session ? data.courses.find((c) => c.id === session.courseId) : undefined;
  const saved = Boolean(session?.votes.some((v) => v.activity === activityId));

  const closeVote = () => {
    send({ type: 'closeVote' });
    if (session && activityId)
      dispatch({
        type: 'saveVoteSummary',
        summary: {
          activity: activityId,
          total: voteMine ? tally.total : 0,
          counts: voteMine ? tally.counts : {},
          correct,
          at: nowParts().time,
        },
      });
  };
  const restartVote = async () => {
    if (!activityId) return;
    if (
      !tally.total ||
      (await ui.confirm({
        title: `¿Borrar las ${tally.total} respuestas?`,
        body: 'La votación se abrirá de nuevo en cero. No se puede deshacer.',
        ok: 'Borrar y abrir',
        danger: true,
      }))
    )
      send({ type: 'openVote', activity: activityId });
  };
  const saveNote = () => {
    const text = noteText.trim();
    if (!text) return;
    const created = makeNote(data, {
      text,
      lessonId,
      slideId: noteScope === 'slide' ? slide.id : null,
      slideTitle: slide.title,
      source: 'presentador',
    });
    dispatch({ type: 'addNote', note: created });
    setNote(false);
    setNoteText('');
    ui.toast('Comentario guardado. Lo verás en el editor.', () =>
      dispatch({ type: 'removeNote', id: created.id }),
    );
  };
  const reset = () => {
    const before = live;
    send({ type: 'reset' });
    pace.restart();
    ui.toast('Clase reiniciada desde la primera lámina', () =>
      send({ type: 'replaceLive', live: before }),
    );
  };
  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    onNavigate('hoy');
  };

  const paceRead = pace.read(tramo?.label ?? null);
  const minutes = (m: number) => Math.floor(m);
  const over = Boolean(tramo?.minutes && paceRead.tramoMin > tramo.minutes);
  const extra = over && tramo ? Math.ceil(paceRead.tramoMin - tramo.minutes) : 0;
  const left = Math.max(0, Math.round(meta.duration - paceRead.totalMin));
  const paceWide = width >= 1320;
  const slideTitleShort = slide.title.length > 34 ? `${slide.title.slice(0, 33)}…` : slide.title;

  return (
    <main
      ref={rootRef}
      className={`presenter ${idle ? 'is-idle' : ''}`}
      aria-label="Presentador"
    >
      <div className="presenter-stage">
        <FitSlide>
          <SlideView
            meta={meta}
            slides={slides}
            index={index}
            step={step}
            values={live.values[slide.id] ?? {}}
            setValue={(key, value) => send({ type: 'value', slide: slide.id, key, value })}
            contentKey={`${slide.id}-${live.generation}`}
          />
        </FitSlide>
      </div>
      <nav className="presenter-bar toolbar" aria-label="Controles de presentación">
        <button type="button" className="bar-btn" aria-label="Salir de la presentación" onClick={exit}>
          <LogOut size={20} aria-hidden="true" />
          {wide && <span>Salir</span>}
        </button>
        <span className="bar-divider" />
        <button type="button" className="bar-btn" aria-label="Índice de clases" onClick={() => setMenu(true)}>
          <Menu size={21} aria-hidden="true" />
        </button>
        <span className="bar-divider" />
        <button type="button" className="bar-btn" aria-label="Retroceder" disabled={atStart} onClick={previous}>
          <ChevronLeft aria-hidden="true" />
        </button>
        <span className="position">
          {index + 1} <span>/ {slides.length}</span>
        </span>
        <button
          type="button"
          className="bar-btn bar-next"
          aria-label={step < slide.steps ? 'Revelar siguiente paso' : 'Avanzar diapositiva'}
          disabled={atEnd}
          onClick={next}
        >
          <ChevronRight aria-hidden="true" />
        </button>
        {wide && (
          <span className="step-label">
            {slide.steps ? `Paso ${step} de ${slide.steps}` : 'Explora y conversa'}
          </span>
        )}
        <span className="bar-divider" />
        {activity && (
          <button
            type="button"
            className="bar-btn bar-vote"
            aria-label="Votación anónima"
            aria-pressed={votePanel}
            onClick={() => setVotePanel((open) => !open)}
          >
            <Vote size={20} aria-hidden="true" />
            {wide && <span>Votación</span>}
          </button>
        )}
        {tramo && (
          <button
            type="button"
            className="bar-btn"
            aria-label="Ritmo de la clase"
            aria-pressed={paceOn}
            title="Ritmo de la clase (R)"
            onClick={togglePace}
          >
            <Timer size={20} aria-hidden="true" />
            {paceOn && !paceWide && wide && (
              <span className={`pace-inline ${over ? 'is-over' : ''}`}>
                {tramo.minutes
                  ? `${minutes(paceRead.tramoMin)}/${tramo.minutes} min`
                  : `${minutes(paceRead.tramoMin)} min`}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          className="bar-btn"
          aria-label="Anotar comentario para mejorar la clase"
          title="Anotar comentario (N)"
          aria-pressed={note}
          onClick={() => setNote((open) => !open)}
        >
          <MessageSquarePlus size={20} aria-hidden="true" />
          {wide && <span>Anotar</span>}
          {slideNotes > 0 && (
            <span
              className="bar-badge"
              aria-label={
                slideNotes === 1
                  ? '1 comentario pendiente en esta lámina'
                  : `${slideNotes} comentarios pendientes en esta lámina`
              }
            >
              {slideNotes}
            </span>
          )}
        </button>
        <button type="button" className="bar-btn" aria-label="Reiniciar clase" onClick={reset}>
          <RotateCcw size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="bar-btn"
          aria-label="Vista PDF con respuestas"
          onClick={() => onNavigate('pdf')}
        >
          <Printer size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="bar-btn"
          aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          onClick={() => void toggleFullscreen()}
        >
          {fullscreen ? <Minimize size={20} aria-hidden="true" /> : <Maximize size={20} aria-hidden="true" />}
        </button>
      </nav>
      <div className="progress" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
      {message && (
        <p role="status" className="presenter-message">
          {message}
        </p>
      )}
      {tramo && paceOn && paceWide && (
        <div
          role="group"
          aria-label="Ritmo de la clase"
          className={`pace-card ${over ? 'is-over' : ''} ${width >= 1500 ? 'is-wide' : ''}`}
        >
          <div className="pace-head">
            <b>{tramo.label}</b>
            <span>
              {tramo.minutes
                ? `${minutes(paceRead.tramoMin)} de ${tramo.minutes} min`
                : `${minutes(paceRead.tramoMin)} min`}
            </span>
          </div>
          <div aria-hidden="true" className="pace-track">
            <div
              style={{
                width: tramo.minutes
                  ? `${Math.min(100, (paceRead.tramoMin / tramo.minutes) * 100)}%`
                  : '100%',
              }}
            />
          </div>
          <span className="pace-sub">
            {over
              ? `+${extra} min · quedan ${left} de ${meta.duration}`
              : `A tiempo · clase ${minutes(paceRead.totalMin)} de ${meta.duration} min`}
          </span>
        </div>
      )}
      {note && (
        <div role="dialog" aria-label="Comentario para mejorar la clase" className="note-pop">
          <div className="note-pop-head">
            <b>Comentario para mejorar la clase</b>
            <button type="button" className="icon-btn" aria-label="Cerrar" onClick={() => setNote(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div role="radiogroup" aria-label="Sobre qué es el comentario" className="pill-group">
            <button
              type="button"
              role="radio"
              aria-checked={noteScope === 'slide'}
              className="pill"
              onClick={() => setNoteScope('slide')}
            >
              Lámina {pad2(index + 1)} · {slideTitleShort}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={noteScope === 'lesson'}
              className="pill"
              onClick={() => setNoteScope('lesson')}
            >
              Toda la clase
            </button>
          </div>
          <textarea
            ref={noteRef}
            rows={3}
            aria-label="Comentario"
            value={noteText}
            placeholder="Qué cambiarías: una explicación que no se entendió, un ejemplo que faltó, un tiempo que no alcanzó…"
            onChange={(event) => setNoteText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                saveNote();
              }
            }}
          />
          <div className="note-pop-actions">
            <span className="muted small">Aparecerá en el editor como pendiente.</span>
            <button type="button" className="btn" onClick={() => setNote(false)}>
              Cancelar
            </button>
            <button type="button" className="btn btn-ink" disabled={!noteText.trim()} onClick={saveNote}>
              Guardar
            </button>
          </div>
        </div>
      )}
      {votePanel && activity && activityId && (
        <aside aria-label="Votación anónima" className={`vote-panel ${wide ? '' : 'is-narrow'}`}>
          <div className="vote-head">
            <div>
              <p className="kicker">Participación anónima</p>
              <h2>{slide.title}</h2>
            </div>
            <button type="button" className="icon-btn" aria-label="Cerrar panel" onClick={() => setVotePanel(false)}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          {!voteMine ? (
            <>
              <p className="muted">
                Cada estudiante responde desde su celular sin identificarse. El conteo
                aparece aquí; la respuesta correcta se revela con el paso de la lámina.
              </p>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => send({ type: 'openVote', activity: activityId })}
              >
                Abrir votación
              </button>
            </>
          ) : (
            <>
              <div className="vote-join">
                <Qr text={studentJoinUrl(live.joinCode)} />
                <div>
                  <p className="muted small">Escanea o entra como estudiante con el código</p>
                  <p className="join-code">{live.joinCode}</p>
                  <p className="muted small">
                    {tally.total} respuestas · {vote.open ? 'votación abierta' : 'votación cerrada'}
                  </p>
                </div>
              </div>
              <div className="vote-bars">
                {activity.options?.map((option) => {
                  const count = tally.counts[option.id] ?? 0;
                  const pct = tally.total ? Math.round((count / tally.total) * 100) : 0;
                  const good = step >= 1 && option.correct;
                  return (
                    <div key={option.id} className="vote-row">
                      <b>{option.id}</b>
                      <div className={`vote-bar ${good ? 'is-correct' : ''}`}>
                        <div style={{ width: `${pct}%` }} />
                        <span>
                          {good && (
                            <>
                              <CheckCircle2 size={16} aria-hidden="true" />
                              <b>Correcta</b>
                            </>
                          )}
                          <span className="ellipsis">{option.text}</span>
                        </span>
                      </div>
                      <span className="vote-count">
                        {count} · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="row">
                {vote.open ? (
                  <button type="button" className="btn btn-ink" onClick={closeVote}>
                    Cerrar votación
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-ink" onClick={() => send({ type: 'reopenVote' })}>
                      Reabrir
                    </button>
                    <button type="button" className="btn" onClick={() => void restartVote()}>
                      Empezar de cero
                    </button>
                  </>
                )}
              </div>
              <p className="muted small">
                {vote.open
                  ? 'Una respuesta por dispositivo; quien cambia de alternativa reemplaza la anterior. En esta etapa responden las pestañas de este navegador, para ensayar.'
                  : saved
                    ? `Resumen guardado en la sesión de ${course?.nombre ?? 'la clase'}. Reabrir conserva las respuestas; empezar de cero las borra.`
                    : 'Sin clase iniciada: el resumen no se guarda. Inicia la clase desde Cursos para registrarlo.'}
              </p>
            </>
          )}
        </aside>
      )}
      {menu && (
        <Modal label="Índice de clases" onClose={() => setMenu(false)} placement="drawer" className="index-drawer">
          <button type="button" className="icon-btn drawer-close" aria-label="Cerrar índice" onClick={() => setMenu(false)}>
            <X size={22} aria-hidden="true" />
          </button>
          <p className="kicker-rule">Tu biblioteca</p>
          <h2 className="drawer-title">Clases para pensar.</h2>
          <button type="button" className="drawer-lesson" onClick={() => onNavigate('biblioteca')}>
            {meta.title}
            <span>Cambiar de clase en la biblioteca</span>
          </button>
          <button type="button" className="drawer-gallery" onClick={() => onNavigate('galeria')}>
            Galería de plantillas de mascota
          </button>
          <p className="drawer-caption">
            {meta.duration} MIN · {meta.subject.toUpperCase()}
            {course ? ` · ${course.nombre.toUpperCase()}` : ''}
          </p>
          <ol className="slide-index">
            {slides.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={i === index ? 'active' : ''}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => {
                    send({ type: 'jump', index: i });
                    setMenu(false);
                  }}
                >
                  <span>{pad2(i + 1)}</span>
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
          <p className="help">← → Pasos · M Índice · F Pantalla completa · N Anotar · R Ritmo</p>
        </Modal>
      )}
    </main>
  );
}
