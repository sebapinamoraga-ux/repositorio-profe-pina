import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const unlock = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('profe-pina-aula-acceso', '1'));

test('la entrada muestra los tres roles y la parte docente pide desbloqueo local', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  const roles = page.locator('.role-card b');
  await expect(roles).toHaveText(['Estudiante', 'Docente', 'Control remoto']);
  const last = await page.locator('.role-card').last().boundingBox();
  expect(last && last.y + last.height).toBeLessThanOrEqual(768);
  await page.getByRole('button', { name: /Docente/ }).click();
  await expect(page.getByRole('heading', { name: 'Entra a tu aula' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar como docente' }).click();
  await expect(page.getByRole('heading', { name: 'Sistemas de ecuaciones lineales' })).toBeVisible();
  await expect(page.getByText('Tramos de la clase')).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/rol=docente&vista=hoy/);
  await expect(page.getByText('Tramos de la clase')).toBeVisible();
});

test('biblioteca: organizar con deshacer y preparar una clase nueva', async ({ page }) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=biblioteca');
  await expect(page.getByRole('heading', { name: 'Tus clases' })).toBeVisible();
  // La prueba crea su propia clase: no depende de la planificación de seed.ts.
  await page.getByRole('button', { name: /^\+ Agregar clase a la unidad/ }).last().click();
  await page.getByLabel('Título de la clase').fill('Clase de prueba');
  await page.getByRole('button', { name: 'Agregar clase', exact: true }).click();
  const row = page.locator('.lesson-row', { hasText: 'Clase de prueba' });
  await expect(row).toContainText('Por preparar');
  await page.getByRole('button', { name: 'Por preparar', exact: true }).click();
  await expect(page.locator('.lesson-row.mark-lista')).toHaveCount(0);
  await page.getByRole('button', { name: 'Todas', exact: true }).click();

  await page.getByRole('button', { name: 'Organizar' }).click();
  await expect(page.getByRole('button', { name: 'Eliminar «Sistemas de ecuaciones lineales»' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Eliminar «Clase de prueba»' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(row).toHaveCount(1);
  await page.getByRole('button', { name: 'Listo' }).click();

  await row.getByRole('button', { name: 'Preparar' }).click();
  await page.getByRole('dialog', { name: 'Preparar clase' }).getByRole('button', { name: 'Crear y abrir en editor' }).click();
  await expect(page).toHaveURL(/vista=editor/);
  await expect(page.locator('.thumb')).toHaveCount(5);
  await page.getByRole('button', { name: 'Clases', exact: true }).or(page.getByRole('button', { name: 'Biblioteca de clases' })).first().click();
  await expect(row).toContainText('En preparación');
});

test('editor: cambiar un título, revisar con content:check y exportar a MDX', async ({ page }) => {
  await unlock(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/#rol=docente&vista=editor');
  await expect(page.locator('.thumb')).toHaveCount(25);
  const objective = page.locator('.field-block', { hasText: 'Objetivo' }).getByRole('textbox').first();
  await objective.fill('Meta de hoy');
  await expect(page.locator('.preview-frame .block-objetivo .block-label')).toHaveText('Meta de hoy');
  await expect(page.locator('.editor-check')).toContainText('sin problemas');

  await page.getByRole('button', { name: 'Más pasos' }).click();
  await expect(page.locator('.editor-check')).toContainText('El paso 1 no está definido');
  await expect(page.getByText(/1 lámina con errores/)).toBeVisible();
  await page.getByRole('button', { name: 'Menos pasos' }).click();
  await expect(page.locator('.editor-check')).toContainText('sin problemas');

  await page.getByRole('button', { name: 'Exportar a MDX' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar ZIP' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sistemas-2x2.zip');
  const path = await download.path();
  if (!path) throw new Error('No se descargó el ZIP');
  const zip = (await readFile(path)).toString('utf8');
  expect(zip).toContain('sistemas-2x2/lesson.yaml');
  expect(zip).toContain('status: published');
  expect(zip).toContain('<Objetivo titulo="Meta de hoy">');

  await page.getByRole('button', { name: 'Restaurar clase original' }).click();
  await expect(page.locator('.preview-frame .block-objetivo .block-label')).toHaveText('Objetivo de clase');
});

test('comentario desde el presentador aparece pendiente en el editor', async ({ page }) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=presentar&clase=sistemas-2x2&slide=signos');
  await expect(page.locator('.slide')).toHaveAttribute('data-slide', 'signos');
  await page.keyboard.press('n');
  await page.getByRole('textbox', { name: 'Comentario' }).fill('Dar más tiempo a los signos.');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByLabel('1 comentario pendiente en esta lámina')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await expect(page.getByText('1 comentario pendiente de clases anteriores')).toBeVisible();
  await page.getByRole('button', { name: 'Revisar en el editor' }).click();
  await page.getByRole('button', { name: /1 comentario pendiente/ }).click();
  await expect(page.locator('.note-item')).toContainText('Dar más tiempo a los signos.');
  await page.getByRole('button', { name: 'Marcar como aplicado' }).click();
  await expect(page.locator('.editor-notes')).toContainText('Todo aplicado');
});

test('control remoto y votación anónima entre pestañas del mismo navegador', async ({
  context,
}) => {
  await context.addInitScript(() => localStorage.setItem('profe-pina-aula-acceso', '1'));
  const presenter = await context.newPage();
  await presenter.goto('/#rol=docente&vista=presentar&clase=sistemas-2x2&slide=apertura');
  await expect(presenter.locator('.slide')).toHaveAttribute('data-slide', 'apertura');

  const remote = await context.newPage();
  await remote.goto('/#rol=remoto');
  await expect(remote.getByText('Conectado')).toBeVisible();
  await remote.getByRole('button', { name: 'Avanzar diapositiva' }).click();
  await expect(presenter.locator('.slide')).toHaveAttribute('data-slide', 'desafio');
  await remote.getByRole('button', { name: 'Índice' }).click();
  await remote.getByRole('button', { name: /22 Ticket/ }).click();
  await expect(presenter.locator('.slide')).toHaveAttribute('data-slide', 'paes');

  await presenter.getByRole('button', { name: 'Votación anónima' }).click();
  await presenter.getByRole('button', { name: 'Abrir votación' }).click();
  const code = (await presenter.locator('.join-code').textContent())?.trim() ?? '';
  expect(code).toMatch(/^\d{4}$/);
  await expect(presenter.getByRole('img', { name: /Código QR/ })).toBeVisible();

  const student = await context.newPage();
  await student.setViewportSize({ width: 390, height: 844 });
  await student.goto(`/#rol=estudiante&codigo=${code}`);
  await student.getByRole('button', { name: 'Entrar' }).click();
  await student.getByRole('button', { name: /^B / }).click();
  await student.getByRole('button', { name: 'Enviar respuesta anónima' }).click();
  await expect(student.getByText(/Respuesta B enviada/)).toBeVisible();
  await expect(presenter.locator('.vote-join')).toContainText('1 respuestas');

  await student.getByRole('button', { name: 'Cambiar respuesta' }).click();
  await student.getByRole('button', { name: /^A / }).click();
  await student.getByRole('button', { name: 'Reemplazar mi respuesta' }).click();
  await expect(presenter.locator('.vote-join')).toContainText('1 respuestas');
  await expect(presenter.locator('.vote-row').first()).toContainText('1 · 100%');

  await presenter.getByRole('button', { name: 'Cerrar votación' }).click();
  await expect(student.getByText('La votación ya está cerrada.')).toBeVisible();
});

test('repaso del estudiante: lectura al ancho, solución plegada y tema', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#rol=estudiante');
  await expect(page.locator('.slide')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Sistemas de ecuaciones lineales de 2×2',
  );
  await page.getByRole('button', { name: 'Índice de láminas' }).click();
  await page.getByRole('button', { name: /22 Ticket/ }).click();
  await page.getByRole('button', { name: /^B / }).click();
  await expect(page.getByText('¡Correcto! Elegiste B.')).toBeVisible();
  await page.getByRole('button', { name: 'Siguiente lámina' }).click();
  await expect(page.getByRole('button', { name: 'Ver solución' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver solución' }).click();
  await expect(page.locator('.read-step').first()).toBeVisible();
  await page.getByRole('button', { name: 'Apariencia' }).click();
  await page.getByRole('radio', { name: /Oscuro/ }).click();
  await expect(page.locator('.student')).toHaveCSS('background-color', 'rgb(20, 28, 48)');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
});

test('cursos: iniciar y cerrar una sesión deja historial y comentario de cierre', async ({
  page,
}) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=cursos');
  await page.getByRole('button', { name: 'Iniciar clase' }).first().click();
  await expect(page).toHaveURL(/vista=presentar/);
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await page.getByRole('button', { name: 'Cursos e historial' }).click();
  await page.getByLabel('Observación posterior').fill('Llegamos a la lámina 16.');
  await page.getByRole('textbox', { name: /¿Qué mejorarías\?/ }).fill('Acortar la comparación.');
  await page.getByRole('button', { name: 'Terminar y registrar' }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('3° Medio A');
  await page.getByRole('button', { name: 'Clase de hoy' }).click();
  await expect(page.getByText('Acortar la comparación.')).toBeVisible();
});

test('biblioteca: actualizar desde el repositorio recupera una clase quitada', async ({ page }) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=biblioteca');
  const title = 'Función lineal y afín (parte 1)';
  const row = page.locator('.lesson-row', { hasText: title });
  await expect(row).toHaveCount(1);
  await page.getByRole('button', { name: 'Organizar' }).click();
  await page.getByRole('button', { name: `Eliminar «${title}»` }).click();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(row).toHaveCount(0);
  await page.getByRole('button', { name: 'Actualizar desde el repositorio' }).click();
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(row).toHaveCount(1);
  await page.reload();
  await expect(row).toHaveCount(1);
});
