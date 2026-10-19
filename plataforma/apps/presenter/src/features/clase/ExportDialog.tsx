import { X } from 'lucide-react';
import { useContent } from '../../content/ContentProvider';
import { findLesson } from '../../content/ops';
import { buildExport } from './editor/export';
import { makeZip } from './editor/zip';
import { lessonMeta } from '../../store/deck';
import { Button, IconButton } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia ZIP de la clase tal como está en la app (incluye los cambios sin guardar). */
export function ExportDialog({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const content = useContent();
  const ui = useUi();
  const lesson = findLesson(content.bundle, lessonId);
  if (!lesson) return null;
  const meta = lessonMeta(content, lessonId);
  const exportData = buildExport(content.files, lesson);
  const count = lesson.slides.length + lesson.repaso.length;
  return (
    <Modal label="Copia ZIP" onClose={onClose}>
      <div className="modal-head">
        <div>
          <p className="kicker">Copia de respaldo</p>
          <h2>{meta.title}</h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <p className="muted modal-lead">
        Descarga un ZIP con <code>clase.yaml</code>, <code>guia.md</code> y {count} archivos <code>.mdx</code>, tal
        como están en la app (incluye los cambios sin guardar). No hace falta para publicar:
        «Guardar en el repositorio» ya lo hace.
      </p>
      <div className="modal-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="primary"
          onClick={() => {
            const zip = makeZip(exportData.files);
            download(`${exportData.folder}.zip`, new Blob([zip], { type: 'application/zip' }));
            onClose();
            ui.toast(`Exportada «${meta.title}» (${exportData.files.length} archivos)`);
          }}
        >
          Descargar ZIP
        </Button>
      </div>
    </Modal>
  );
}
