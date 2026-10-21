import { mascotGallery } from '../../../app/gallery';
import { useContent } from '../../../content/ContentProvider';
import { createLesson, planningWrites } from '../../../content/ops';
import { lessonMeta, skeleton } from '../../../store/deck';
import type { View } from '../../../store/schema';
import { Button } from '../../../ui/Button';

/** Una clase «por preparar» aún no tiene láminas: parte de la estructura base o de otra clase. */
export function PrepareLesson({
  lessonId,
  onNavigate,
}: {
  lessonId: string;
  onNavigate: (view: View) => void;
}) {
  const content = useContent();
  const meta = lessonMeta(content, lessonId);
  const entry = content.library.entries.find((item) => item.id === lessonId);
  return (
    <main className="page">
      <div className="empty-card editor-empty">
        <p className="kicker">Editor</p>
        <h1>{meta.title}</h1>
        <p>
          Esta clase está por preparar. Parte de la estructura base o de otra
          clase.
        </p>
        <div className="row">
          <Button
            variant="primary"
            disabled={!content.canEdit}
            onClick={() =>
              content.edit([
                ...createLesson(content.bundle, {
                  id: lessonId,
                  title: meta.title,
                  objective: entry?.objective ?? '',
                  slides: skeleton(meta.title, mascotGallery.templates),
                  libraryId: entry?.libraryId ?? null,
                }),
                ...planningWrites(
                  content.bundle,
                  content.files,
                  entry?.libraryId ?? null,
                  {
                    type: 'updateLesson',
                    id: lessonId,
                    patch: {
                      title: undefined,
                      objective: undefined,
                      mark: 'en-preparacion',
                    },
                  },
                ),
              ])
            }
          >
            Preparar con la estructura base
          </Button>
          <Button onClick={() => onNavigate('clases')}>
            Elegir otra clase en Clases
          </Button>
        </div>
      </div>
    </main>
  );
}
