import { useState } from 'react';
import { defaultMessage, useContent } from '../content/ContentProvider';
import { useUi } from '../ui/UiProvider';

/**
 * Publicar los cambios de este navegador en el repositorio: lo comparten la franja `SaveBar` y
 * el indicador de publicación de la clase, para que ambos guarden y descarten igual.
 */
export function usePublish() {
  const content = useContent();
  const ui = useUi();
  const { pending, saveState } = content;
  const [message, setMessage] = useState('');
  const n = pending.length;
  const busy = saveState.phase === 'validating' || saveState.phase === 'saving';

  const discard = async () => {
    if (
      !(await ui.confirm({
        title: '¿Descartar los cambios sin guardar?',
        body: `Se pierden ${n === 1 ? 'el cambio' : `los ${n} cambios`} hechos en este navegador desde el último guardado.`,
        ok: 'Descartar',
      }))
    )
      return;
    const undo = content.snap();
    content.discard();
    ui.toast('Cambios descartados', undo);
  };
  const save = () => {
    void content.save(message || undefined).then(() => setMessage(''));
  };

  return {
    content,
    pending,
    saveState,
    n,
    busy,
    message,
    setMessage,
    placeholder: defaultMessage(pending),
    discard,
    save,
  };
}
