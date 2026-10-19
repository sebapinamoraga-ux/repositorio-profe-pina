import { z } from 'zod';

/** Repositorio y rama donde vive el contenido. */
export interface RepoRef {
  owner: string;
  name: string;
  branch: string;
}

export const repoLabel = (repo: RepoRef) => `${repo.owner}/${repo.name}`;

export function parseRepo(text: string, branch = 'main'): RepoRef | null {
  const match = /^\s*([\w.-]+)\/([\w.-]+)\s*$/.exec(text);
  return match?.[1] && match[2]
    ? { owner: match[1], name: match[2], branch }
    : null;
}

export type GitHubErrorKind =
  | 'auth'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limit'
  | 'offline'
  | 'server'
  | 'invalid';

export class GitHubError extends Error {
  readonly kind: GitHubErrorKind;
  readonly status: number | null;
  /** Momento (ms) en que se renueva el límite de peticiones. */
  readonly resetAt: number | null;
  constructor(
    kind: GitHubErrorKind,
    message: string,
    status: number | null = null,
    resetAt: number | null = null,
  ) {
    super(message);
    this.name = 'GitHubError';
    this.kind = kind;
    this.status = status;
    this.resetAt = resetAt;
  }
}

export interface TreeEntry {
  path: string;
  sha: string;
  type: 'blob' | 'tree' | 'commit';
  mode: string;
}

export type TreeChange =
  | { path: string; content: string }
  | { path: string; delete: true };

export interface RunStatus {
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
}

export interface GitHubClient {
  readonly repo: RepoRef;
  getRepo(): Promise<{ push: boolean; private: boolean }>;
  /** Commit al que apunta la rama. */
  getHead(): Promise<string>;
  getCommit(
    sha: string,
  ): Promise<{ sha: string; tree: string; message: string; date: string }>;
  getTree(treeSha: string): Promise<TreeEntry[]>;
  getBlob(sha: string): Promise<string>;
  createTree(baseTree: string, changes: readonly TreeChange[]): Promise<string>;
  createCommit(message: string, tree: string, parent: string): Promise<string>;
  /** Avanza la rama sin forzar: si otro dispositivo guardó antes, devuelve 'not-fast-forward'. */
  updateRef(sha: string): Promise<'ok' | 'not-fast-forward'>;
  /** Ejecuciones de GitHub Actions de un commit; null si el token no puede leerlas. */
  listRuns(headSha: string): Promise<RunStatus[] | null>;
}

const repoResponse = z.object({
  private: z.boolean(),
  permissions: z.object({ push: z.boolean() }).partial().optional(),
});
const refResponse = z.object({ object: z.object({ sha: z.string() }) });
const commitResponse = z.object({
  sha: z.string(),
  tree: z.object({ sha: z.string() }),
  message: z.string(),
  committer: z.object({ date: z.string() }).partial().optional(),
});
const treeResponse = z.object({
  sha: z.string(),
  truncated: z.boolean(),
  tree: z.array(
    z.object({
      path: z.string(),
      sha: z.string(),
      type: z.enum(['blob', 'tree', 'commit']),
      mode: z.string(),
    }),
  ),
});
const blobResponse = z.object({ content: z.string(), encoding: z.string() });
const shaResponse = z.object({ sha: z.string() });
const runsResponse = z.object({
  workflow_runs: z.array(
    z.object({
      name: z.string().nullable(),
      status: z.string().nullable(),
      conclusion: z.string().nullable(),
      html_url: z.string(),
    }),
  ),
});
const messageResponse = z.object({ message: z.string() });

/** Texto UTF-8 desde el base64 (con saltos de línea) que entrega la API. */
export function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

const API = 'https://api.github.com';

export function createGitHubClient(options: {
  repo: RepoRef;
  token: string | null;
  fetch?: typeof fetch;
}): GitHubClient {
  const { repo, token } = options;
  const doFetch: typeof fetch =
    options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const base = `${API}/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`;

  async function request<T>(
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    path: string,
    init: { method?: string; body?: unknown; cache?: RequestCache } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await doFetch(`${base}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: init.cache ?? 'no-cache',
      });
    } catch {
      throw new GitHubError('offline', 'Sin conexión con GitHub.');
    }
    const text = await response.text();
    if (!response.ok) throw toError(response, text);
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new GitHubError(
        'invalid',
        'GitHub respondió algo que no es JSON.',
        response.status,
      );
    }
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      throw new GitHubError(
        'invalid',
        'GitHub respondió con una forma inesperada.',
        response.status,
      );
    return parsed.data;
  }

  return {
    repo,
    async getRepo() {
      const data = await request(repoResponse, '');
      return { push: data.permissions?.push === true, private: data.private };
    },
    async getHead() {
      const data = await request(
        refResponse,
        `/git/ref/heads/${encodeURIComponent(repo.branch)}`,
      );
      return data.object.sha;
    },
    async getCommit(sha) {
      const data = await request(commitResponse, `/git/commits/${sha}`, {
        cache: 'default',
      });
      return {
        sha: data.sha,
        tree: data.tree.sha,
        message: data.message,
        date: data.committer?.date ?? '',
      };
    },
    async getTree(treeSha) {
      const data = await request(
        treeResponse,
        `/git/trees/${treeSha}?recursive=1`,
        { cache: 'default' },
      );
      if (data.truncated)
        throw new GitHubError(
          'invalid',
          'El repositorio es demasiado grande para leerlo de una vez.',
        );
      return data.tree;
    },
    async getBlob(sha) {
      const data = await request(blobResponse, `/git/blobs/${sha}`, {
        cache: 'default',
      });
      if (data.encoding !== 'base64')
        throw new GitHubError(
          'invalid',
          `Codificación inesperada: ${data.encoding}`,
        );
      return decodeBase64Utf8(data.content);
    },
    async createTree(baseTree, changes) {
      const data = await request(shaResponse, '/git/trees', {
        method: 'POST',
        body: {
          base_tree: baseTree,
          tree: changes.map((change) =>
            'content' in change
              ? {
                  path: change.path,
                  mode: '100644',
                  type: 'blob',
                  content: change.content,
                }
              : { path: change.path, mode: '100644', type: 'blob', sha: null },
          ),
        },
      });
      return data.sha;
    },
    async createCommit(message, tree, parent) {
      const data = await request(shaResponse, '/git/commits', {
        method: 'POST',
        body: { message, tree, parents: [parent] },
      });
      return data.sha;
    },
    async updateRef(sha) {
      try {
        await request(
          refResponse,
          `/git/refs/heads/${encodeURIComponent(repo.branch)}`,
          { method: 'PATCH', body: { sha, force: false } },
        );
        return 'ok';
      } catch (error) {
        if (error instanceof GitHubError && error.status === 422)
          return 'not-fast-forward';
        throw error;
      }
    },
    async listRuns(headSha) {
      try {
        const data = await request(
          runsResponse,
          `/actions/runs?head_sha=${encodeURIComponent(headSha)}&per_page=5`,
        );
        return data.workflow_runs.map((run) => ({
          name: run.name ?? 'Workflow',
          status: run.status ?? 'queued',
          conclusion: run.conclusion,
          url: run.html_url,
        }));
      } catch (error) {
        if (
          error instanceof GitHubError &&
          (error.kind === 'forbidden' || error.kind === 'not-found')
        )
          return null;
        throw error;
      }
    },
  };
}

function toError(response: Response, body: string): GitHubError {
  const status = response.status;
  let detail = '';
  try {
    const parsed = messageResponse.safeParse(JSON.parse(body));
    if (parsed.success) detail = parsed.data.message;
  } catch {
    /* Cuerpo sin JSON. */
  }
  const remaining = response.headers.get('x-ratelimit-remaining');
  const reset = Number(response.headers.get('x-ratelimit-reset'));
  if ((status === 403 || status === 429) && remaining === '0')
    return new GitHubError(
      'rate-limit',
      'Se alcanzó el límite de peticiones a GitHub. Espera unos minutos.',
      status,
      Number.isFinite(reset) && reset > 0 ? reset * 1000 : null,
    );
  if (status === 401)
    return new GitHubError(
      'auth',
      'GitHub no aceptó el token: revísalo o crea uno nuevo.',
      status,
    );
  if (status === 403)
    return new GitHubError(
      'forbidden',
      `El token no tiene permiso para esta operación. ${detail}`.trim(),
      status,
    );
  if (status === 404)
    return new GitHubError(
      'not-found',
      'No se encontró el repositorio o el token no tiene acceso a él.',
      status,
    );
  if (status === 409)
    return new GitHubError('conflict', detail || 'Conflicto en GitHub.', status);
  if (status === 422)
    return new GitHubError(
      'invalid',
      detail || 'GitHub rechazó la petición.',
      status,
    );
  return new GitHubError(
    'server',
    `GitHub respondió ${status}. ${detail}`.trim(),
    status,
  );
}
