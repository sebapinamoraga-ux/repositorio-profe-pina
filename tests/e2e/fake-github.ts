import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';
import { readContentFiles } from '../../packages/content-model/src/read-content';
import { FakeGitHub } from '../../packages/content-repo/src/fake-github';

const REPO = 'sebapinamoraga-ux/repositorio-profe-pina';
const TOKEN = 'token-de-prueba';

/** Contenido del repositorio (texto de content/ y rutas de las imágenes versionadas). */
async function repoFiles(): Promise<Record<string, string>> {
  const files = Object.fromEntries(await readContentFiles(resolve('.')));
  const pngs = execFileSync('git', ['ls-files', '-z', '--', 'content/assets/mascotas/png'], {
    encoding: 'utf8',
  });
  for (const path of pngs.split('\0').filter(Boolean)) files[path] = 'png';
  return files;
}

/**
 * Conecta la página a un GitHub en memoria con el contenido del repositorio. Las pruebas
 * nunca escriben en GitHub: cada commit queda en `fake`.
 */
export async function connectFakeGitHub(page: Page, options: { connect?: boolean } = {}) {
  const [owner = '', name = ''] = REPO.split('/');
  const fake = new FakeGitHub({ owner, name, token: TOKEN, files: await repoFiles() });
  await page.route('https://api.github.com/**', async (route) => {
    const request = route.request();
    let response: Response;
    try {
      const body = request.postData();
      response = fake.handle(
        request.method(),
        new URL(request.url()),
        body ? (JSON.parse(body) as unknown) : null,
        (await request.allHeaders()).authorization ?? null,
      );
    } catch {
      await route.abort('internetdisconnected');
      return;
    }
    await route.fulfill({
      status: response.status,
      contentType: 'application/json',
      body: await response.text(),
    });
  });
  if (options.connect !== false)
    await page.addInitScript(
      ([repo, token]) =>
        localStorage.setItem(
          'profe-pina-aula-github',
          JSON.stringify({ repo, branch: 'main', token }),
        ),
      [REPO, TOKEN] as const,
    );
  return fake;
}

export const FAKE_TOKEN = TOKEN;
