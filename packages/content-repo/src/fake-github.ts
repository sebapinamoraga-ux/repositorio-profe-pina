/**
 * GitHub en memoria para pruebas: implementa las rutas de la API de git que usa el cliente.
 * Se usa como `fetch` inyectado (vitest) o detrás de `page.route` (Playwright).
 */

interface FakeCommit {
  tree: string;
  parent: string | null;
  message: string;
}

export interface FakeRequest {
  method: string;
  path: string;
  body: unknown;
}

/** SHA de prueba: determinista por contenido, sin pretender ser el de git. */
function fakeSha(kind: string, text: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  const input = `${kind}\0${text}`;
  for (let k = 0; k < input.length; k++) {
    const c = input.charCodeAt(k);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = Math.imul(b ^ (c + k), 0x5bd1e995) >>> 0;
  }
  let out = '';
  for (let k = 0; k < 5; k++) {
    a = Math.imul(a ^ (a >>> 13), 0x5bd1e995) >>> 0;
    b = Math.imul(b ^ (b >>> 15), 0x27d4eb2d) >>> 0;
    out += ((a ^ b) >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}

function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // La API real corta el base64 en líneas de 60 caracteres.
  return btoa(binary).replace(/.{60}/g, '$&\n');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export class FakeGitHub {
  readonly owner: string;
  readonly name: string;
  readonly branch: string;
  token: string | null;
  ref: string;
  readonly blobs = new Map<string, string>();
  readonly trees = new Map<string, Map<string, string>>();
  readonly commits = new Map<string, FakeCommit>();
  readonly requests: FakeRequest[] = [];
  /** Si se define, la próxima actualización de la rama falla como si otro dispositivo hubiera guardado. */
  beforeUpdateRef: (() => void) | null = null;
  offline = false;

  constructor(options: {
    owner?: string;
    name?: string;
    branch?: string;
    token?: string | null;
    files: Record<string, string>;
  }) {
    this.owner = options.owner ?? 'profe';
    this.name = options.name ?? 'aula';
    this.branch = options.branch ?? 'main';
    this.token = options.token ?? 'token-de-prueba';
    const tree = this.storeTree(new Map(), options.files);
    this.ref = this.storeCommit({ tree, parent: null, message: 'Inicio' });
  }

  private storeBlob(text: string) {
    const sha = fakeSha('blob', text);
    this.blobs.set(sha, text);
    return sha;
  }

  private storeTree(
    base: ReadonlyMap<string, string>,
    changes: Record<string, string | null>,
  ) {
    const entries = new Map(base);
    for (const [path, text] of Object.entries(changes)) {
      if (text === null) entries.delete(path);
      else entries.set(path, this.storeBlob(text));
    }
    const sha = fakeSha(
      'tree',
      [...entries].sort().map(([p, s]) => `${p}:${s}`).join('\n'),
    );
    this.trees.set(sha, entries);
    return sha;
  }

  private storeCommit(commit: FakeCommit) {
    const sha = fakeSha(
      'commit',
      `${commit.tree}\n${commit.parent ?? ''}\n${commit.message}\n${this.commits.size}`,
    );
    this.commits.set(sha, commit);
    return sha;
  }

  /** Archivos en la punta de la rama. */
  files(): Record<string, string> {
    const commit = this.commits.get(this.ref);
    const tree = commit ? this.trees.get(commit.tree) : undefined;
    return Object.fromEntries(
      [...(tree ?? [])].map(([path, sha]) => [path, this.blobs.get(sha) ?? '']),
    );
  }

  headCommit(): FakeCommit | undefined {
    return this.commits.get(this.ref);
  }

  /** Un commit hecho desde otro dispositivo. */
  pushExternal(changes: Record<string, string | null>, message = 'Otro dispositivo') {
    const head = this.commits.get(this.ref);
    const base = head ? (this.trees.get(head.tree) ?? new Map<string, string>()) : new Map<string, string>();
    const tree = this.storeTree(base, changes);
    this.ref = this.storeCommit({ tree, parent: this.ref, message });
  }

  readonly fetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    const method = (init.method ?? 'GET').toUpperCase();
    const body: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : null;
    const headers = new Headers(init.headers);
    return this.handle(method, url, body, headers.get('authorization'));
  };

  handle(
    method: string,
    url: URL,
    body: unknown,
    authorization: string | null,
  ): Response {
    if (this.offline) throw new TypeError('Failed to fetch');
    const prefix = `/repos/${this.owner}/${this.name}`;
    const path = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : null;
    this.requests.push({ method, path: url.pathname + url.search, body });
    const json = (status: number, value: unknown) =>
      new Response(JSON.stringify(value), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    if (path === null) return json(404, { message: 'Not Found' });
    if (this.token && authorization !== `Bearer ${this.token}`)
      return json(401, { message: 'Bad credentials' });
    const ref = `/git/ref/heads/${this.branch}`;
    const refs = `/git/refs/heads/${this.branch}`;
    if (method === 'GET' && path === '')
      return json(200, { private: false, permissions: { push: true } });
    if (method === 'GET' && path === ref)
      return json(200, { object: { sha: this.ref } });
    let match = /^\/git\/commits\/(\w+)$/.exec(path);
    if (method === 'GET' && match?.[1]) {
      const commit = this.commits.get(match[1]);
      if (!commit) return json(404, { message: 'Not Found' });
      return json(200, {
        sha: match[1],
        tree: { sha: commit.tree },
        message: commit.message,
        committer: { date: '2026-10-04T12:00:00Z' },
      });
    }
    match = /^\/git\/trees\/(\w+)$/.exec(path);
    if (method === 'GET' && match?.[1]) {
      const tree = this.trees.get(match[1]);
      if (!tree) return json(404, { message: 'Not Found' });
      return json(200, {
        sha: match[1],
        truncated: false,
        tree: [...tree].map(([p, sha]) => ({
          path: p,
          sha,
          type: 'blob',
          mode: '100644',
        })),
      });
    }
    match = /^\/git\/blobs\/(\w+)$/.exec(path);
    if (method === 'GET' && match?.[1]) {
      const text = this.blobs.get(match[1]);
      if (text === undefined) return json(404, { message: 'Not Found' });
      return json(200, { content: encodeBase64Utf8(text), encoding: 'base64' });
    }
    if (method === 'POST' && path === '/git/trees' && isRecord(body)) {
      const base = this.trees.get(String(body.base_tree));
      if (!base || !Array.isArray(body.tree))
        return json(422, { message: 'Invalid tree' });
      const changes: Record<string, string | null> = {};
      for (const item of body.tree) {
        if (!isRecord(item)) continue;
        changes[String(item.path)] =
          item.sha === null ? null : String(item.content ?? '');
      }
      return json(201, { sha: this.storeTree(base, changes) });
    }
    if (method === 'POST' && path === '/git/commits' && isRecord(body)) {
      const parents = Array.isArray(body.parents) ? body.parents : [];
      const sha = this.storeCommit({
        tree: String(body.tree),
        parent: parents[0] === undefined ? null : String(parents[0]),
        message: String(body.message),
      });
      return json(201, { sha });
    }
    if (method === 'PATCH' && path === refs && isRecord(body)) {
      if (this.beforeUpdateRef) {
        const hook = this.beforeUpdateRef;
        this.beforeUpdateRef = null;
        hook();
      }
      const commit = this.commits.get(String(body.sha));
      if (!commit) return json(422, { message: 'Object does not exist' });
      if (commit.parent !== this.ref && body.force !== true)
        return json(422, { message: 'Update is not a fast forward' });
      this.ref = String(body.sha);
      return json(200, { object: { sha: this.ref } });
    }
    if (method === 'GET' && path === '/actions/runs')
      return json(200, { workflow_runs: [] });
    return json(404, { message: 'Not Found' });
  }
}
