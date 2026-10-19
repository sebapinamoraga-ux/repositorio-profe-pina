import { describe, expect, it } from 'vitest';
import { FakeGitHub } from './fake-github';
import {
  createGitHubClient,
  decodeBase64Utf8,
  GitHubError,
  type GitHubClient,
} from './github';
import { saveChanges } from './commit';
import { loadSnapshot, memoryBlobCache, snapshotFiles } from './snapshot';
import {
  deleteFile,
  emptyWorkingCopy,
  overlay,
  putFile,
  rebase,
  resolveConflict,
} from './working-copy';

const FILES = {
  'contenido/cursos/c/clases/a/clase.yaml': 'id: a\ntitle: Á\n',
  'contenido/cursos/c/clases/a/laminas/uno.mdx': '---\nid: uno\n---\nHola ñandú\n',
  'contenido/comun/mascotas/png/1-hola.png': 'binario',
  'README.md': 'Léeme',
};

function setup() {
  const fake = new FakeGitHub({ files: FILES });
  const client = createGitHubClient({
    repo: { owner: fake.owner, name: fake.name, branch: fake.branch },
    token: 'token-de-prueba',
    fetch: fake.fetch,
  });
  return { fake, client, cache: memoryBlobCache() };
}

describe('cliente de GitHub', () => {
  it('decodifica base64 con UTF-8 y saltos de línea', () => {
    const encoded = btoa(
      String.fromCharCode(...new TextEncoder().encode('Ecuación: ñ')),
    );
    expect(decodeBase64Utf8(`${encoded.slice(0, 5)}\n${encoded.slice(5)}`)).toBe(
      'Ecuación: ñ',
    );
  });

  it('envía el token y la versión de la API', async () => {
    const seen: Headers[] = [];
    const client = createGitHubClient({
      repo: { owner: 'o', name: 'r', branch: 'main' },
      token: 'abc',
      fetch: async (_input, init) => {
        seen.push(new Headers(init?.headers));
        return new Response(JSON.stringify({ object: { sha: 'x' } }));
      },
    });
    await client.getHead();
    expect(seen[0]?.get('authorization')).toBe('Bearer abc');
    expect(seen[0]?.get('x-github-api-version')).toBe('2022-11-28');
  });

  it('traduce los errores de GitHub', async () => {
    const respond = (status: number, headers: Record<string, string> = {}) =>
      createGitHubClient({
        repo: { owner: 'o', name: 'r', branch: 'main' },
        token: 'abc',
        fetch: async () =>
          new Response(JSON.stringify({ message: 'x' }), { status, headers }),
      });
    const kind = async (client: GitHubClient) =>
      client.getHead().catch((error: unknown) =>
        error instanceof GitHubError ? error.kind : 'otro',
      );
    expect(await kind(respond(401))).toBe('auth');
    expect(await kind(respond(403))).toBe('forbidden');
    expect(await kind(respond(403, { 'x-ratelimit-remaining': '0' }))).toBe(
      'rate-limit',
    );
    expect(await kind(respond(404))).toBe('not-found');
    expect(await kind(respond(500))).toBe('server');
    const offline = createGitHubClient({
      repo: { owner: 'o', name: 'r', branch: 'main' },
      token: null,
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    expect(await kind(offline)).toBe('offline');
  });
});

describe('snapshot', () => {
  it('lee solo el texto de contenido/ y reutiliza blobs sin cambios', async () => {
    const { fake, client, cache } = setup();
    const first = await loadSnapshot(client, cache);
    expect(Object.keys(first.files).sort()).toEqual([
      'contenido/cursos/c/clases/a/clase.yaml',
      'contenido/cursos/c/clases/a/laminas/uno.mdx',
    ]);
    expect(first.paths).toContain('contenido/comun/mascotas/png/1-hola.png');
    expect(first.files['contenido/cursos/c/clases/a/laminas/uno.mdx']?.text).toContain('ñandú');

    fake.pushExternal({ 'contenido/cursos/c/clases/a/clase.yaml': 'id: a\ntitle: B\n' });
    fake.requests.length = 0;
    const second = await loadSnapshot(client, cache, { previous: first });
    const blobs = fake.requests.filter((r) => r.path.includes('/git/blobs/'));
    expect(blobs).toHaveLength(1);
    expect(second.files['contenido/cursos/c/clases/a/clase.yaml']?.text).toBe('id: a\ntitle: B\n');

    fake.requests.length = 0;
    expect(await loadSnapshot(client, cache, { previous: second })).toBe(second);
    expect(fake.requests).toHaveLength(1);
  });
});

describe('copia de trabajo', () => {
  it('un cambio que vuelve al texto de la rama desaparece', async () => {
    const { client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const path = 'contenido/cursos/c/clases/a/clase.yaml';
    let wc = putFile(emptyWorkingCopy('r'), snapshot, path, 'id: a\ntitle: X\n');
    expect(Object.keys(wc.changes)).toEqual([path]);
    wc = putFile(wc, snapshot, path, 'id: a\ntitle: Á\n');
    expect(wc.changes).toEqual({});
    wc = deleteFile(wc, snapshot, 'contenido/cursos/c/clases/a/laminas/uno.mdx');
    wc = putFile(wc, snapshot, 'contenido/cursos/c/clases/a/laminas/dos.mdx', 'nuevo');
    const files = overlay(snapshotFiles(snapshot), wc);
    expect(files.has('contenido/cursos/c/clases/a/laminas/uno.mdx')).toBe(false);
    expect(files.get('contenido/cursos/c/clases/a/laminas/dos.mdx')).toBe('nuevo');
  });

  it('rebase conserva lo que nadie más tocó y marca conflictos', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    let wc = putFile(
      emptyWorkingCopy('r'),
      snapshot,
      'contenido/cursos/c/clases/a/clase.yaml',
      'id: a\ntitle: Mía\n',
    );
    wc = putFile(wc, snapshot, 'contenido/cursos/c/clases/a/laminas/uno.mdx', 'mía');
    fake.pushExternal({ 'contenido/cursos/c/clases/a/laminas/uno.mdx': 'suya' });
    const next = await loadSnapshot(client, cache, { previous: snapshot });
    wc = rebase(wc, next);
    expect(Object.keys(wc.changes)).toEqual(['contenido/cursos/c/clases/a/clase.yaml']);
    expect(wc.conflicts.map((c) => [c.path, c.theirs])).toEqual([
      ['contenido/cursos/c/clases/a/laminas/uno.mdx', 'suya'],
    ]);
    const mine = resolveConflict(wc, 'contenido/cursos/c/clases/a/laminas/uno.mdx', 'mine');
    expect(mine.conflicts).toEqual([]);
    expect(mine.changes['contenido/cursos/c/clases/a/laminas/uno.mdx']).toMatchObject({
      text: 'mía',
      baseSha: next.files['contenido/cursos/c/clases/a/laminas/uno.mdx']?.sha,
    });
    const theirs = resolveConflict(wc, 'contenido/cursos/c/clases/a/laminas/uno.mdx', 'theirs');
    expect(Object.keys(theirs.changes)).toEqual(['contenido/cursos/c/clases/a/clase.yaml']);
  });
});

describe('guardar', () => {
  it('crea un solo commit con todos los archivos y avanza la rama', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const before = fake.ref;
    let wc = putFile(
      emptyWorkingCopy('r'),
      snapshot,
      'contenido/cursos/c/clases/a/clase.yaml',
      'id: a\ntitle: Nuevo\n',
    );
    wc = deleteFile(wc, snapshot, 'contenido/cursos/c/clases/a/laminas/uno.mdx');
    const result = await saveChanges(client, { snapshot, wc }, {
      message: 'Aula: edita a',
      cache,
    });
    expect(result.kind).toBe('saved');
    expect(fake.headCommit()).toMatchObject({ parent: before, message: 'Aula: edita a' });
    expect(fake.files()['contenido/cursos/c/clases/a/clase.yaml']).toBe('id: a\ntitle: Nuevo\n');
    expect(fake.files()['contenido/cursos/c/clases/a/laminas/uno.mdx']).toBeUndefined();
    expect(fake.files()['README.md']).toBe('Léeme');
    expect(result.wc.changes).toEqual({});
    expect(result.snapshot.commit).toBe(fake.ref);
    expect(result.snapshot.files['contenido/cursos/c/clases/a/clase.yaml']?.text).toBe(
      'id: a\ntitle: Nuevo\n',
    );
  });

  it('si otro dispositivo guardó otro archivo, reintenta sobre su commit', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const wc = putFile(
      emptyWorkingCopy('r'),
      snapshot,
      'contenido/cursos/c/clases/a/clase.yaml',
      'id: a\ntitle: Mía\n',
    );
    fake.beforeUpdateRef = () =>
      fake.pushExternal({ 'contenido/cursos/c/clases/a/laminas/uno.mdx': 'suya' });
    const result = await saveChanges(client, { snapshot, wc }, { message: 'm', cache });
    expect(result.kind).toBe('saved');
    expect(fake.files()['contenido/cursos/c/clases/a/laminas/uno.mdx']).toBe('suya');
    expect(fake.files()['contenido/cursos/c/clases/a/clase.yaml']).toBe('id: a\ntitle: Mía\n');
  });

  it('si el mismo archivo cambió en los dos lados, devuelve el conflicto sin guardar', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const wc = putFile(
      emptyWorkingCopy('r'),
      snapshot,
      'contenido/cursos/c/clases/a/clase.yaml',
      'id: a\ntitle: Mía\n',
    );
    fake.pushExternal({ 'contenido/cursos/c/clases/a/clase.yaml': 'id: a\ntitle: Suya\n' });
    const ref = fake.ref;
    const result = await saveChanges(client, { snapshot, wc }, { message: 'm', cache });
    expect(result.kind).toBe('conflicts');
    expect(fake.ref).toBe(ref);
  });

  it('no guarda si la validación encuentra problemas', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const wc = putFile(emptyWorkingCopy('r'), snapshot, 'contenido/x.yaml', 'x: 1\n');
    const ref = fake.ref;
    const result = await saveChanges(client, { snapshot, wc }, {
      message: 'm',
      cache,
      validate: async (_files, _snapshot, changed) => [
        { path: [...changed][0] ?? '', message: 'mal' },
      ],
    });
    expect(result.kind).toBe('invalid');
    expect(fake.ref).toBe(ref);
  });

  it('sin conexión lanza un error «offline» y no pierde los cambios', async () => {
    const { fake, client, cache } = setup();
    const snapshot = await loadSnapshot(client, cache);
    const wc = putFile(emptyWorkingCopy('r'), snapshot, 'contenido/x.yaml', 'x: 1\n');
    fake.offline = true;
    await expect(
      saveChanges(client, { snapshot, wc }, { message: 'm', cache }),
    ).rejects.toMatchObject({ kind: 'offline' });
    expect(Object.keys(wc.changes)).toEqual(['contenido/x.yaml']);
  });
});
