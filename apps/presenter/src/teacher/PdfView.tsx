import { useEffect, useState } from 'react';
import { FitSlide } from '../slides/FitSlide';
import { SlideView } from '../slides/SlideView';
import { useAula } from '../store/AulaProvider';
import { useContent } from '../content/ContentProvider';
import { deckFor } from '../store/deck';
import type { View } from '../store/schema';

/** PDF publicado por el workflow (publish:pdf), solo para clases con status published. */
function usePublishedPdf(id: string, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const href = `${import.meta.env.BASE_URL}pdf/${id}.pdf`;
    const controller = new AbortController();
    fetch(href, { method: 'HEAD', signal: controller.signal })
      .then((response) => {
        const type = response.headers.get('content-type') ?? '';
        setUrl(response.ok && type.includes('pdf') ? href : null);
      })
      .catch(() => setUrl(null));
    return () => controller.abort();
  }, [id, enabled]);
  return enabled ? url : null;
}

export function PdfView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data } = useAula();
  const content = useContent();
  const deck = deckFor(content, data.lessonId);
  const { meta, slides } = deck;
  const local = deck.origin === 'edited';
  const published = usePublishedPdf(
    meta.id,
    meta.repoStatus === 'published' && !local,
  );
  const printHref = `#clase=${meta.id}&modo=pdf&imprimir=1${local ? '&fuente=local' : ''}`;

  return (
    <main className="pdf-view">
      <header className="pdf-head">
        <div>
          <b>Vista PDF con respuestas · {meta.title}</b>
          <span>
            {slides.length} diapositivas, pasos y respuestas visibles, sin notas.
            Una página por diapositiva.
          </span>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => onNavigate('presentar')}>
            Volver a la clase
          </button>
          {published && (
            <a className="btn btn-accent" href={published} download>
              Descargar PDF publicado
            </a>
          )}
          <a className="btn btn-ink" href={printHref} target="_blank" rel="noreferrer">
            Imprimir o guardar PDF
          </a>
        </div>
      </header>
      {local && (
        <p className="pdf-note">
          Esta clase tiene cambios sin guardar en el repositorio. La vista y la
          impresión los incluyen; el PDF oficial se publica cuando guardas los
          cambios y la clase está publicada.
        </p>
      )}
      {!slides.length ? (
        <p className="pdf-note">Esta clase aún no tiene láminas.</p>
      ) : (
        <div className="pdf-deck">
          {slides.map((slide, i) => (
            <FitSlide key={slide.id} mode="width" className="pdf-page">
              <SlideView meta={meta} slides={slides} index={i} step={slide.steps} print />
            </FitSlide>
          ))}
        </div>
      )}
    </main>
  );
}
