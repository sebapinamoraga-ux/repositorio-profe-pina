import { test, expect, type Page } from '@playwright/test';
import { connectFakeGitHub } from './fake-github';

const SISTEMAS = 'content/lessons/m1/algebra/sistemas-2x2';
const APERTURA = `${SISTEMAS}/slides/apertura.mdx`;

async function openTeacher(page: Page, hash: string) {
  await page.addInitScript(() => localStorage.setItem('profe-pina-aula-acceso', '1'));
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(`/#rol=docente&${hash}`);
  if (!hash.includes('presentar'))
    await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
}

const slideTitle = (page: Page) =>
  page.locator('.props-grid').getByLabel('Título', { exact: true });

test('si otro dispositivo cambió la misma lámina, se elige qué versión guardar', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=editor');
  await slideTitle(page).fill('Título desde la tablet');
  const theirs = (fake.files()[APERTURA] ?? '').replace(
    "title: 'Sistemas de ecuaciones lineales de 2×2'",
    "title: 'Título desde el computador'",
  );
  fake.pushExternal({ [APERTURA]: theirs });

  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText('Otro dispositivo cambió los mismos archivos.')).toBeVisible();
  await page.getByRole('button', { name: 'Resolver 1 conflicto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Resolver conflictos' });
  await expect(dialog.getByLabel('Diferencias')).toContainText('Título desde el computador');
  await dialog.getByRole('button', { name: 'Conservar mi versión' }).click();
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  expect(fake.files()[APERTURA]).toContain("title: 'Título desde la tablet'");
});

test('sin conexión el guardado espera y se envía al volver la red', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=editor');
  await slideTitle(page).fill('Escrito sin red');
  fake.offline = true;
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText('Sin conexión: se guardará al recuperar la red.')).toBeVisible();
  await page.reload();
  await expect(page.locator('.save-bar')).toContainText('1 cambio sin guardar');
  fake.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  expect(fake.files()[APERTURA]).toContain("title: 'Escrito sin red'");
});

test('una lámina con errores no se guarda', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=editor');
  const ref = fake.ref;
  await page.getByRole('button', { name: 'Más pasos' }).click();
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText('Hay problemas que impiden guardar.')).toBeVisible();
  await expect(page.locator('.save-bar-files')).toContainText('El paso 1 no está definido');
  expect(fake.ref).toBe(ref);
});

test('los parámetros de un interactivo se editan con un formulario', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=presentar&clase=funcion-lineal-afin-2-cuadratica-1');
  await expect(page.locator('.slide')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  await page.locator('.thumb', { hasText: '¿Qué hacen a y c?' }).click();
  const form = page.getByRole('group', { name: 'Explorador de la parábola' });
  await form.getByLabel('a inicial').fill('2');
  await expect(page.locator('.editor-check')).toContainText('sin problemas');
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const file =
    fake.files()['content/lessons/m1/algebra/funcion-lineal-afin-2-cuadratica-1/slides/efecto-a-c.mdx'] ?? '';
  expect(file).toContain('aInicial={2}');
  expect(file).not.toContain('aInicial={1}');
});

test('datos de la clase: publicar un borrador pide confirmación y cambia lesson.yaml', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=biblioteca');
  const row = page.locator('.lesson-row', { hasText: 'Función cuadrática (parte 2)' });
  await row.getByRole('button', { name: /Más acciones/ }).click();
  await row.getByRole('button', { name: 'Datos de la clase' }).click();
  const dialog = page.getByRole('dialog', { name: 'Datos de la clase' });
  await dialog.getByLabel('Duración (minutos)').fill('90');
  await expect(dialog.getByText(/Los tramos suman 80 minutos y la clase declara 90/)).toBeVisible();
  await dialog.getByLabel('Duración (minutos)').fill('80');
  await dialog.getByRole('radio', { name: /Publicada/ }).click();
  await page.getByRole('button', { name: 'Publicar al guardar' }).click();
  await dialog.getByRole('button', { name: 'Listo' }).click();
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const lesson = fake.files()['content/lessons/m1/algebra/funcion-cuadratica-2/lesson.yaml'] ?? '';
  expect(lesson).toContain('status: published');
  expect(lesson).toContain('duration: 80');
});

test('actividades: editar una pregunta PAES y guardarla', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=actividades');
  const before = fake.files()['content/activities/entradas.yaml'] ?? '';
  await page.locator('.lesson-row', { hasText: 'entradas' }).getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog', { name: 'Editar actividad' });
  await dialog.getByLabel('Texto de la alternativa A').fill('');
  await expect(dialog.getByRole('button', { name: 'Aplicar cambios' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await page.locator('.lesson-row', { hasText: 'entradas' }).getByRole('button', { name: 'Editar' }).click();
  const enunciado = dialog.getByLabel('Enunciado');
  await enunciado.fill(`${await enunciado.inputValue()} Justifica.`);
  await dialog.getByRole('button', { name: 'Aplicar cambios' }).click();
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const after = fake.files()['content/activities/entradas.yaml'] ?? '';
  const changed = after.split('\n').filter((line, k) => line !== before.split('\n')[k]);
  expect(changed).toHaveLength(1);
  expect(changed[0]).toMatch(/^prompt: .*Justifica\.'$/);
});
