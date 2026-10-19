import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Vocabulario único de botones. `primary` es la acción principal de una pantalla o diálogo;
 * `present` se reserva para proyectar en vivo; `danger` marca acciones destructivas en filas y
 * paneles y `danger-strong` las confirma en un diálogo; `add` agrega un elemento a una lista.
 */
export type ButtonVariant =
  | 'primary'
  | 'present'
  | 'secondary'
  | 'quiet'
  | 'danger'
  | 'danger-strong'
  | 'add';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonLook {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  className?: string;
}

/** Clases de un botón, también para enlaces que se ven como botón. */
export function buttonClass({
  variant = 'secondary',
  size = 'md',
  block = false,
  className,
}: ButtonLook = {}): string {
  return [
    'btn',
    variant === 'secondary' ? '' : `btn--${variant}`,
    size === 'md' ? '' : `btn--${size}`,
    block ? 'btn--block' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = ButtonLook &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> & {
    type?: 'button' | 'submit';
  };

export function Button({
  variant,
  size,
  block,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    />
  );
}

type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'type' | 'aria-label' | 'children'
> & {
  /** Nombre accesible obligatorio: el botón solo muestra un icono. */
  label: string;
  children: ReactNode;
  outline?: boolean;
  danger?: boolean;
  className?: string;
};

export function IconButton({
  label,
  outline = false,
  danger = false,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={[
        'icon-btn',
        outline ? 'icon-btn--outline' : '',
        danger ? 'icon-btn--danger' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
