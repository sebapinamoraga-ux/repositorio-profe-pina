import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  parseContentFiles,
  type ContentBundle,
  type ContentProblem,
} from '@aula/content-model/content-files';
import {
  createGitHubClient,
  deleteFile,
  emptyWorkingCopy,
  GitHubError,
  loadSnapshot,
  overlay,
  parseRepo,
  putFile,
  rebase,
  resolveConflict,
  saveChanges,
  settleSaved,
  snapshotFiles,
  type GitHubClient,
  type RunStatus,
  type Snapshot,
  type WorkingCopy,
} from '@aula/content-repo';
import { useAula } from '../store/AulaProvider';
import { useUi } from '../ui/UiProvider';
import { BUILD_FILES, buildBundle } from './build';
import { libraryOf, type Library } from './library';
import { migrateLegacy } from './migrate-v1';
import type { FileWrite } from './ops';
import {
  blobCache,
  CHANGES_KEY,
  loadCachedSnapshot,
  loadConnection,
  loadWorkingCopy,
  parseWorkingCopy,
  saveCachedSnapshot,
  saveConnection,
  saveWorkingCopy,
  type Connection,
} from './storage';
import { describePath, validateForSave } from './validate';

/** build: lo empaquetado con el sitio · cached: último estado leído de GitHub · live: rama al día. */
export type ContentMode = 'build' | 'cached' | 'live';

export interface SyncState {
  status: 'idle' | 'loading' | 'offline' | 'error';
  error: string | null;
  lastSync: string | null;
}

export type SaveState =
  | { phase: 'idle' }
  | { phase: 'validating' | 'saving' }
  | { phase: 'queued'; message: string }
  | { phase: 'invalid'; problems: ContentProblem[] }
  | { phase: 'conflicts' }
  | { phase: 'error'; error: string }
  | { phase: 'saved'; commit: string; at: string; runs: RunStatus[] | null };

export interface ContentValue {
  mode: ContentMode;
  sync: SyncState;
  connection: Connection | null;
  snapshot: Snapshot | null;
  /** Contenido efectivo: la rama con los cambios sin guardar encima. */
  files: ReadonlyMap<string, string>;
  bundle: ContentBundle;
  library: Library;
  wc: WorkingCopy;
  /** Archivos con cambios sin guardar (incluye conflictos). */
  pending: string[];
  /** Solo se edita sobre un snapshot del repositorio, para poder guardar con base conocida. */
  canEdit: boolean;
  edit: (writes: readonly FileWrite[]) => void;
  /** Devuelve una función que deja los cambios como estaban ahora (deshacer). */
  snap: () => () => void;
  save: (message?: string) => Promise<void>;
  saveState: SaveState;
  dismissSave: () => void;
  refresh: () => Promise<void>;
  connect: (connection: Connection) => Promise<string | null>;
  disconnect: () => void;
  resolve: (path: string, choice: 'mine' | 'theirs') => void;
  discard: (paths?: readonly string[]) => void;
}

const ContentContext = createContext<ContentValue | null>(null);

export function useContent() {
  const value = useContext(ContentContext);
  if (!value) throw new Error('useContent requiere ContentProvider');
  return value;
}

const REFRESH_MS = 5 * 60 * 1000;
const RUN_POLL_MS = 15 * 1000;

function clientFor(connection: Connection): GitHubClient {
  const repo = parseRepo(connection.repo, connection.branch);
  if (!repo) throw new GitHubError('invalid', `Repositorio inválido: ${connection.repo}`);
  return createGitHubClient({ repo, token: connection.token });
}

export const repoKey = (connection: Connection) =>
  `${connection.repo}@${connection.branch}`;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

/** Mensaje de commit: qué se tocó, en palabras de la docente. */
export function defaultMessage(paths: readonly string[]) {
  const names = [...new Set(paths.map(describePath))];
  const head = names.slice(0, 3).join(', ');
  return `Aula: ${head}${names.length > 3 ? ` y ${names.length - 3} más` : ''}`;
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const { data, dispatch } = useAula();
  const ui = useUi();
  const [connection, setConnection] = useState<Connection | null>(loadConnection);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<ContentMode>('build');
  const [sync, setSync] = useState<SyncState>({
    status: 'idle',
    error: null,
    lastSync: null,
  });
  const [wc, setWc] = useState<WorkingCopy>(
    () => loadWorkingCopy() ?? emptyWorkingCopy(''),
  );
  const [saveState, setSaveState] = useState<SaveState>({ phase: 'idle' });
  const snapshotRef = useRef(snapshot);
  const wcRef = useRef(wc);
  const connectionRef = useRef(connection);
  const saving = useRef(false);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  useEffect(() => {
    wcRef.current = wc;
    saveWorkingCopy(wc);
  }, [wc]);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // Otra pestaña cambió los pendientes.
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key !== CHANGES_KEY) return;
      setWc(parseWorkingCopy(event.newValue) ?? emptyWorkingCopy(wcRef.current.repo));
    };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, []);

  const adopt = useCallback((next: Snapshot) => {
    if (next === snapshotRef.current) return;
    snapshotRef.current = next;
    setSnapshot(next);
    void saveCachedSnapshot(next);
    // Los pendientes de otro repositorio no se pueden aplicar sobre este.
    setWc((current) =>
      current.repo === next.repo ? rebase(current, next) : emptyWorkingCopy(next.repo),
    );
  }, []);

  const refresh = useCallback(async () => {
    const conn = connectionRef.current;
    if (!conn) return;
    setSync((s) => ({ ...s, status: 'loading' }));
    try {
      const next = await loadSnapshot(clientFor(conn), blobCache, {
        previous: snapshotRef.current,
      });
      if (connectionRef.current !== conn) return;
      adopt(next);
      setMode('live');
      setSync({ status: 'idle', error: null, lastSync: new Date().toISOString() });
    } catch (error) {
      if (connectionRef.current !== conn) return;
      const offline = error instanceof GitHubError && error.kind === 'offline';
      setSync((s) => ({
        ...s,
        status: offline ? 'offline' : 'error',
        error: offline ? null : errorText(error),
      }));
    }
  }, [adopt]);

  // Al abrir: el último snapshot guardado (sin red) y luego la rama al día.
  useEffect(() => {
    if (!connection) return;
    let alive = true;
    void loadCachedSnapshot(repoKey(connection)).then((cached) => {
      if (!alive) return;
      if (cached && !snapshotRef.current) {
        adopt(cached);
        setMode('cached');
      }
      void refresh();
    });
    return () => {
      alive = false;
    };
  }, [connection, adopt, refresh]);

  // Al volver a la pestaña, al recuperar la red y cada cinco minutos.
  useEffect(() => {
    if (!connection) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [connection, refresh]);

  const files = useMemo(
    () => (snapshot ? overlay(snapshotFiles(snapshot), wc) : BUILD_FILES),
    [snapshot, wc],
  );
  const bundle = useMemo(
    () => (snapshot ? parseContentFiles(files) : buildBundle),
    [snapshot, files],
  );
  const library = useMemo(() => libraryOf(bundle), [bundle]);
  const pending = useMemo(
    () => [
      ...Object.keys(wc.changes),
      ...wc.conflicts.map((conflict) => conflict.path),
    ],
    [wc],
  );

  const edit = useCallback((writes: readonly FileWrite[]) => {
    const base = snapshotRef.current;
    if (!base || !writes.length) return;
    setWc((current) => {
      let next = current.repo === base.repo ? current : emptyWorkingCopy(base.repo);
      for (const write of writes)
        next =
          write.text === null
            ? deleteFile(next, base, write.path)
            : putFile(next, base, write.path, write.text);
      return next;
    });
    setSaveState((state) =>
      state.phase === 'saved' || state.phase === 'invalid' ? { phase: 'idle' } : state,
    );
  }, []);

  const snap = useCallback(() => {
    const saved = wcRef.current;
    return () => setWc(saved);
  }, []);

  const pollRuns = useCallback(async (conn: Connection, commit: string) => {
    const client = clientFor(conn);
    const started = Date.now();
    while (Date.now() - started < 20 * 60 * 1000) {
      await new Promise((done) => setTimeout(done, RUN_POLL_MS));
      let runs: RunStatus[] | null;
      try {
        runs = await client.listRuns(commit);
      } catch {
        continue;
      }
      let finished = false;
      setSaveState((state) => {
        if (state.phase !== 'saved' || state.commit !== commit) {
          finished = true;
          return state;
        }
        return { ...state, runs };
      });
      if (finished || runs === null) return;
      if (runs.length && runs.every((run) => run.status === 'completed')) return;
    }
  }, []);

  const save = useCallback(
    async (message?: string) => {
      const conn = connectionRef.current;
      const base = snapshotRef.current;
      if (!conn || !base || saving.current) return;
      saving.current = true;
      const start = wcRef.current;
      const sent = start.changes;
      setSaveState({ phase: 'validating' });
      try {
        const result = await saveChanges(
          clientFor(conn),
          { snapshot: base, wc: start },
          {
            message: message?.trim() || defaultMessage(Object.keys(sent)),
            cache: blobCache,
            validate: async (all, snap, changed) => {
              setSaveState({ phase: 'validating' });
              const problems = await validateForSave(all, snap, changed);
              if (!problems.length) setSaveState({ phase: 'saving' });
              return problems;
            },
          },
        );
        adopt(result.snapshot);
        setMode('live');
        if (result.kind === 'saved') {
          setWc((current) => settleSaved(current, sent, result.snapshot));
          setSaveState({
            phase: 'saved',
            commit: result.commit,
            at: new Date().toISOString(),
            runs: null,
          });
          void pollRuns(conn, result.commit);
        } else if (result.kind === 'conflicts') {
          setWc((current) => ({ ...current, conflicts: result.wc.conflicts }));
          setSaveState({ phase: 'conflicts' });
        } else if (result.kind === 'invalid')
          setSaveState({ phase: 'invalid', problems: result.problems });
        else setSaveState({ phase: 'idle' });
      } catch (error) {
        if (error instanceof GitHubError && error.kind === 'offline')
          setSaveState({ phase: 'queued', message: message ?? '' });
        else setSaveState({ phase: 'error', error: errorText(error) });
      } finally {
        saving.current = false;
      }
    },
    [adopt, pollRuns],
  );

  // Guardados en espera: se envían al recuperar la conexión.
  useEffect(() => {
    if (saveState.phase !== 'queued') return;
    const retry = () => void save(saveState.message);
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [saveState, save]);
  useEffect(() => {
    const online = () => void refresh();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [refresh]);

  const connect = useCallback(
    async (next: Connection): Promise<string | null> => {
      try {
        const info = await clientFor(next).getRepo();
        if (!info.push)
          return 'El token puede leer el repositorio pero no escribir en él: dale permiso «Contents: Read and write».';
      } catch (error) {
        return errorText(error);
      }
      saveConnection(next);
      snapshotRef.current = null;
      setSnapshot(null);
      setMode('build');
      setConnection(next);
      return null;
    },
    [],
  );

  const disconnect = useCallback(() => {
    saveConnection(null);
    connectionRef.current = null;
    snapshotRef.current = null;
    setConnection(null);
    setSnapshot(null);
    setMode('build');
    setSync({ status: 'idle', error: null, lastSync: null });
  }, []);

  const resolve = useCallback((path: string, choice: 'mine' | 'theirs') => {
    setWc((current) => resolveConflict(current, path, choice));
    setSaveState((state) => (state.phase === 'conflicts' ? { phase: 'idle' } : state));
  }, []);

  const discard = useCallback((paths?: readonly string[]) => {
    setWc((current) => {
      if (!paths) return emptyWorkingCopy(current.repo);
      const drop = new Set(paths);
      return {
        ...current,
        changes: Object.fromEntries(
          Object.entries(current.changes).filter(([path]) => !drop.has(path)),
        ),
        conflicts: current.conflicts.filter((c) => !drop.has(c.path)),
      };
    });
    setSaveState({ phase: 'idle' });
  }, []);

  const dismissSave = useCallback(() => setSaveState({ phase: 'idle' }), []);

  // Etapa A → repositorio: una sola vez, cuando ya hay un snapshot sobre el cual escribir.
  const legacy = data.legacy;
  useEffect(() => {
    if (!legacy || !snapshot) return;
    const writes = migrateLegacy(legacy, bundle, files);
    dispatch({ type: 'clearLegacy' });
    if (!writes.length) return;
    edit(writes);
    ui.toast(
      `Se trajeron ${writes.length} cambios que estaban solo en este navegador. Revísalos y guarda.`,
    );
  }, [legacy, snapshot, bundle, files, dispatch, edit, ui]);

  const value = useMemo<ContentValue>(
    () => ({
      mode,
      sync,
      connection,
      snapshot,
      files,
      bundle,
      library,
      wc,
      pending,
      canEdit: snapshot !== null,
      edit,
      snap,
      save,
      saveState,
      dismissSave,
      refresh,
      connect,
      disconnect,
      resolve,
      discard,
    }),
    [
      mode,
      sync,
      connection,
      snapshot,
      files,
      bundle,
      library,
      wc,
      pending,
      edit,
      snap,
      save,
      saveState,
      dismissSave,
      refresh,
      connect,
      disconnect,
      resolve,
      discard,
    ],
  );
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}
