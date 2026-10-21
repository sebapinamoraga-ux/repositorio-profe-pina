import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { IconButton } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { MIN_QUERY, searchSlides, type SearchSlide } from './search';

const pad2 = (k: number) => String(k + 1).padStart(2, '0');

/** Buscar en la clase (Ctrl + K): texto, fórmula o número; Enter va a la lámina y su bloque. */
export function SearchDialog({
  slides,
  onGo,
  onClose,
}: {
  slides: readonly SearchSlide[];
  onGo: (slideId: string, block: number | null) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const hits = useMemo(() => searchSlides(slides, query), [slides, query]);
  const typed = query.trim().length >= MIN_QUERY;
  const go = (k: number) => {
    const hit = hits[k];
    if (!hit) return;
    onClose();
    onGo(hit.slideId, hit.block);
  };
  return (
    <Modal
      label="Buscar en la clase"
      onClose={onClose}
      placement="sheet"
      className="search-dialog"
    >
      <div className="search-head">
        <Search size={18} aria-hidden="true" />
        <input
          className="search-input"
          aria-label="Buscar en la clase"
          placeholder="Texto, fórmula o número, por ejemplo 6.700"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const step = event.key === 'ArrowDown' ? 1 : -1;
              setActive((k) =>
                Math.min(Math.max(k + step, 0), Math.max(hits.length - 1, 0)),
              );
            } else if (event.key === 'Enter') {
              event.preventDefault();
              go(active);
            }
          }}
        />
        <span className="muted small" aria-live="polite">
          {typed
            ? `${hits.length} ${hits.length === 1 ? 'resultado' : 'resultados'}`
            : ''}
        </span>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </IconButton>
      </div>
      {typed && hits.length === 0 && (
        <p className="search-empty">
          No hay coincidencias para «{query.trim()}».
        </p>
      )}
      {hits.length > 0 && (
        <ul className="search-results" role="listbox" aria-label="Resultados">
          {hits.map((hit, k) => (
            <li
              key={`${hit.slideId}-${hit.block ?? 't'}-${k}`}
              role="option"
              aria-selected={k === active}
            >
              <button
                type="button"
                className={k === active ? 'is-active' : ''}
                onMouseEnter={() => setActive(k)}
                onClick={() => go(k)}
              >
                <b className="search-num">{pad2(hit.slideIndex)}</b>
                <span className="search-text">
                  <span className="search-title">
                    {hit.title} · {hit.blockLabel}
                  </span>
                  <span className="search-snippet">
                    {hit.snippet.slice(0, hit.mark[0])}
                    <mark>{hit.snippet.slice(hit.mark[0], hit.mark[1])}</mark>
                    {hit.snippet.slice(hit.mark[1])}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small search-foot">
        ↑ ↓ para moverte · Enter para ir · Esc para cerrar.
      </p>
    </Modal>
  );
}
