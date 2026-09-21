import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Menu,
  X,
  RotateCcw,
  Printer,
} from 'lucide-react';
import * as blocks from '@aula/pedagogical-ui';
import {
  GraficoDosCondiciones,
  GraficoSistema,
  GraficoRectas,
} from '@aula/interactives';
import { catalog, activities, type LoadedLesson } from './catalog';
import { initialState, reducer } from '../presentation/state';
import { mascotUrl } from './mascot-assets';
import { mascotGallery } from './gallery';

const MascotGallery = lazy(async () => {
  const gallery = await import('./MascotGallery');
  return { default: gallery.MascotGallery };
});

const components = {
  Definicion: blocks.Definicion,
  Objetivo: blocks.Objetivo,
  Comprobacion: blocks.Comprobacion,
  Tarjeta: blocks.Tarjeta,
  Paneles: blocks.Paneles,
  Etiquetas: blocks.Etiquetas,
  Composicion: blocks.Composicion,
  Propiedad: blocks.Propiedad,
  Teorema: blocks.Teorema,
  EjemploResuelto: blocks.EjemploResuelto,
  PracticaGuiada: blocks.PracticaGuiada,
  ErrorTipico: blocks.ErrorTipico,
  PracticaIndividual: blocks.PracticaIndividual,
  Cierre: blocks.Cierre,
  Ticket: blocks.Ticket,
  Registro: blocks.Registro,
  Etiqueta: blocks.Etiqueta,
  Asociado: blocks.Asociado,
  Columnas: blocks.Columnas,
  Paso: blocks.Paso,
  Formula: blocks.Formula,
  PreguntaPAES: blocks.PreguntaPAES,
  GraficoSistema,
  GraficoDosCondiciones,
  GraficoRectas,
  MascotaProfePina: blocks.MascotaProfePina,
};
const phaseNames: Record<string, string> = {
  inicio: 'Inicio',
  activacion: 'Activación',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
};
function getRoute() {
  return new URLSearchParams(window.location.hash.slice(1));
}
function Frame({
  lesson,
  index,
  children,
}: {
  lesson: LoadedLesson;
  index: number;
  children: ReactNode;
}) {
  const slide = lesson.slides[index];
  if (!slide) return null;
  return (
    <article className={`slide layout-${slide.layout}`} data-slide={slide.id}>
      <header>
        <span className="brand">
          p<span className="brand-dot">.</span> <span>PROFE PIÑA</span>
        </span>
        <span className="subject">
          PAES {lesson.meta.subject.toUpperCase()} <span>•</span>{' '}
          {lesson.meta.axis}
        </span>
      </header>
      <div className="slide-body">
        <div className="eyebrow">
          <span>{phaseNames[slide.phase]}</span>
          <span className="rule" />
          <span>{String(index + 1).padStart(2, '0')}</span>
        </div>
        <h1>{slide.title}</h1>
        <div className="slide-content">{children}</div>
      </div>
      <footer>
        <span>{lesson.meta.title}</span>
        <span>
          {String(index + 1).padStart(2, '0')} / {lesson.slides.length}
        </span>
      </footer>
    </article>
  );
}
export function App() {
  const [route, setRoute] = useState(getRoute);
  useEffect(() => {
    const read = () => setRoute(getRoute());
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const lesson =
    catalog.find((l) => l.meta.id === route.get('clase')) ?? catalog[0];
  if (!lesson) return <p>No hay clases publicadas.</p>;
  if (route.get('galeria') === 'mascotas')
    return (
      <Suspense fallback={<p role="status">Cargando galería…</p>}>
        <MascotGallery returnHref={`#clase=${lesson.meta.id}`} />
      </Suspense>
    );
  return <Player key={lesson.meta.id} lesson={lesson} route={route} />;
}
function Player({
  lesson,
  route,
}: {
  lesson: LoadedLesson;
  route: URLSearchParams;
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    index: Math.max(
      0,
      lesson.slides.findIndex((s) => s.id === route.get('slide')),
    ),
  });
  const [menu, setMenu] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const [fullscreen, setFullscreen] = useState(
    Boolean(document.fullscreenElement),
  );
  const [message, setMessage] = useState('');
  const [scale, setScale] = useState(1);
  const printing = route.get('modo') === 'pdf';
  const slide = lesson.slides[state.index] ?? lesson.slides[0];
  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setMessage(
        'No fue posible abrir pantalla completa. Usa el menú del navegador.',
      );
    }
  }, []);
  useEffect(() => {
    if (!menu) return;
    const previous = document.activeElement;
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items =
        drawerRef.current?.querySelectorAll<HTMLElement>('button,a[href]');
      const first = items?.[0];
      const last = items?.[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [menu]);
  useEffect(() => {
    const resize = () =>
      setScale(
        Math.min(
          (window.innerWidth - 32) / 1600,
          (window.innerHeight - 104) / 900,
        ),
      );
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const listener = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);
  useEffect(() => {
    const index = lesson.slides.findIndex((s) => s.id === route.get('slide'));
    if (index >= 0) dispatch({ type: 'jump', index });
  }, [route, lesson]);
  useEffect(() => {
    if (!slide || printing) return;
    const next = new URLSearchParams({
      clase: lesson.meta.id,
      slide: slide.id,
    });
    history.replaceState(null, '', `#${next}`);
  }, [slide, lesson, printing]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (printing) return;
      if (e.key === 'Escape') {
        setMenu(false);
        return;
      }
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input,textarea,select,[contenteditable="true"]')
      )
        return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('button,a') &&
        [' ', 'Enter'].includes(e.key)
      )
        return;
      if (menu) return;
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) {
        e.preventDefault();
        dispatch({ type: 'next', slides: lesson.slides });
      }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        dispatch({ type: 'previous', slides: lesson.slides });
      }
      if (e.key.toLowerCase() === 'm') setMenu(true);
      if (e.key.toLowerCase() === 'f') void toggleFullscreen();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [lesson, menu, printing, toggleFullscreen]);
  if (!slide) return null;
  if (printing)
    return (
      <main className="print-deck">
        {lesson.slides.map((s, i) => (
          <blocks.SlideContext.Provider
            key={s.id}
            value={{
              step: s.steps,
              print: true,
              values: {},
              setValue: () => {},
              activities,
              mascotUrl,
              templates: mascotGallery.templates,
            }}
          >
            <Frame lesson={lesson} index={i}>
              <s.Content components={components} />
            </Frame>
          </blocks.SlideContext.Provider>
        ))}
      </main>
    );
  const step = state.steps[slide.id] ?? 0;
  return (
    <main className="player">
      <div
        className="stage"
        style={{ width: 1600 * scale, height: 900 * scale }}
      >
        <div
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          <blocks.SlideContext.Provider
            value={{
              step,
              print: false,
              values: state.values[slide.id] ?? {},
              setValue: (key, value) =>
                dispatch({ type: 'value', slide: slide.id, key, value }),
              activities,
              mascotUrl,
              templates: mascotGallery.templates,
            }}
          >
            <Frame lesson={lesson} index={state.index}>
              <slide.Content
                key={`${slide.id}-${state.generation}`}
                components={components}
              />
            </Frame>
          </blocks.SlideContext.Provider>
        </div>
      </div>
      <nav className="toolbar" aria-label="Controles de presentación">
        <button onClick={() => setMenu(true)} aria-label="Índice de clases">
          <Menu size={21} />
        </button>
        <div className="toolbar-divider" />
        <button
          aria-label="Retroceder"
          onClick={() => dispatch({ type: 'previous', slides: lesson.slides })}
          disabled={state.index === 0 && step === 0}
        >
          <ChevronLeft />
        </button>
        <span className="position">
          {state.index + 1} <span>/ {lesson.slides.length}</span>
        </span>
        <button
          className="next"
          aria-label={
            step < slide.steps
              ? 'Revelar siguiente paso'
              : 'Avanzar diapositiva'
          }
          onClick={() => dispatch({ type: 'next', slides: lesson.slides })}
          disabled={
            state.index === lesson.slides.length - 1 && step === slide.steps
          }
        >
          <ChevronRight />
        </button>
        <span className="step-label">
          {slide.steps
            ? `Paso ${step} de ${slide.steps}`
            : 'Explora y conversa'}
        </span>
        <div className="toolbar-divider" />
        <button
          aria-label="Reiniciar clase"
          onClick={() => dispatch({ type: 'reset' })}
        >
          <RotateCcw size={20} />
        </button>
        <a
          aria-label="Vista PDF con respuestas"
          href={`#clase=${lesson.meta.id}&modo=pdf`}
          target="_blank"
          rel="noreferrer"
        >
          <Printer size={20} />
        </a>
        <button
          aria-label={
            fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'
          }
          onClick={() => void toggleFullscreen()}
        >
          <Maximize size={20} />
        </button>
      </nav>
      <div
        className="progress"
        style={{
          width: `${((state.index + 1) / lesson.slides.length) * 100}%`,
        }}
      />
      {message && <p role="status">{message}</p>}
      {menu && (
        <div className="drawer-backdrop">
          <aside
            ref={drawerRef}
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Índice de clases"
          >
            <button
              autoFocus
              className="close"
              onClick={() => setMenu(false)}
              aria-label="Cerrar índice"
            >
              <X />
            </button>
            <p className="eyebrow">Tu biblioteca</p>
            <h2>Clases para pensar.</h2>
            {catalog.map((item) => (
              <a
                className="lesson-link"
                key={item.meta.id}
                href={`#clase=${item.meta.id}`}
                onClick={() => setMenu(false)}
              >
                {item.meta.title}
              </a>
            ))}
            <a
              className="gallery-link"
              href={`#clase=${lesson.meta.id}&galeria=mascotas`}
              onClick={() => setMenu(false)}
            >
              Galería de plantillas de mascota
            </a>
            <p className="drawer-caption">
              {lesson.meta.duration} MIN · {lesson.meta.subject.toUpperCase()}
            </p>
            <ol>
              {lesson.slides.map((s, i) => (
                <li key={s.id}>
                  <button
                    className={i === state.index ? 'active' : ''}
                    onClick={() => {
                      dispatch({ type: 'jump', index: i });
                      setMenu(false);
                    }}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </button>
                </li>
              ))}
            </ol>
            <p className="help">← → Pasos · M Índice · F Pantalla completa</p>
          </aside>
        </div>
      )}
    </main>
  );
}
