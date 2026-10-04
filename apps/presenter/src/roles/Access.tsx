import { ArrowLeft, EyeOff, HardDrive, Info } from 'lucide-react';
import type { Role } from '../store/schema';
import { Brand } from '../ui/Brand';

/**
 * Etapa A: bloqueo local, sin credenciales. Evita entrar por accidente a la parte docente,
 * pero no protege datos; la cuenta de Google llega en la etapa B.
 */
export function Access({
  role,
  onBack,
  onUnlock,
}: {
  role: Exclude<Role, 'estudiante'>;
  onBack: () => void;
  onUnlock: () => void;
}) {
  const remote = role === 'remoto';
  return (
    <main className="access">
      <div className="access-column">
        <button type="button" className="link-back" onClick={onBack}>
          <ArrowLeft size={20} aria-hidden="true" />
          Cambiar de rol
        </button>
        <section className="access-card">
          <Brand size="md" />
          <div className="access-heading">
            <h1>{remote ? 'Conecta el control a la clase' : 'Entra a tu aula'}</h1>
            <p>
              {remote
                ? 'Abre la proyección en otra pestaña o ventana de este navegador y controla sus pasos desde aquí.'
                : 'Planifica, edita y proyecta tus clases. Todo se guarda en este navegador.'}
            </p>
          </div>
          <button type="button" className="access-button" onClick={onUnlock}>
            {remote ? 'Usar como control remoto' : 'Entrar como docente'}
          </button>
          <ul className="access-facts">
            <li>
              <HardDrive size={18} aria-hidden="true" />
              <span>
                Tus clases, cursos y comentarios se guardan solo en este
                navegador.
              </span>
            </li>
            <li>
              <EyeOff size={18} aria-hidden="true" />
              <span>
                Nada de esto aparece en el PDF ni en la vista de estudiantes.
              </span>
            </li>
            <li>
              <Info size={18} aria-hidden="true" />
              <span>
                Este acceso es un bloqueo local, no una contraseña. La cuenta de
                Google y la sincronización entre dispositivos llegan en una
                etapa posterior.
              </span>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
