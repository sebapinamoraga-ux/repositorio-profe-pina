import { useState } from 'react';
import * as ui from '@aula/pedagogical-ui';
import { useActivities } from '../../../app/catalog';
import { mascotGallery } from '../../../app/gallery';
import { mascotUrl } from '../../../app/mascot-assets';
import { FitSlide } from '../../../slides/FitSlide';
import { Frame } from '../../../slides/SlideView';
import type { DeckSlide, LessonMeta } from '../../../store/deck';
import { EditableContent } from './EditableContent';

/** La lámina completa, sin controles, que se actualiza mientras se escribe (modo enfoque). */
export function MiniSlide({
  meta,
  deckSlide,
  index,
  total,
  body,
}: {
  meta: LessonMeta;
  deckSlide: DeckSlide;
  index: number;
  total: number;
  body: string;
}) {
  const activities = useActivities();
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <ui.SlideContext.Provider
      value={{
        step: Number.POSITIVE_INFINITY,
        print: false,
        values,
        setValue: (key, value) =>
          setValues((prev) => ({ ...prev, [key]: value })),
        activities,
        mascotUrl,
        templates: mascotGallery.templates,
      }}
    >
      <div
        className="mini-slide"
        aria-label="Así va quedando la lámina"
        role="img"
      >
        <FitSlide mode="width">
          <Frame meta={meta} slide={deckSlide} index={index} total={total}>
            <EditableContent body={body} />
          </Frame>
        </FitSlide>
      </div>
    </ui.SlideContext.Provider>
  );
}
