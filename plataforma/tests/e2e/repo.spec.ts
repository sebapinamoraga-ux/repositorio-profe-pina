import { test, expect, type Page } from '@playwright/test';
import { connectFakeGitHub } from './fake-github';

const SISTEMAS = 'contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2';
const APERTURA = `${SISTEMAS}/laminas/apertura.mdx`;

async function openTeacher(page: Page, hash: string) {
  await page.addInitScript(() => localStorage.setItem('profe-pina-aula-acceso', '1'));
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(`/#rol=docente&${hash}`);
  if (!hash.includes('presentar'))
    await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
}

/** En la vista Clase el estado de publicación vive en el encabezado, no en la franja. */
const indicator = (page: Page) => page.locator('.pub');
async function openPublish(page: Page) {
  if (!(await page.getByRole('dialog', { name: 'Publicación de la clase' }).isVisible()))
    await indicator(page).click();
}
async function publish(page: Page) {
  await openPublish(page);
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
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

  await publish(page);
  await expect(indicator(page)).toHaveText('Hay un conflicto');
  await page.getByRole('button', { name: 'Resolver 1 conflicto' }).click();
  const dialog = page.getByRole('dialog', { name: 'Resolver conflictos' });
  await expect(dialog.getByLabel('Diferencias')).toContainText('Título desde el computador');
  await dialog.getByRole('button', { name: 'Conservar mi versión' }).click();
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  expect(fake.files()[APERTURA]).toContain("title: 'Título desde la tablet'");
});

test('sin conexión el guardado espera y se envía al volver la red', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=editor');
  await slideTitle(page).fill('Escrito sin red');
  fake.offline = true;
  await publish(page);
  await expect(indicator(page)).toHaveText('Sin conexión · se publicará al volver');
  await expect(page.getByText('Sin conexión: se publicará al recuperar la red.')).toBeVisible();
  await page.reload();
  await expect(indicator(page)).toHaveText('1 por publicar');
  fake.offline = false;
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  expect(fake.files()[APERTURA]).toContain("title: 'Escrito sin red'");
});

test('una lámina con errores no se guarda', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=editor');
  const ref = fake.ref;
  await page.getByRole('button', { name: 'Más pasos' }).click();
  await publish(page);
  await expect(indicator(page)).toHaveText('No se puede publicar');
  await expect(page.getByText('Hay problemas que impiden publicar')).toBeVisible();
  await expect(page.locator('.pub-problems')).toContainText('El paso 1 no está definido');
  expect(fake.ref).toBe(ref);
});

test('los parámetros de un interactivo se editan con un formulario', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=presentar&clase=funcion-lineal-afin-2-cuadratica-1');
  await expect(page.locator('.slide')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await page.getByRole('button', { name: /^Láminas/ }).click();
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  await page.locator('.thumb', { hasText: '¿Qué hacen a y c?' }).click();
  const form = page.getByRole('group', { name: 'Explorador de la parábola' });
  await form.getByLabel('a inicial').fill('2');
  await expect(page.locator('.editor-check')).toContainText('sin problemas');
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const file =
    fake.files()['contenido/cursos/competencia-matematica-3m/clases/funcion-lineal-afin-2-cuadratica-1/laminas/efecto-a-c.mdx'] ?? '';
  expect(file).toContain('aInicial={2}');
  expect(file).not.toContain('aInicial={1}');
});

test('datos de la clase: publicar un borrador pide confirmación y cambia clase.yaml', async ({ page }) => {
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
  // Una clase publicada necesita su guía pedagógica completa.
  await expect(page.getByText('Completa en la guía: Evidencia, Errores esperados.')).toBeVisible();
  await page.goto('/#rol=docente&vista=clase&clase=funcion-cuadratica-2&seccion=resumen');
  const guide = page.getByRole('region', { name: 'Guía pedagógica' });
  await guide.getByRole('button', { name: 'Editar la guía' }).click();
  await guide.getByLabel(/^Evidencia/).fill('Ticket tipo PAES sobre el vértice.');
  await guide.getByLabel(/^Errores esperados/).fill('Confundir el signo de b al calcular el vértice.');
  await guide.getByRole('button', { name: 'Aplicar' }).click();
  await expect(guide.getByText('Ticket tipo PAES sobre el vértice.')).toBeVisible();
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const dir = 'contenido/cursos/competencia-matematica-3m/clases/funcion-cuadratica-2';
  const lesson = fake.files()[`${dir}/clase.yaml`] ?? '';
  expect(lesson).toContain('status: published');
  expect(lesson).toContain('duration: 80');
  expect(fake.files()[`${dir}/guia.md`]).toContain('## Evidencia\n\nTicket tipo PAES sobre el vértice.');
});

test('actividades: editar una pregunta PAES y guardarla', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=actividades');
  const before = fake.files()['contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2/actividades/entradas.yaml'] ?? '';
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
  const after = fake.files()['contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2/actividades/entradas.yaml'] ?? '';
  const changed = after.split('\n').filter((line, k) => line !== before.split('\n')[k]);
  expect(changed).toHaveLength(1);
  expect(changed[0]).toMatch(/^prompt: .*Justifica\.'$/);
});

test('repaso del estudiante: editar, reordenar, agregar y quitar sin tocar la clase', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  const dir = 'contenido/cursos/competencia-matematica-3m/clases/funcion-cuadratica-2';
  const before = fake.files()[`${dir}/clase.yaml`] ?? '';
  await openTeacher(page, 'vista=presentar&clase=funcion-cuadratica-2');
  await expect(page.locator('.slide')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await page.getByRole('button', { name: /^Repaso/ }).click();
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');

  const repaso = page.getByRole('complementary', { name: 'Láminas del repaso' });
  await expect(repaso.locator('.thumb')).toHaveCount(5);
  await repaso.locator('.thumb').nth(1).click();
  await expect(page.getByRole('heading', { name: 'Lámina de repaso R2' })).toBeVisible();
  await slideTitle(page).fill('Comprueba la apertura (editada)');
  await page.getByRole('button', { name: 'Mover antes' }).click();
  await expect(page.getByRole('heading', { name: 'Lámina de repaso R1' })).toBeVisible();

  await repaso.locator('.thumb').nth(3).click();
  await page.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(repaso.locator('.thumb')).toHaveCount(4);
  await repaso.getByRole('button', { name: '+ Lámina de repaso' }).click();
  await page.getByRole('dialog', { name: 'Elegir plantilla' }).locator('.picker-card').first().click();
  await expect(repaso.locator('.thumb')).toHaveCount(5);
  await expect(page.getByRole('heading', { name: 'Lámina de repaso R5' })).toBeVisible();
  const added = await page.locator('.props-grid').getByLabel('Identificador').inputValue();
  await expect(page.locator('.editor-check')).toContainText('sin problemas');

  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const files = fake.files();
  const lesson = files[`${dir}/clase.yaml`] ?? '';
  // slides y tramos quedan igual: solo cambia la lista `repaso`, al final del archivo.
  expect(lesson.split('\nrepaso:')[0]).toBe(before.split('\nrepaso:')[0]);
  expect(lesson).toContain(
    `repaso:\n  - comprueba-apertura.mdx\n  - explorar-a-c.mdx\n  - explorar-b.mdx\n  - ticket-paes-discriminante.mdx\n  - ${added}.mdx\n`,
  );
  expect(files[`${dir}/laminas/comprueba-apertura.mdx`]).toContain('Comprueba la apertura (editada)');
  expect(files[`${dir}/laminas/comprueba-b-vertice.mdx`]).toBeUndefined();
  expect(files[`${dir}/laminas/${added}.mdx`]).toBeDefined();
});

test('la fecha de una clase se edita en Clases y se guarda en la planificación', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await openTeacher(page, 'vista=clases');
  const row = page.locator('.lesson-row', { hasText: 'Función cuadrática (parte 2)' });
  await expect(row.locator('.date-chip')).toBeVisible();
  await row.getByRole('button', { name: /^Más acciones/ }).click();
  await page.getByRole('button', { name: 'Editar título, objetivo y fecha' }).click();
  // En edición el título es un campo: la fila se busca por el campo de fecha.
  const date = page.getByLabel('Fecha de la clase');
  // Cada día tiene una sola clase: una fecha ocupada no se aplica.
  await date.fill('2026-10-17');
  await expect(page.locator('.toast')).toContainText('Ese día ya está planificada');
  await expect(date).toHaveValue('2026-10-24');
  await date.fill('2026-10-31');
  await page.locator('.lesson-row', { has: date }).getByRole('button', { name: 'Listo' }).click();
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const plan = fake.files()['contenido/cursos/competencia-matematica-3m/curso.yaml'] ?? '';
  expect(plan).toContain('      - id: funcion-cuadratica-2\n        date: 2026-10-31\n');
});
