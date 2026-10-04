import { ChevronRight } from 'lucide-react';
import { mascotUrl } from '../app/mascot-assets';
import type { Role } from '../store/schema';
import { Brand } from '../ui/Brand';

const ROLES: { role: Role; title: string; text: string }[] = [
  {
    role: 'estudiante',
    title: 'Estudiante',
    text: 'Repasa la clase a tu ritmo en el celular. Sin cuenta.',
  },
  {
    role: 'docente',
    title: 'Docente',
    text: 'Planifica, edita y proyecta la clase desde este navegador.',
  },
  {
    role: 'remoto',
    title: 'Control remoto',
    text: 'Avanza la proyección desde otra pestaña o ventana de este navegador.',
  },
];

const WELCOME_ALT = 'Profe Piña sostiene un lápiz y da la bienvenida.';

export function Landing({ onChoose }: { onChoose: (role: Role) => void }) {
  return (
    <main className="landing">
      <div className="landing-grid">
        <div className="landing-copy">
          <div className="landing-brand">
            <Brand size="lg" />
            <span>Aula</span>
          </div>
          <p className="kicker-rule">
            Bienvenida <span aria-hidden="true" />
          </p>
          <div className="landing-title">
            <h1>¿Cómo entras hoy?</h1>
            <img
              className="landing-mascot-small"
              src={mascotUrl(45)}
              alt={WELCOME_ALT}
            />
          </div>
          <div className="role-list">
            {ROLES.map((item) => (
              <button
                key={item.role}
                type="button"
                className="role-card"
                onClick={() => onChoose(item.role)}
              >
                <span>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </span>
                <ChevronRight size={22} aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <img className="landing-mascot" src={mascotUrl(45)} alt={WELCOME_ALT} />
      </div>
    </main>
  );
}
