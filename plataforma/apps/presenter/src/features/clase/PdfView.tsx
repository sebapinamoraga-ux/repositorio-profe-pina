import { useEffect, useState } from 'react';
import { FitSlide } from '../../slides/FitSlide';
import { SlideView } from '../../slides/SlideView';
import { printedSteps } from '../../slides/PrintDeck';
import { useContent } from '../../content/ContentProvider';
import { deckFor } from '../../store/deck';
import { buttonClass } from '../../ui/Button';

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

/** Vista previa del PDF de la clase: una página por lámina, todo revelado, o una por paso. */
export function PdfView({ lessonId }: { lessonId: string }) {
  const content = useContent();
  const deck = deckFor(content, lessonId);
  const { meta, slides } = deck;
  const local = deck.origin === 'edited';
  const published = usePublishedPdf(
    meta.id,
    meta.repoStatus === 'published' && !local,
  );
  const [stepped, setStepped] = useState(false);
  const pages = slides.reduce(
    (sum, slide) => sum + printedSteps(slide, stepped).length,
    0,
  );
  const printHref = `#clase=${meta.id}&modo=pdf&imprimir=1${stepped ? '&pasos=1' : ''}${local ? '&fuente=local' : ''}`;

  return (
    <main className="pdf-view">
      <header className="pdf-head">
        <div>
          <b>{stepped ? 'PDF con pasos' : 'PDF con respuestas'}</b>
          <span>
            {stepped
              ? `${slides.length} diapositivas en ${pages} páginas: una por paso, como se proyectan; la última de cada diapositiva queda completa. Sin notas.`
              : `${slides.length} diapositivas, pasos y respuestas visibles, sin notas. Una página por diapositiva.`}
          </span>
        </div>
        <div className="row">
          <div role="radiogroup" aria-label="Páginas del PDF" className="pill-group">
            <button
              type="button"
              role="radio"
              className="pill"
              aria-checked={!stepped}
              onClick={() => setStepped(false)}
            >
              Todo revelado
            </button>
            <button
              type="button"
              role="radio"
              className="pill"
              aria-checked={stepped}
              onClick={() => setStepped(true)}
            >
              Con pasos
            </button>
          </div>
          {published && !stepped && (
            <a className={buttonClass()} href={published} download>
              Descargar PDF publicado
            </a>
          )}
          <a className={buttonClass({ variant: 'primary' })} href={printHref} target="_blank" rel="noreferrer">
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
          {slides.flatMap((slide, i) =>
            printedSteps(slide, stepped).map((step) => (
              <FitSlide key={`${slide.id}-${step}`} mode="width" className="pdf-page">
                <SlideView
                  meta={meta}
                  slides={slides}
                  index={i}
                  step={step}
                  print
                  stepped={stepped}
                />
              </FitSlide>
            )),
          )}
        </div>
      )}
    </main>
  );
}
