import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { connectFakeGitHub } from './fake-github';

const unlock = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('profe-pina-aula-acceso', '1'));

test('la entrada muestra los tres roles y la parte docente pide desbloqueo local', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  // La clase actual sale de las fechas de la planificación: se fija el día.
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00'));
  await page.goto('/');
  const roles = page.locator('.role-card b');
  await expect(roles).toHaveText(['Estudiante', 'Docente', 'Control remoto']);
  const last = await page.locator('.role-card').last().boundingBox();
  expect(last && last.y + last.height).toBeLessThanOrEqual(768);
  await page.getByRole('button', { name: /Docente/ }).click();
  await expect(page.getByRole('heading', { name: 'Entra a tu aula' })).toBeVisible();
  await page.getByRole('button', { name: 'Entrar como docente' }).click();
  // La entrada docente es Clases, con la próxima clase del calendario a un toque.
  const next = page.getByRole('region', { name: 'Próxima clase' });
  await expect(next.getByRole('heading', { name: /^Función lineal y afín \(parte 2\)/ })).toBeVisible();
  await expect(next).toContainText('sábado, 17 de octubre');
  await page.reload();
  await expect(page).toHaveURL(/rol=docente&vista=clases$/);
  await next.getByRole('button', { name: 'Abrir la clase' }).click();
  await expect(page).toHaveURL(
    /rol=docente&vista=clase&clase=funcion-lineal-afin-2-cuadratica-1&seccion=resumen$/,
  );
  await expect(page.getByText('Tramos de la clase')).toBeVisible();
});

test('biblioteca: organizar con deshacer y preparar una clase nueva', async ({ page }) => {
  await unlock(page);
  const fake = await connectFakeGitHub(page);
  await page.goto('/#rol=docente&vista=biblioteca');
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
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
  await expect(page).toHaveURL(/vista=clase&clase=clase-de-prueba&seccion=laminas/);
  await expect(page.locator('.thumb')).toHaveCount(5);
  await page.getByRole('button', { name: 'Clases', exact: true }).click();
  await expect(row).toContainText('En preparación');

  // Todo queda en un solo commit: la planificación y la carpeta de la clase nueva.
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const files = fake.files();
  expect(files['contenido/cursos/competencia-matematica-3m/clases/clase-de-prueba/clase.yaml']).toContain('status: draft');
  expect(
    Object.keys(files).filter((p) => p.startsWith('contenido/cursos/competencia-matematica-3m/clases/clase-de-prueba/laminas/')),
  ).toHaveLength(5);
  expect(files['contenido/cursos/competencia-matematica-3m/curso.yaml']).toContain('- id: clase-de-prueba');
  expect(fake.headCommit()?.message).toMatch(/^Aula: /);
});

test('bibliotecas: crear una y copiarle una clase de otra', async ({ page }) => {
  await unlock(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  const fake = await connectFakeGitHub(page);
  await page.goto('/#rol=docente&vista=clases');
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  const bar = page.getByRole('group', { name: 'Biblioteca' });
  await expect(bar.getByRole('button', { name: 'Competencia Matemática 3° medio' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await bar.getByRole('button', { name: '+ Nueva biblioteca' }).click();
  await page.getByLabel(/Nombre de la biblioteca/).fill('Canal de YouTube');
  await page.getByRole('button', { name: 'Crear biblioteca' }).click();
  await expect(page).toHaveURL(/vista=clases&biblioteca=canal-de-youtube$/);
  await expect(page.getByText('Clases · Canal de YouTube')).toBeVisible();
  await expect(page.locator('.lesson-row')).toHaveCount(0);

  await bar.getByRole('button', { name: 'Competencia Matemática 3° medio' }).click();
  const source = page.locator('.lesson-row', { hasText: 'Función lineal y afín (parte 2)' });
  await source.getByRole('button', { name: /^Más acciones/ }).click();
  await source.getByRole('button', { name: 'Copiar a otra biblioteca' }).click();
  const dialog = page.getByRole('dialog', { name: 'Copiar a otra biblioteca' });
  await expect(dialog.getByLabel('Biblioteca de destino')).toHaveValue('canal-de-youtube');
  await page.screenshot({ path: 'output/e2e/bibliotecas-copiar.png' });
  await dialog.getByRole('button', { name: 'Copiar clase' }).click();
  await expect(page).toHaveURL(/biblioteca=canal-de-youtube$/);
  const copy = page.locator('.lesson-row', { hasText: 'Función lineal y afín (parte 2)' });
  await expect(copy).toHaveCount(1);
  await expect(copy).toContainText('En preparación');
  await expect(page.getByRole('region', { name: /Unidad 1 · Funciones/ })).toBeVisible();
  await page.screenshot({ path: 'output/e2e/bibliotecas-copia.png' });

  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const files = fake.files();
  expect(files['contenido/cursos/canal-de-youtube/curso.yaml']).toContain('title: Canal de YouTube');
  expect(files['contenido/cursos/canal-de-youtube/curso.yaml']).toContain(
    '- id: funcion-lineal-afin-2-cuadratica-1-canal-de-youtube',
  );
  const lesson =
    files['contenido/cursos/canal-de-youtube/clases/funcion-lineal-afin-2-cuadratica-1-canal-de-youtube/clase.yaml'];
  expect(lesson).toContain('status: draft');
  expect(lesson).toContain('repaso:');
});

test('bibliotecas del canal: sus fechas de publicación no son la clase del día', async ({ page }) => {
  await unlock(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  // El 5 de noviembre el curso ya no tiene clases por delante y el canal sí tiene videos.
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00'));
  const fake = await connectFakeGitHub(page);
  await page.goto('/#rol=docente&vista=clases&biblioteca=m1-2027');
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  await expect(page.getByRole('region', { name: 'Última clase abierta' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Próxima clase' })).toHaveCount(0);
  await expect(page.locator('.today-card')).not.toContainText('PAES');

  // Dentro de su biblioteca, la tarjeta muestra la próxima publicación; la fecha corta lleva el año.
  const bar = page.getByRole('group', { name: 'Biblioteca' });
  await bar.getByRole('button', { name: 'PAES Matemática M1' }).click();
  const next = page.getByRole('region', { name: 'Próxima publicación' });
  await expect(next).toContainText('PAES Matemática M1');
  await expect(next).toContainText('martes, 10 de noviembre');
  await expect(page.locator('.date-chip', { hasText: 'mar, 2 mar 2027' })).toBeVisible();
  await page.screenshot({ path: 'output/e2e/biblioteca-publicacion.png' });

  // En Organizar se desmarca: sus fechas vuelven a contar como clases.
  await page.getByRole('button', { name: 'Organizar' }).click();
  const publication = page.getByLabel(/Fechas de publicación/);
  await expect(publication).toBeChecked();
  await page.screenshot({ path: 'output/e2e/biblioteca-publicacion-organizar.png' });
  await publication.uncheck();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.getByRole('region', { name: 'Próxima clase' })).toContainText(
    'martes, 10 de noviembre',
  );
  await page.getByRole('button', { name: 'Guardar en el repositorio' }).click();
  await expect(page.getByText(/Guardado en GitHub/)).toBeVisible();
  const saved = fake.files()['contenido/youtube/paes-m1/curso.yaml'];
  expect(saved).toContain('title: PAES Matemática M1');
  expect(saved).not.toContain('calendario: publicacion');
});

test('la clase viaja en la URL: pestañas, enlaces directos, Atrás del navegador y clase desconocida', async ({
  page,
}) => {
  await unlock(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  // Un enlace anterior al espacio de la clase abre la pestaña equivalente.
  await page.goto('/#rol=docente&vista=editor&clase=funcion-cuadratica-2');
  await expect(page).toHaveURL(/vista=clase&clase=funcion-cuadratica-2&seccion=laminas$/);
  await expect(page.locator('.ws-head h1')).toHaveText('Función cuadrática (parte 2)');
  // La lámina elegida viaja en la URL; las pestañas conservan la clase; Atrás vuelve.
  await page.locator('.thumb').nth(2).click();
  await expect(page).toHaveURL(/seccion=laminas&slide=[a-z0-9-]+$/);
  const withSlide = page.url();
  await page.getByRole('navigation', { name: 'Secciones de la clase' }).getByRole('button', { name: 'PDF' }).click();
  await expect(page).toHaveURL(/vista=clase&clase=funcion-cuadratica-2&seccion=pdf$/);
  await page.goBack();
  await expect(page).toHaveURL(withSlide);
  await expect(page.locator('.thumb').nth(2)).toHaveAttribute('aria-current', 'true');
  // Sin clase en el enlace se abre la última; una vista sin clase no la lleva.
  await page.goto('/#rol=docente&vista=clase');
  await expect(page).toHaveURL(/vista=clase&clase=funcion-cuadratica-2&seccion=resumen$/);
  await page.getByRole('button', { name: 'Clases', exact: true }).click();
  await expect(page).toHaveURL(/vista=clases$/);
  await expect(page.locator('.lesson-row', { hasText: 'Función cuadrática (parte 2)' })).toContainText(
    'Última abierta',
  );
  // Una clase que no existe se reemplaza por la última abierta y se avisa.
  await page.goto('/#rol=docente&vista=clase&clase=no-existe&seccion=revision');
  await expect(page.locator('.toast')).toContainText('No se encontró la clase «no-existe»');
  await expect(page).toHaveURL(/vista=clase&clase=funcion-cuadratica-2&seccion=revision$/);
});

test('editor: cambiar un título, revisar con content:check y descargar la copia ZIP', async ({ page }) => {
  await unlock(page);
  await connectFakeGitHub(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/#rol=docente&vista=editor');
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  await expect(page.locator('.thumb')).toHaveCount(25);
  // Se edita sobre la lámina: clic en el bloque, Enter y sus campos.
  await page.locator('.canvas-frame .block-objetivo').click();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('group', { name: /^Escribir en «Objetivo/ });
  await editor.getByLabel('Título').fill('Meta de hoy');
  await expect(page.locator('.canvas-frame > .fit-slide .block-objetivo .block-label')).toHaveText('Meta de hoy');
  await page.getByRole('tab', { name: /^Revisión/ }).click();
  const review = page.getByRole('tabpanel', { name: 'Revisión' });
  await expect(review).toContainText('sin problemas');

  await page.getByRole('button', { name: '+ Paso' }).click();
  await expect(review).toContainText('El paso 1 no está definido');
  await expect(page.getByText(/1 lámina con errores/)).toBeVisible();
  await page.getByRole('button', { name: 'Quitar paso 1' }).click();
  await expect(review).toContainText('sin problemas');

  await expect(page.locator('.pub')).toHaveText('1 por publicar');
  await page.getByRole('button', { name: 'Más opciones de la clase' }).click();
  await page.getByRole('menuitem', { name: 'Descargar copia ZIP' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar ZIP' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('sistemas-2x2.zip');
  const path = await download.path();
  if (!path) throw new Error('No se descargó el ZIP');
  const zip = (await readFile(path)).toString('utf8');
  expect(zip).toContain('sistemas-2x2/clase.yaml');
  expect(zip).toContain('sistemas-2x2/guia.md');
  expect(zip).toContain('status: published');
  expect(zip).toContain('<Objetivo titulo="Meta de hoy">');

  await page.getByRole('button', { name: 'Más acciones de la lámina' }).click();
  await page.getByRole('menuitem', { name: /Vista avanzada/ }).click();
  await page.getByRole('button', { name: 'Descartar cambios de esta clase' }).click();
  await expect(page.locator('.canvas-frame > .fit-slide .block-objetivo .block-label')).toHaveText('Objetivo de clase');
  await expect(page.locator('.pub')).toHaveText('Al día');
});

test('comentario desde el presentador aparece pendiente en Revisión y junto a su lámina', async ({ page }) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=presentar&clase=sistemas-2x2&slide=signos');
  await expect(page.locator('.slide')).toHaveAttribute('data-slide', 'signos');
  await page.keyboard.press('n');
  await page.getByRole('textbox', { name: 'Comentario' }).fill('Dar más tiempo a los signos.');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByLabel('1 comentario pendiente en esta lámina')).toBeVisible();
  await page.getByRole('button', { name: 'Salir de la presentación' }).click();
  await expect(page.getByText('1 comentario pendiente de clases anteriores')).toBeVisible();
  await page.getByRole('button', { name: 'Ver en Revisión' }).click();
  await expect(page).toHaveURL(/seccion=revision$/);
  const notes = page.getByRole('region', { name: 'Comentarios para mejorar la clase' });
  await expect(notes.locator('.note-item')).toContainText('Dar más tiempo a los signos.');
  // El enlace del comentario abre su lámina en el editor.
  await notes.getByRole('button', { name: /^Lámina \d+ «/ }).click();
  await expect(page).toHaveURL(/seccion=laminas&slide=signos$/);
  // En un editor angosto el panel de comentarios y revisión se abre aparte.
  await page.getByRole('button', { name: 'Comentarios y revisión' }).click();
  const panel = page.getByRole('tabpanel', { name: 'Comentarios' });
  await expect(panel.locator('.note-item')).toContainText('Dar más tiempo a los signos.');
  await page.getByRole('button', { name: 'Marcar como aplicado' }).click();
  await expect(panel.locator('.note-item')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Ver 1 aplicado' })).toBeVisible();
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

test('repaso del estudiante: el enlace abre la clase indicada y la URL la sigue', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#rol=estudiante&clase=funcion-cuadratica-2');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Función cuadrática (parte 2)',
  );
  await expect(page).toHaveURL(/clase=funcion-cuadratica-2/);
  await page.getByRole('button', { name: 'Índice de láminas' }).click();
  await page.getByRole('combobox', { name: 'Clase' }).selectOption('sistemas-2x2');
  await expect(page).toHaveURL(/clase=sistemas-2x2/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Sistemas de ecuaciones lineales de 2×2',
  );
});

test('repaso del estudiante: láminas para seguir explorando con control de b', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#rol=estudiante');
  await page.getByRole('button', { name: 'Índice de láminas' }).click();
  await page.getByRole('combobox', { name: 'Clase' }).selectOption('funcion-cuadratica-2');
  await page.getByRole('button', { name: 'Índice de láminas' }).click();
  await expect(page.getByRole('heading', { name: 'Para seguir explorando' })).toBeVisible();
  await page.getByRole('button', { name: /35 Explora b y el vértice/ }).click();
  await expect(page.locator('.s-eyebrow')).toContainText('Para seguir explorando');
  const caption = page.locator('.graph-caption-primary');
  await expect(caption).toHaveText('y = x²');
  await page.getByRole('slider', { name: 'Coeficiente b' }).fill('2');
  await expect(caption).toHaveText('y = x² + 2x');
  await expect(page.locator('.graph-vertex-label')).toHaveText('V(-1; -1)');
  await page.getByRole('button', { name: 'Restablecer' }).click();
  await expect(caption).toHaveText('y = x²');
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
  // La sesión en curso se ve en todas las pantallas y se cierra desde su barra.
  const bar = page.getByRole('region', { name: 'Clase en curso' }).first();
  await expect(bar).toContainText('3° Medio A');
  await page.getByRole('button', { name: 'Recursos', exact: true }).click();
  await expect(bar).toBeVisible();
  await bar.getByRole('button', { name: 'Cerrar sesión' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cerrar la sesión' });
  await dialog.getByLabel('Observación posterior').fill('Llegamos a la lámina 16.');
  await dialog.getByRole('textbox', { name: /¿Qué mejorarías\?/ }).fill('Acortar la comparación.');
  await dialog.getByRole('button', { name: 'Terminar y registrar' }).click();
  await expect(page.getByRole('region', { name: 'Clase en curso' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cursos', exact: true }).click();
  await expect(page.locator('.history-row')).toHaveCount(1);
  await expect(page.locator('.history-row')).toContainText('3° Medio A');
  await page.getByRole('button', { name: 'Clases', exact: true }).click();
  await page.locator('.today-card').getByRole('button', { name: 'Abrir la clase' }).click();
  await expect(page.getByText('Acortar la comparación.')).toBeVisible();
});

test('cursos: un curso vinculado a una biblioteca parte de sus clases', async ({ page }) => {
  await unlock(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00'));
  await page.goto('/#rol=docente&vista=cursos');
  // En edición el nombre está en un campo: se ubica la tarjeta por su posición.
  const card = page.locator('.course-card').nth(1);
  await expect(card).toContainText('3° Medio B');
  await expect(card).toContainText('Biblioteca Sin biblioteca');
  await card.getByRole('button', { name: 'Editar' }).click();
  await card.getByLabel('Biblioteca').selectOption({ label: 'Competencia Matemática 3° medio' });
  await card.getByRole('button', { name: 'Listo' }).click();
  await expect(card).toContainText('Biblioteca Competencia Matemática 3° medio');
  await expect(card).toContainText(
    '«Iniciar clase» proyecta «Función lineal y afín (parte 2) y función cuadrática (parte 1)», la próxima clase de su biblioteca.',
  );
  await page.screenshot({ path: 'output/e2e/cursos-biblioteca.png' });

  // El vínculo es privado: queda en este navegador y sobrevive a recargar.
  await page.reload();
  await card.getByRole('button', { name: 'Ver sus clases' }).click();
  await expect(page).toHaveURL(/vista=clases&biblioteca=m1-2027$/);
  await expect(page.getByText('Clases · Competencia Matemática 3° medio')).toBeVisible();

  // Un curso nuevo puede nacer vinculado; desde la clase se propone el curso de su biblioteca.
  await page.getByRole('button', { name: 'Cursos', exact: true }).click();
  const form = page.locator('.course-new');
  await form.getByLabel('Nombre').fill('Electivo');
  await form.getByLabel('Biblioteca').selectOption({ label: 'Competencia Matemática 3° medio' });
  await form.getByRole('button', { name: 'Agregar curso' }).click();
  await expect(page.locator('.course-card', { hasText: 'Electivo' })).toContainText(
    'Biblioteca Competencia Matemática 3° medio',
  );
  await page.goto('/#rol=docente&vista=clase&clase=funcion-lineal-afin-2-cuadratica-1&seccion=resumen');
  await expect(page.getByLabel('Curso')).toHaveValue('c2');

  await page.goto('/#rol=docente&vista=cursos');
  await card.getByRole('button', { name: 'Iniciar clase' }).click();
  await expect(page).toHaveURL(/vista=presentar&clase=funcion-lineal-afin-2-cuadratica-1/);
  const stored = await page.evaluate(() => localStorage.getItem('profe-pina-aula-v1') ?? '');
  expect(stored).toContain('"biblioteca":"m1-2027"');
});

test('sin conexión con GitHub la biblioteca es de solo lectura y explica cómo conectar', async ({ page }) => {
  await unlock(page);
  await page.goto('/#rol=docente&vista=biblioteca');
  await expect(page.locator('.lesson-row', { hasText: 'Función lineal y afín (parte 1)' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Organizar' })).toHaveCount(0);
  // Un único aviso de solo lectura, que lleva a Ajustes.
  const strip = page.locator('.connection-strip');
  await expect(strip).toContainText(/conecta la app con GitHub/);
  await strip.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page).toHaveURL(/vista=ajustes$/);
  await expect(page.getByRole('heading', { name: 'Contenido en GitHub' })).toBeVisible();
});

test('encabezado de la clase: deshacer, publicar desde el indicador, buscar y presentar', async ({ page }) => {
  await unlock(page);
  await connectFakeGitHub(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto('/#rol=docente&vista=editor');
  await expect(page.locator('.save-pill').first()).toHaveText('Al día con GitHub');
  const title = page.getByLabel('Título de la lámina');
  const original = await title.inputValue();
  await expect(page.getByRole('button', { name: 'Deshacer' })).toBeDisabled();

  // Un cambio: el indicador pide publicar, no hay franja de guardado y se puede deshacer.
  await title.fill('Título de prueba');
  await expect(page.locator('.pub')).toHaveText('1 por publicar');
  await expect(page.locator('.save-bar')).toHaveCount(0);
  await page.locator('.pub').click();
  await expect(page.getByText('1 archivo cambiado')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('1 archivo cambiado')).toHaveCount(0);
  await page.getByRole('button', { name: 'Últimos cambios' }).click();
  await expect(page.getByRole('dialog', { name: 'Últimos cambios' })).toContainText('Cambió el título de la lámina');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(title).toHaveValue(original);
  await expect(page.locator('.pub')).toHaveText('Al día');

  // Ctrl + Z deshace fuera de los campos.
  await title.fill('Otro título');
  await page.locator('.ws-title h1').click();
  await page.keyboard.press('Control+z');
  await expect(title).toHaveValue(original);

  // Buscar: sin acentos ni mayúsculas; Enter va a la lámina.
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Buscar en la clase' });
  await search.getByRole('textbox', { name: 'Buscar en la clase' }).fill('INTERSECCION');
  await expect(search.getByRole('option').first()).toContainText('El mismo par es la intersección de las rectas');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/slide=grafico/);
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Buscar en la clase' }).fill('zzzzqq');
  await expect(page.getByText('No hay coincidencias para «zzzzqq».')).toBeVisible();
  await page.keyboard.press('Escape');

  // Menús: ⋯ de la clase y Presentar.
  await page.getByRole('button', { name: 'Más opciones de la clase' }).click();
  await expect(page.getByRole('menuitem', { name: /Datos de la clase/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Otras formas de presentar' }).click();
  await expect(page.getByRole('menuitem', { name: /Pantalla completa/ })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /Recorrer los pasos aquí/ })).toBeEnabled();
  await page.getByRole('menuitem', { name: /Pantalla completa/ }).click();
  await expect(page).toHaveURL(/vista=presentar.*slide=grafico/);
});
