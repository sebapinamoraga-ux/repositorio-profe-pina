import { X } from 'lucide-react';
import { IconButton } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';

/** En Mac, Ctrl equivale a ⌘. */
const GROUPS: [string, [string[], string][]][] = [
  [
    'En la lámina',
    [
      [['Clic'], 'Seleccionar un bloque'],
      [['Doble clic'], 'Escribir en el bloque'],
      [['Enter'], 'Escribir en el bloque seleccionado'],
      [['Esc'], 'Terminar de escribir · quitar la selección'],
      [['Supr'], 'Eliminar el bloque seleccionado (con deshacer)'],
      [['←', '→'], 'Ver el paso anterior o el siguiente'],
      [['Arrastrar'], 'Llevar un bloque de la lámina a otro paso'],
    ],
  ],
  [
    'Mientras escribes',
    [
      [['Ctrl', 'B'], 'Destacar el texto seleccionado'],
      [['Ctrl', 'M'], 'Convertir la selección en fórmula'],
      [['Ctrl', 'Enter'], 'Agregar el comentario'],
    ],
  ],
  [
    'Láminas',
    [
      [['Alt', '↑', '↓'], 'Mover la lámina, también entre tramos'],
      [['Ctrl', 'D'], 'Duplicar la lámina'],
      [['Mayús', 'Clic'], 'Elegir varias láminas para cambiarlas juntas'],
    ],
  ],
  [
    'General',
    [
      [['Ctrl', 'Z'], 'Deshacer el último cambio'],
      [['Ctrl', 'K'], 'Buscar en la clase'],
      [['?'], 'Abrir esta lista'],
    ],
  ],
];

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      label="Atajos de teclado"
      onClose={onClose}
      className="shortcuts-dialog"
    >
      <div className="modal-head">
        <div>
          <p className="kicker">Teclado</p>
          <h2>Atajos de teclado</h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      {GROUPS.map(([title, items]) => (
        <section key={title} className="shortcut-group">
          <h3>{title}</h3>
          <dl>
            {items.map(([keys, label]) => (
              <div key={label} className="shortcut-row">
                <dt>
                  {keys.map((key) => (
                    <kbd key={key}>{key}</kbd>
                  ))}
                </dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="muted small">En Mac, Ctrl equivale a ⌘.</p>
    </Modal>
  );
}
