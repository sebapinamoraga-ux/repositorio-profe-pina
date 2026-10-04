import { MascotGallery } from '../app/MascotGallery';
import { useAula } from '../store/AulaProvider';
import { deckFor, editableSlides, slideFromTemplate } from '../store/deck';
import type { View } from '../store/schema';

/** Se conserva la galería del repositorio; la página solo adopta el estilo de la app. */
export function GalleryView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch } = useAula();
  const deck = deckFor(data, data.lessonId);
  return (
    <MascotGallery
      returnHref={`#rol=docente&vista=presentar&clase=${data.lessonId}`}
      onReturn={() => onNavigate('presentar')}
      onUse={async (template) => {
        const slides = deck.origin === 'empty' ? [] : await editableSlides(data, data.lessonId);
        let id = template.id;
        for (let k = 2; slides.some((s) => s.id === id); k++) id = `${template.id}-${k}`;
        dispatch({
          type: 'setEdits',
          lessonId: data.lessonId,
          slides: [...slides, slideFromTemplate(template, id)],
        });
        return `Lámina agregada al final de «${deck.meta.title}». Ajústala en el editor.`;
      }}
    />
  );
}
