import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { normalizeInitialRoute } from './app/route';
import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/theme.css';
import './styles/ui.css';
import './styles/aula.css';
import './styles/editor.css';
import './styles/pages.css';
import './styles/student.css';
normalizeInitialRoute();
const root = document.getElementById('root');
if (!root) throw new Error('Falta contenedor');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
