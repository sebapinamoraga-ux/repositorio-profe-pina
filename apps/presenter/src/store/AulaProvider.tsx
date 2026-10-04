import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { initialLive, liveReducer, type LiveAction, type LiveState } from './live';
import { deviceId, loadTeacherData, parseTeacherData, saveTeacherData } from './persist';
import { STORAGE_KEY, type TeacherData } from './schema';
import { teacherReducer, type TeacherAction } from './teacher';

/**
 * Etapa A: la proyección se comparte entre pestañas del mismo navegador.
 * La pestaña que presenta es la autoridad: aplica las acciones y difunde el estado.
 */
const CHANNEL = 'profe-pina-aula';
const PRESENCE_MS = 1500;
const PRESENCE_TIMEOUT = 4500;

type Message =
  | { kind: 'action'; action: LiveAction }
  | { kind: 'hello' }
  | { kind: 'snapshot'; live: LiveState }
  | { kind: 'bye' };

interface AulaContextValue {
  data: TeacherData;
  dispatch: (action: TeacherAction) => void;
  /** Devuelve una función que restaura esas claves a su valor actual. */
  snap: (keys: (keyof TeacherData)[]) => () => void;
  live: LiveState;
  send: (action: LiveAction) => void;
  presenterOnline: boolean;
  setPresenting: (value: boolean) => void;
  device: string;
}

const AulaContext = createContext<AulaContextValue | null>(null);

export function useAula() {
  const value = useContext(AulaContext);
  if (!value) throw new Error('useAula requiere AulaProvider');
  return value;
}

function randomCode() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function AulaProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(teacherReducer, undefined, loadTeacherData);
  const [live, liveDispatch] = useReducer(liveReducer, data.lessonId, (id) =>
    initialLive(id, randomCode()),
  );
  const [presenterSeen, setPresenterSeen] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const presenting = useRef(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const liveRef = useRef(live);
  const dataRef = useRef(data);
  const device = useMemo(deviceId, []);

  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  useEffect(() => {
    dataRef.current = data;
    saveTeacherData(data);
  }, [data]);

  // Otra pestaña cambió los datos docentes: adoptarlos.
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      dispatch({ type: 'replace', data: parseTeacherData(event.newValue) });
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  useEffect(() => {
    if (!('BroadcastChannel' in window)) return;
    const bc = new BroadcastChannel(CHANNEL);
    channel.current = bc;
    bc.onmessage = (event: MessageEvent<Message>) => {
      const message = event.data;
      if (message.kind === 'action' && presenting.current)
        liveDispatch(message.action);
      else if (message.kind === 'hello' && presenting.current)
        bc.postMessage({ kind: 'snapshot', live: liveRef.current } satisfies Message);
      else if (message.kind === 'snapshot' && !presenting.current) {
        liveDispatch({ type: 'replaceLive', live: message.live });
        setPresenterSeen(Date.now());
      } else if (message.kind === 'bye' && !presenting.current)
        setPresenterSeen(0);
    };
    bc.postMessage({ kind: 'hello' } satisfies Message);
    return () => {
      if (presenting.current) bc.postMessage({ kind: 'bye' } satisfies Message);
      bc.close();
      channel.current = null;
    };
  }, []);

  // La pestaña que presenta difunde su estado al cambiar y como latido.
  useEffect(() => {
    if (presenting.current)
      channel.current?.postMessage({ kind: 'snapshot', live } satisfies Message);
  }, [live]);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      if (presenting.current)
        channel.current?.postMessage({
          kind: 'snapshot',
          live: liveRef.current,
        } satisfies Message);
    }, PRESENCE_MS);
    return () => clearInterval(timer);
  }, []);

  const send = useCallback((input: LiveAction) => {
    // Las láminas viajan sin sus componentes: el canal solo clona datos.
    const action: LiveAction =
      input.type === 'next' || input.type === 'previous'
        ? { type: input.type, slides: input.slides.map(({ id, steps }) => ({ id, steps })) }
        : input;
    if (presenting.current || !channel.current) liveDispatch(action);
    else channel.current.postMessage({ kind: 'action', action } satisfies Message);
  }, []);

  const setPresenting = useCallback((value: boolean) => {
    presenting.current = value;
    setIsPresenting(value);
    channel.current?.postMessage(
      value
        ? ({ kind: 'snapshot', live: liveRef.current } satisfies Message)
        : ({ kind: 'bye' } satisfies Message),
    );
  }, []);

  const snap = useCallback((keys: (keyof TeacherData)[]) => {
    const saved = Object.fromEntries(
      keys.map((key) => [key, dataRef.current[key]]),
    ) as Partial<TeacherData>;
    return () => dispatch({ type: 'restore', patch: saved });
  }, []);

  const value = useMemo<AulaContextValue>(
    () => ({
      data,
      dispatch,
      snap,
      live,
      send,
      presenterOnline: isPresenting || now - presenterSeen < PRESENCE_TIMEOUT,
      setPresenting,
      device,
    }),
    [data, snap, live, send, isPresenting, now, presenterSeen, setPresenting, device],
  );
  return <AulaContext.Provider value={value}>{children}</AulaContext.Provider>;
}
