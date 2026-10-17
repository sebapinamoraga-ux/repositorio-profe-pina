import { useEffect } from 'react';
import type { Deck, DeckSlide } from '../store/deck';
import { SlideView } from './SlideView';

/** Pasos impresos de una lámina: solo el final, o del 0 al último si se piden los pasos. */
export function printedSteps(slide: DeckSlide, stepped: boolean): number[] {
  return stepped
    ? Array.from({ length: slide.steps + 1 }, (_, step) => step)
    : [slide.steps];
}

/**
 * Modo PDF: una página por lámina, todo revelado, sin controles ni notas. Con `stepped`, una
 * página por paso de cada lámina; la última de cada una queda completa. export:pdf depende de
 * este marcado.
 */
export function PrintDeck({
  deck,
  autoPrint = false,
  stepped = false,
}: {
  deck: Deck;
  autoPrint?: boolean;
  stepped?: boolean;
}) {
  useEffect(() => {
    if (!autoPrint) return;
    let cancelled = false;
    // Esperar fuentes y láminas compiladas en el navegador antes de abrir el diálogo.
    void document.fonts.ready.then(() =>
      setTimeout(() => {
        if (!cancelled) window.print();
      }, 600),
    );
    return () => {
      cancelled = true;
    };
  }, [autoPrint]);
  return (
    <main className="print-deck">
      {deck.slides.flatMap((slide, i) =>
        printedSteps(slide, stepped).map((step) => (
          <SlideView
            key={`${slide.id}-${step}`}
            meta={deck.meta}
            slides={deck.slides}
            index={i}
            step={step}
            print
            stepped={stepped}
          />
        )),
      )}
    </main>
  );
}
