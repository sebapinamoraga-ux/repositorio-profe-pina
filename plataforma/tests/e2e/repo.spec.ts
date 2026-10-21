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

const slideTitle = (page: Page) => page.getByLabel('Título de la lámina');

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
  await page.getByRole('button', { name: '+ Paso' }).click();
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
  // El interactivo se elige en la línea de pasos y se abre con «Escribir».
  await page.locator('.timeline-chip', { hasText: 'Gráfico interactivo' }).click();
  await page.getByRole('button', { name: 'Escribir' }).click();
  const form = page.getByRole('group', { name: /^Escribir en/ }).getByRole('group', { name: 'Explorador de la parábola' });
  await form.getByLabel('a inicial').fill('2');
  await page.getByRole('tab', { name: /^Revisión/ }).click();
  await expect(page.getByRole('tabpanel', { name: 'Revisión' })).toContainText('sin problemas');
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
  await expect(page.getByLabel('Lámina R2', { exact: true })).toBeVisible();
  await slideTitle(page).fill('Comprueba la apertura (editada)');
  // Alt + ↑ sube la lámina elegida (el foco vuelve a la lista).
  await repaso.locator('.thumb').nth(1).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(page.getByLabel('Lámina R1', { exact: true })).toBeVisible();

  await repaso.locator('.thumb').nth(3).click();
  await page.getByRole('button', { name: 'Más acciones de la lámina' }).click();
  await page.getByRole('menuitem', { name: 'Eliminar lámina' }).click();
  await expect(repaso.locator('.thumb')).toHaveCount(4);
  await repaso.getByRole('button', { name: 'Nueva lámina de repaso' }).click();
  await page.getByRole('dialog', { name: 'Nueva lámina de repaso' }).locator('.picker-card').first().click();
  await expect(repaso.locator('.thumb')).toHaveCount(5);
  await expect(page.getByLabel('Lámina R5', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Más acciones de la lámina' }).click();
  await page.getByRole('menuitem', { name: /Vista avanzada/ }).click();
  const added = await page.getByLabel('Identificador').inputValue();
  await page.getByRole('button', { name: 'Cerrar la vista avanzada' }).click();
  await page.getByRole('tab', { name: /^Revisión/ }).click();
  await expect(page.getByRole('tabpanel', { name: 'Revisión' })).toContainText('sin problemas');

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

const CUADRATICA = 'contenido/cursos/competencia-matematica-3m/clases/funcion-cuadratica-2';
const cuadratica = (page: Page) =>
  openTeacher(page, 'vista=clase&clase=funcion-cuadratica-2&seccion=laminas');
const thumbOf = (page: Page, title: string) =>
  page.locator('.thumb', { has: page.locator('.thumb-title', { hasText: title }) });

test('arrastrar una lámina a otro tramo cambia clase.yaml en una sola escritura', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await cuadratica(page);
  const before = fake.files()[`${CUADRATICA}/clase.yaml`] ?? '';
  expect(before).toContain('    from: apertura\n    to: precio-optimo\n');
  await expect(page.getByRole('button', { name: /^2\. Volver a la parábola/ })).toBeVisible();

  // «precio-optimo» cierra el primer tramo: soltarla sobre el segundo la pone al comienzo de él.
  await thumbOf(page, 'Para comenzar').dragTo(page.getByRole('button', { name: /^2\. Volver a la parábola/ }));
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const after = fake.files()[`${CUADRATICA}/clase.yaml`] ?? '';
  expect(after).toContain('    from: apertura\n    to: apertura\n');
  expect(after).toContain('    from: precio-optimo\n    to: repaso-a-c-ingreso\n');
  // El orden de las láminas no cambió: solo cambiaron los tramos.
  expect(after.split('\nslides:')[1]).toBe(before.split('\nslides:')[1]);
});

test('un tramo no puede quedar sin láminas y Alt + flechas mueve entre tramos', async ({ page }) => {
  await connectFakeGitHub(page);
  await cuadratica(page);
  // «Cierre» es la única lámina de su tramo.
  await thumbOf(page, '¿Cómo nos vamos hoy?').dragTo(page.getByRole('button', { name: /^8\. Ticket tipo PAES/ }));
  await expect(page.locator('.toast')).toContainText('El tramo «Cierre» quedaría sin láminas');
  await expect(indicator(page)).toHaveText('Al día');

  // Alt + ↑ pasa la primera lámina del segundo tramo al final del primero.
  await page.locator('.thumb').nth(2).click();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(indicator(page)).toHaveText('1 por publicar');
  await page.getByRole('button', { name: 'Últimos cambios' }).click();
  await expect(page.getByRole('dialog', { name: 'Últimos cambios' })).toContainText('al tramo 1');
  await expect(page.getByRole('button', { name: /^1\. Inicio/ })).toContainText('3');
});

test('elegir varias láminas cambia su diseño juntas y Esc las suelta', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await cuadratica(page);
  await page.locator('.thumb').nth(2).click();
  await page.locator('.thumb').nth(3).click({ modifiers: ['Shift'] });
  await page.locator('.thumb').nth(4).click({ modifiers: ['Shift'] });
  const bar = page.getByRole('group', { name: 'Láminas elegidas' });
  await expect(bar).toContainText('3 láminas elegidas');
  await bar.getByLabel('Diseño de las láminas elegidas').selectOption('concepto');
  await expect(page.locator('.toast')).toContainText('Diseño «Concepto» en 3 láminas');
  await expect(indicator(page)).toHaveText('3 por publicar');
  await page.keyboard.press('Escape');
  await expect(bar).toHaveCount(0);
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const layouts = ['repaso-parabola', 'repaso-eje', 'repaso-vertice'].map(
    (id) => fake.files()[`${CUADRATICA}/laminas/${id}.mdx`] ?? '',
  );
  for (const text of layouts) expect(text).toContain('layout: concepto');
});

test('nueva lámina en blanco al final de un tramo y atajos de teclado', async ({ page }) => {
  const fake = await connectFakeGitHub(page);
  await cuadratica(page);
  const before = await page.locator('.thumb').count();
  await page.getByRole('button', { name: 'Lámina en este tramo' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Nueva lámina' });
  await expect(dialog).toContainText('Se agrega en el tramo 1 · Inicio');
  await dialog.getByRole('button', { name: /^Resolución/ }).click();
  await expect(page.locator('.thumb')).toHaveCount(before + 1);
  await expect(page.getByLabel('Título de la lámina')).toHaveValue('Resolución nueva');
  await publish(page);
  await expect(indicator(page)).toHaveText('Publicado');
  const yaml = fake.files()[`${CUADRATICA}/clase.yaml`] ?? '';
  expect(yaml).toContain('    from: apertura\n    to: nueva-resolucion\n');
  expect(fake.files()[`${CUADRATICA}/laminas/nueva-resolucion.mdx`]).toContain('layout: resolucion');

  await page.locator('.thumb').first().focus();
  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toContainText('Mover la lámina');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Atajos de teclado' })).toHaveCount(0);
});
