import type { FormEvent, HTMLAttributes, ReactNode } from 'react';

/** Página docente: fondo, márgenes y ancho de lectura comunes. */
export function Page({
  width = 'default',
  grid = false,
  className,
  children,
}: {
  width?: 'narrow' | 'medium' | 'default' | 'wide';
  grid?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <main className={`page ${grid ? 'page--grid' : ''}`}>
      <div
        className={[
          'page-inner',
          width === 'default' ? '' : `page-inner--${width}`,
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
    </main>
  );
}

/**
 * Encabezado único de las pantallas docentes: antetítulo (con una acción opcional al lado),
 * título, datos breves, texto introductorio y acciones alineadas a la derecha.
 */
export function PageHeader({
  kicker,
  kickerAction,
  title,
  meta,
  lead,
  actions,
}: {
  kicker: ReactNode;
  kickerAction?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="page-head-text">
        <div className="page-head-kicker">
          <p className="kicker">{kicker}</p>
          {kickerAction}
        </div>
        <h1 className="page-title">{title}</h1>
        {meta && <div className="chips">{meta}</div>}
        {lead && <p className="page-lead">{lead}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/** Familias del lenguaje visual (docs/lenguaje-visual.md). */
export type Tone =
  | 'definicion'
  | 'objetivo'
  | 'procedimiento'
  | 'practica'
  | 'comprobacion'
  | 'reflexion';

type CardProps = Omit<HTMLAttributes<HTMLElement>, 'title' | 'onSubmit'> & {
  as?: 'section' | 'div' | 'form';
  /** emphasis: la acción principal de la pantalla; quiet: información secundaria. */
  variant?: 'default' | 'emphasis' | 'quiet' | 'dashed' | 'note';
  /** Con tono, la tarjeta toma la familia pedagógica y su etiqueta tipo pestaña. */
  tone?: Tone;
  tab?: ReactNode;
  title?: ReactNode;
  titleSize?: 'md' | 'sm';
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

export function Card({
  as: Tag = 'section',
  variant = 'default',
  tone,
  tab,
  title,
  titleSize = 'md',
  className,
  onSubmit,
  children,
  ...rest
}: CardProps) {
  const classes = [
    'card',
    variant === 'default' ? '' : `card--${variant}`,
    tone ? `card--tone tone-${tone}` : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const body = (
    <>
      {tone && tab && <p className="card-tab">{tab}</p>}
      {title && (
        <h2 className={`card-title ${titleSize === 'sm' ? 'card-title--sm' : ''}`}>
          {title}
        </h2>
      )}
      {children}
    </>
  );
  if (Tag === 'form')
    return (
      <form className={classes} onSubmit={onSubmit} {...rest}>
        {body}
      </form>
    );
  return (
    <Tag className={classes} {...rest}>
      {body}
    </Tag>
  );
}

/** Aviso en línea. `role` se indica cuando el aviso aparece como respuesta a una acción. */
export function Notice({
  tone = 'info',
  role,
  className,
  children,
}: {
  tone?: 'info' | 'warn' | 'error' | 'ok';
  role?: 'status' | 'alert';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role={role} className={`notice notice--${tone} ${className ?? ''}`}>
      {children}
    </div>
  );
}
