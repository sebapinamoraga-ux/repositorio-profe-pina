import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, IconButton } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { findNumbers, parseTyped } from './variant';

/**
 * Variante de una lámina con otros números: la copia queda a continuación, con el mismo
 * desarrollo y sus pasos. Los resultados no se recalculan.
 */
export function VariantDialog({
  number,
  body,
  onCreate,
  onClose,
}: {
  /** Número de la lámina: 12, R2… */
  number: string;
  body: string;
  onCreate: (replacements: Map<string, string>) => void;
  onClose: () => void;
}) {
  const numbers = useMemo(() => findNumbers(body), [body]);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const replacements = new Map<string, string>();
  for (const { digits } of numbers) {
    const value = parseTyped(typed[digits] ?? '');
    if (value !== null && value !== digits) replacements.set(digits, value);
  }
  const changes = replacements.size;
  return (
    <Modal
      label={`Variante de la lámina ${number}`}
      onClose={onClose}
      className="variant-dialog"
    >
      <div className="modal-head">
        <div>
          <p className="kicker">Duplicar con otros números</p>
          <h2>Variante de la lámina {number}</h2>
          <p className="muted small">
            Cambia los números; la copia queda a continuación
          </p>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <p>
        Se reemplazan en todos los bloques, respetando sus pasos. Deja vacío lo
        que se mantiene.
      </p>
      {numbers.length === 0 ? (
        <p className="variant-empty">
          No hay números de tres o más cifras en esta lámina. Puedes crear la
          copia y editarla a mano.
        </p>
      ) : (
        <table className="variant-table">
          <thead>
            <tr>
              <th scope="col">En la lámina</th>
              <th scope="col">En la variante</th>
            </tr>
          </thead>
          <tbody>
            {numbers.map((item) => {
              const value = typed[item.digits] ?? '';
              const invalid = value.trim() !== '' && parseTyped(value) === null;
              return (
                <tr key={item.digits}>
                  <td>
                    <b>{item.shown}</b>{' '}
                    <span className="muted small">
                      {item.count} {item.count === 1 ? 'vez' : 'veces'}
                    </span>
                  </td>
                  <td>
                    <input
                      className={`input ${replacements.has(item.digits) ? 'is-changed' : ''}`}
                      inputMode="numeric"
                      placeholder="Se mantiene"
                      aria-label={`Nuevo valor para ${item.shown}`}
                      aria-invalid={invalid ? true : undefined}
                      value={value}
                      onChange={(event) =>
                        setTyped((prev) => ({
                          ...prev,
                          [item.digits]: event.target.value,
                        }))
                      }
                    />
                    {invalid && (
                      <span className="field-note text-error">
                        Escribe un número entero.
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="variant-warning">
        Los resultados no se recalculan: revisa que el desarrollo siga siendo
        correcto con los números nuevos.
      </p>
      <div className="modal-actions">
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={() => onCreate(replacements)}>
          {changes === 0
            ? 'Crear copia sin cambios'
            : `Crear variante · ${changes} ${changes === 1 ? 'número cambia' : 'números cambian'}`}
        </Button>
      </div>
    </Modal>
  );
}
