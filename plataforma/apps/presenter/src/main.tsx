import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { normalizeInitialRoute } from './app/route';
import 'katex/dist/katex.min.css';
// Estilos en el orden de la cascada: variables, láminas, primitivos y base, y luego cada área.
// Se cargan todos al inicio (no con cada pantalla) para que el orden no dependa de la navegación.
import './styles/tokens.css';
import './styles/theme.css';
import '@aula/interactives/figuras.css';
import './styles/ui.css';
import './styles/base.css';
import './features/entrada/entrada.css';
import './shell/shell.css';
import './features/clase/summary.css';
import './slides/fit.css';
import './features/presentar/presenter.css';
import './features/clase/pdf.css';
import './features/remoto/remote.css';
import './features/clases/library.css';
import './styles/forms.css';
import './shell/status.css';
import './features/clase/editor.css';
import './features/cursos/courses.css';
import './features/recursos/gallery.css';
import './features/clase/workspace.css';
import './features/clases/today.css';
import './features/ajustes/settings.css';
import './features/estudiante/student.css';
normalizeInitialRoute();
const root = document.getElementById('root');
if (!root) throw new Error('Falta contenedor');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
