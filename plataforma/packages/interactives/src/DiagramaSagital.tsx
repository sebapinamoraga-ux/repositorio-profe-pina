import { useId } from 'react';
import {
  entradasInvalidas,
  parsearFlechas,
  salidasAlcanzadas,
} from './sagittal';

/**
 * Diagrama sagital estático: dos conjuntos y flechas entre sus elementos. Las entradas
 * sin imagen o con más de una se destacan solas; los ejemplos pertenecen al contenido.
 */
export function DiagramaSagital({
  entradas,
  salidas,
  flechas,
  tituloEntradas,
  tituloSalidas,
  descripcion,
}: {
  entradas: string[];
  salidas: string[];
  flechas: string[];
  tituloEntradas: string;
  tituloSalidas: string;
  descripcion: string;
}) {
  const markerId = useId().replaceAll(':', '');
  if (entradas.length < 1 || salidas.length < 1)
    throw new Error('DiagramaSagital requiere elementos en ambos conjuntos.');
  if (Math.max(entradas.length, salidas.length) > 6)
    throw new Error(
      'DiagramaSagital admite hasta seis elementos por conjunto.',
    );
  const parsed = parsearFlechas(flechas, entradas, salidas);
  const invalidas = new Set(entradasInvalidas(entradas, parsed));
  const alcanzadas = new Set(salidasAlcanzadas(salidas, parsed));
  const gap = 54;
  const rows = Math.max(entradas.length, salidas.length);
  const ry = (rows * gap) / 2 + 26;
  const cy = 54 + ry;
  const height = cy + ry + 6;
  const left = 150;
  const right = 490;
  const yOf = (index: number, total: number) =>
    cy - ((total - 1) * gap) / 2 + index * gap;
  const yEntrada = (label: string) =>
    yOf(entradas.indexOf(label), entradas.length);
  const ySalida = (label: string) =>
    yOf(salidas.indexOf(label), salidas.length);
  return (
    <div className="sagittal">
      <svg viewBox={`0 0 640 ${height}`} role="img" aria-label={descripcion}>
        <defs>
          {['ok', 'bad'].map((kind) => (
            <marker
              key={kind}
              id={`${markerId}-${kind}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="4.5"
              markerHeight="4.5"
              orient="auto"
            >
              <path
                d="M0,0 L10,5 L0,10 z"
                className={
                  kind === 'ok' ? 'sagittal-head' : 'sagittal-head-bad'
                }
              />
            </marker>
          ))}
        </defs>
        <text
          className="sagittal-title"
          x={left}
          y="30"
          textAnchor="middle"
          fontSize="24"
        >
          {tituloEntradas}
        </text>
        <text
          className="sagittal-title"
          x={right}
          y="30"
          textAnchor="middle"
          fontSize="24"
        >
          {tituloSalidas}
        </text>
        <ellipse
          className="sagittal-set-1"
          cx={left}
          cy={cy}
          rx="105"
          ry={ry}
        />
        <ellipse
          className="sagittal-set-2"
          cx={right}
          cy={cy}
          rx="105"
          ry={ry}
        />
        {parsed.map((flecha, index) => {
          const bad = invalidas.has(flecha.desde);
          return (
            <line
              key={index}
              className={bad ? 'sagittal-arrow-bad' : 'sagittal-arrow'}
              x1={left + 48}
              y1={yEntrada(flecha.desde)}
              x2={right - 58}
              y2={ySalida(flecha.hasta)}
              strokeWidth="3.5"
              markerEnd={`url(#${markerId}-${bad ? 'bad' : 'ok'})`}
            />
          );
        })}
        {entradas.map((label, index) => (
          <text
            key={`e${label}`}
            className={
              invalidas.has(label) ? 'sagittal-item-bad' : 'sagittal-item'
            }
            x={left}
            y={yOf(index, entradas.length) + 9}
            textAnchor="middle"
            fontSize="26"
          >
            {label}
          </text>
        ))}
        {salidas.map((label, index) => (
          <text
            key={`s${label}`}
            className={
              alcanzadas.has(label) ? 'sagittal-item' : 'sagittal-item-muted'
            }
            x={right}
            y={yOf(index, salidas.length) + 9}
            textAnchor="middle"
            fontSize="26"
          >
            {label}
          </text>
        ))}
      </svg>
    </div>
  );
}
