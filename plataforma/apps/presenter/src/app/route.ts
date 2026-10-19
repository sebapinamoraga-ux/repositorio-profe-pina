import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { loadRoleState } from '../store/persist';
import { parsePrint, parseRoute, routeHash, type AppRoute } from './routes';

/** La navegación usa fragmentos: GitHub Pages no necesita reglas de reescritura. */
export function readRoute() {
  return new URLSearchParams(window.location.hash.slice(1));
}

/*
 * Un único almacén para el fragmento: todos los componentes ven la misma ruta, también tras
 * pushState/replaceState (que no emiten hashchange). Navegar entre vistas agrega una entrada al
 * historial, así que «Atrás» del navegador vuelve a la vista anterior; los cambios de lámina y
 * las correcciones de forma la reemplazan.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
    window.removeEventListener('popstate', listener);
  };
}

const currentHash = () => window.location.hash;

function writeHash(hash: string, mode: 'push' | 'replace') {
  if (hash === window.location.hash || (hash === '#' && !window.location.hash))
    return;
  if (mode === 'push') history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
  for (const listener of listeners) listener();
}

/**
 * Antes del primer render: lleva enlaces anteriores y visitas sin rol a la forma canónica,
 * recuperando el último rol guardado. La impresión conserva su propio formato.
 */
export function normalizeInitialRoute() {
  const params = readRoute();
  if (parsePrint(params)) return;
  writeHash(routeHash(parseRoute(params, loadRoleState())), 'replace');
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, currentHash);
  const route = useMemo(() => new URLSearchParams(hash.slice(1)), [hash]);
  /** Cambia solo los parámetros indicados, sin nueva entrada de historial. */
  const replace = useCallback((params: Record<string, string | null>) => {
    const next = readRoute();
    for (const [key, value] of Object.entries(params)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    writeHash(`#${next}`, 'replace');
  }, []);
  /** Va a una ruta completa. */
  const go = useCallback(
    (target: AppRoute, mode: 'push' | 'replace' = 'push') =>
      writeHash(routeHash(target), mode),
    [],
  );
  return { route, replace, go };
}

export function useViewportWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const listener = () => setWidth(window.innerWidth);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, []);
  return width;
}

export function useOnline() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}
