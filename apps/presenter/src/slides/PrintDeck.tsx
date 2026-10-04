import { useEffect } from 'react';
import type { Deck } from '../store/deck';
import { SlideView } from './SlideView';

/** Modo PDF: una página por lámina, todo revelado, sin controles ni notas. export:pdf depende de este marcado. */
export function PrintDeck({
  deck,
  autoPrint = false,
}: {
  deck: Deck;
  autoPrint?: boolean;
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
      {deck.slides.map((slide, i) => (
        <SlideView
          key={slide.id}
          meta={deck.meta}
          slides={deck.slides}
          index={i}
          step={slide.steps}
          print
        />
      ))}
    </main>
  );
}
