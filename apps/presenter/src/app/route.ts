import { useCallback, useEffect, useState } from 'react';

/** La navegación usa fragmentos: GitHub Pages no necesita reglas de reescritura. */
export function readRoute() {
  return new URLSearchParams(window.location.hash.slice(1));
}

export function useRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const read = () => setRoute(readRoute());
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const replace = useCallback((params: Record<string, string | null>) => {
    const next = readRoute();
    for (const [key, value] of Object.entries(params)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const hash = `#${next}`;
    if (hash !== window.location.hash) {
      history.replaceState(null, '', hash);
      setRoute(next);
    }
  }, []);
  return { route, replace };
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
