import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import 'katex/dist/katex.min.css';
import './styles/theme.css';
const root = document.getElementById('root');
if (!root) throw new Error('Falta contenedor');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
