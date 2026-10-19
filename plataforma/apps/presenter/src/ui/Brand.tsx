/** Marca «p. PROFE PIÑA»: el punto ocre se conserva en todos los tamaños. */
export function Brand({
  size = 'md',
  label = 'PROFE PIÑA',
}: {
  size?: 'sm' | 'md' | 'lg';
  label?: string | null;
}) {
  return (
    <span className={`app-brand app-brand-${size}`}>
      p<span className="app-brand-dot">.</span>
      {label && <span className="app-brand-label">{label}</span>}
    </span>
  );
}
