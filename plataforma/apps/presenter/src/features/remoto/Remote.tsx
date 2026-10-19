import { useState } from 'react';
import { ChevronLeft, ChevronRight, List, RotateCcw, X } from 'lucide-react';
import { useAula } from '../../store/AulaProvider';
import { useContent } from '../../content/ContentProvider';
import { deckFor, pad2, PHASE_NAMES } from '../../store/deck';
import { Brand } from '../../ui/Brand';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';
import { Button, IconButton } from '../../ui/Button';
import { Notice } from '../../ui/Layout';

/** Control remoto: envía pasos a la pestaña que proyecta. Sin proyección abierta, no hay a quién enviarlos. */
export function Remote({ onChangeRole }: { onChangeRole: () => void }) {
  const { live, send, presenterOnline } = useAula();
  const ui = useUi();
  const [index, setIndex] = useState(false);
  const content = useContent();
  const { meta, slides } = deckFor(content, live.lessonId);
  const at = Math.min(live.index, Math.max(0, slides.length - 1));
  const slide = slides[at];
  const step = slide ? (live.steps[slide.id] ?? 0) : 0;
  const online = presenterOnline && Boolean(slide);
  const atStart = at === 0 && step === 0;
  const atEnd = slide ? at === slides.length - 1 && step === slide.steps : true;
  const stepLabel = slide?.steps ? `Paso ${step} de ${slide.steps}` : 'Explora y conversa';
  const nextLabel = !online
    ? 'Sin conexión · reintentando'
    : atEnd
      ? 'Fin de la clase'
      : slide && step < slide.steps
        ? 'Revelar siguiente paso'
        : 'Avanzar diapositiva';

  return (
    <div className="phone-shell">
      <div className="phone-strip">
        <span>Celular como control remoto</span>
        <Button size="sm" onClick={onChangeRole}>
          Cambiar de rol
        </Button>
      </div>
      <main className="remote">
        <div className="remote-column">
          <header className="remote-head">
            <Brand size="sm" label="CONTROL" />
            {online ? (
              <span className="state-pill is-ok">
                <span aria-hidden="true" />
                Conectado
              </span>
            ) : (
              <span className="state-pill is-off">
                <span aria-hidden="true" />
                Sin conexión
              </span>
            )}
          </header>
          {!online && (
            <Notice role="alert" tone="error">
              <b>La proyección no recibe tus toques.</b> Abre «Presentar» en otra
              pestaña o ventana de este navegador; el control se conecta solo.
            </Notice>
          )}
          {slide && (
            <div className="remote-slide">
              <span className="kicker-rule">
                {PHASE_NAMES[slide.phase]} <span aria-hidden="true" /> {pad2(at + 1)} /{' '}
                {slides.length}
              </span>
              <h1 title={slide.title}>{slide.title}</h1>
              <p aria-live="polite" className="muted">
                {stepLabel} · lámina {pad2(at + 1)}
              </p>
              {/* Siempre presente, aunque esté vacío, para que los botones no se muevan. */}
              <div aria-hidden="true" className="step-dots">
                {Array.from({ length: slide.steps }, (_, k) => (
                  <span key={k} className={k < step ? 'is-on' : ''} />
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            className="remote-next"
            disabled={atEnd || !online}
            aria-label={nextLabel}
            onClick={() => send({ type: 'next', slides })}
          >
            <ChevronRight size={56} aria-hidden="true" />
            {nextLabel}
          </button>
          <div className="remote-row">
            <button
              type="button"
              className="remote-btn"
              disabled={atStart || !online}
              onClick={() => send({ type: 'previous', slides })}
            >
              <ChevronLeft size={22} aria-hidden="true" />
              Retroceder
            </button>
            <button
              type="button"
              className="remote-btn"
              aria-label="Índice"
              disabled={!online}
              onClick={() => setIndex(true)}
            >
              <List size={24} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="remote-btn"
              aria-label="Reiniciar clase"
              disabled={!online}
              onClick={() => {
                const before = live;
                send({ type: 'reset' });
                ui.toast('Clase reiniciada', () =>
                  send({ type: 'replaceLive', live: before }),
                );
              }}
            >
              <RotateCcw size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
        {index && (
          <Modal label="Índice" onClose={() => setIndex(false)} placement="sheet">
            <div className="sheet-head">
              <p className="caption">
                {meta.duration} MIN · {meta.subject.toUpperCase()}
              </p>
              <IconButton label="Cerrar índice" onClick={() => setIndex(false)}>
                <X size={22} aria-hidden="true" />
              </IconButton>
            </div>
            <ol className="slide-index">
              {slides.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={i === at ? 'active' : ''}
                    aria-current={i === at ? 'true' : undefined}
                    onClick={() => {
                      send({ type: 'jump', index: i });
                      setIndex(false);
                    }}
                  >
                    <span>{pad2(i + 1)}</span>
                    {item.title}
                  </button>
                </li>
              ))}
            </ol>
          </Modal>
        )}
      </main>
    </div>
  );
}
