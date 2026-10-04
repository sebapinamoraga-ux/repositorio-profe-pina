import { MascotGallery } from '../app/MascotGallery';
import { useContent } from '../content/ContentProvider';
import { findLesson, writeSlides } from '../content/ops';
import { useAula } from '../store/AulaProvider';
import { deckFor, editableSlides, slideFromTemplate } from '../store/deck';
import type { View } from '../store/schema';

/** Se conserva la galería del repositorio; la página solo adopta el estilo de la app. */
export function GalleryView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data } = useAula();
  const content = useContent();
  const deck = deckFor(content, data.lessonId);
  return (
    <MascotGallery
      returnHref={`#rol=docente&vista=presentar&clase=${data.lessonId}`}
      onReturn={() => onNavigate('presentar')}
      onUse={async (template) => {
        const lesson = findLesson(content.bundle, data.lessonId);
        if (!content.canEdit)
          return 'Conecta la app con GitHub (Docente → Conexión) para agregar láminas.';
        if (!lesson)
          return `«${deck.meta.title}» aún no está preparada: prepárala en la biblioteca.`;
        const slides = editableSlides(lesson);
        let id = template.id;
        for (let k = 2; slides.some((s) => s.id === id); k++) id = `${template.id}-${k}`;
        content.edit(
          writeSlides(content.bundle, data.lessonId, [
            ...slides,
            slideFromTemplate(template, id),
          ]),
        );
        return `Lámina agregada al final de «${deck.meta.title}». Ajústala en el editor y guarda.`;
      }}
    />
  );
}
