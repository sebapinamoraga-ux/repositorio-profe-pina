import { test, expect, type Page } from '@playwright/test';
import { connectFakeGitHub } from './fake-github';

const SISTEMAS =
  'contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2';

async function open(page: Page, slide: string) {
  await page.addInitScript(() =>
    localStorage.setItem('profe-pina-aula-acceso', '1'),
  );
  const fake = await connectFakeGitHub(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(
    `/#rol=docente&vista=clase&clase=sistemas-2x2&seccion=laminas&slide=${slide}`,
  );
  await expect(page.locator('.save-pill').first()).toHaveText(
    'Al día con GitHub',
  );
  await expect(page.locator('.canvas-frame .slide')).toBeVisible();
  return fake;
}
const canvas = (page: Page) => page.locator('.canvas-frame > .fit-slide');
const indicator = (page: Page) => page.locator('.pub');
async function publish(page: Page) {
  if (
    !(await page
      .getByRole('dialog', { name: 'Publicación de la clase' })
      .isVisible())
  )
    await indicator(page).click();
  await page.getByRole('button', { name: 'Publicar', exact: true }).click();
  await expect(indicator(page)).toHaveText('Publicado');
}

test('escribir sobre un bloque, ver cómo queda y publicar', async ({
  page,
}) => {
  const fake = await open(page, 'apertura');
  await canvas(page).locator('.block-objetivo').click();
  await expect(
    page.getByRole('toolbar', { name: /^Bloque «Objetivo/ }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Escribir', exact: true }).click();
  const editor = page.getByRole('group', { name: /^Escribir en «Objetivo/ });
  const text = editor.locator('textarea').first();
  await text.fill('Resolver sistemas con dos métodos $x+y=3$.');
  await expect(editor.locator('.inline-preview')).toContainText(
    'Resolver sistemas con',
  );
  await expect(canvas(page).locator('.block-objetivo')).toContainText(
    'Resolver sistemas con',
  );
  // El formato B envuelve lo seleccionado.
  await text.focus();
  await text.press('Control+a');
  await text.press('Control+b');
  await expect(text).toHaveValue(/^\*\*Resolver/);
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await publish(page);
  expect(fake.files()[`${SISTEMAS}/laminas/apertura.mdx`]).toContain(
    '**Resolver sistemas con dos métodos $x+y=3$.**',
  );
});

test('insertar una fórmula con error, ver el aviso y aceptar la corrección', async ({
  page,
}) => {
  await open(page, 'apertura');
  await page.getByRole('button', { name: 'Fórmula', exact: true }).click();
  const editor = page.getByRole('group', { name: /^Escribir en «Fórmula/ });
  const field = editor.locator('textarea').first();
  await expect(field).toHaveValue('ax+by=c');
  await field.fill('x=1 \\Rightarow y=2');
  const alert = editor.getByRole('alert');
  await expect(alert).toContainText('Fórmula con un error');
  await expect(alert).toContainText('Comando desconocido: \\Rightarow');
  await alert.getByRole('button', { name: 'Cambiar a \\Rightarrow' }).click();
  await expect(field).toHaveValue('x=1 \\Rightarrow y=2');
  await expect(editor.getByRole('alert')).toHaveCount(0);
});

test('un bloque pasa de paso con la barra y con la línea de pasos', async ({
  page,
}) => {
  await open(page, 'guiada');
  const column = (step: string) =>
    page.locator('.timeline-col', { hasText: new RegExp(`^${step}`) });
  const chips = (step: string) => column(step).locator('.timeline-chip');
  await expect(chips('Inicial')).toHaveCount(1);
  await expect(chips('Paso 1')).toHaveCount(1);
  // Se elige en la línea de pasos y se cambia de paso con la barra del bloque.
  await chips('Paso 1').first().click();
  await page
    .getByRole('radiogroup', { name: 'Cuándo aparece' })
    .getByRole('radio', { name: 'Paso 2' })
    .click();
  await expect(chips('Paso 2')).toHaveCount(2);
  await expect(chips('Paso 1')).toHaveCount(0);
  // Arrastrar la ficha a otra columna también lo cambia.
  await chips('Paso 2').first().dragTo(column('Inicial'));
  await expect(chips('Inicial')).toHaveCount(2);
  await page.getByRole('button', { name: 'Últimos cambios' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Últimos cambios' }),
  ).toContainText('a Inicial');
});

test('comentar un bloque deja una marca y el comentario aparece en el panel', async ({
  page,
}) => {
  await open(page, 'apertura');
  await canvas(page).locator('.block-objetivo').click();
  await page.getByRole('button', { name: 'Comentar', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Comentario', exact: true })
    .fill('Acortar el objetivo.');
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('.note-mark')).toHaveText('1');
  const panel = page.getByRole('tabpanel', { name: 'Comentarios' });
  await expect(panel.locator('.note-item')).toContainText(
    'Acortar el objetivo.',
  );
  await expect(panel).toContainText('En «');
  await page.getByRole('button', { name: 'Marcar como aplicado' }).click();
  await expect(page.locator('.note-mark')).toHaveCount(0);
});

test('Supr elimina el bloque y Deshacer lo devuelve', async ({ page }) => {
  await open(page, 'apertura');
  const objective = canvas(page).locator('.block-objetivo');
  await objective.click();
  await page.keyboard.press('Delete');
  await expect(objective).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('Objetivo');
  await page
    .locator('.toast')
    .getByRole('button', { name: 'Deshacer' })
    .click();
  await expect(objective).toHaveCount(1);
  await expect(indicator(page)).toHaveText('Al día');
});

test('Como se proyecta oculta los controles y el recorrido muestra cada paso', async ({
  page,
}) => {
  await open(page, 'guiada');
  await canvas(page).locator('.teaching-card').first().click();
  await expect(page.locator('.canvas-box.is-selected')).toBeVisible();
  await page.getByRole('radio', { name: 'Como se proyecta' }).click();
  await expect(page.locator('.canvas-overlay')).toHaveCount(0);
  await page.getByRole('radio', { name: 'Ver todo' }).click();
  await expect(page.locator('.canvas-overlay')).toHaveCount(1);

  await page.getByRole('button', { name: 'Otras formas de presentar' }).click();
  await page.getByRole('menuitem', { name: /Recorrer los pasos aquí/ }).click();
  const pill = page.locator('.tour-pill');
  await expect(pill).toContainText('Como lo ve el curso · al abrir');
  await page.keyboard.press('ArrowRight');
  await expect(pill).toContainText('clic 1 de 2');
  await page.keyboard.press('Escape');
  await expect(pill).toHaveCount(0);
});

test('una lámina que el editor no entiende queda en solo lectura y se corrige en Avanzado', async ({
  page,
}) => {
  await open(page, 'apertura');
  await page.getByRole('button', { name: 'Más acciones de la lámina' }).click();
  await page.getByRole('menuitem', { name: /Vista avanzada/ }).click();
  const mdx = page.getByLabel('MDX de la lámina');
  const original = await mdx.inputValue();
  await mdx.fill(`${original}\nVale {1 + 1} puntos.\n`);
  await expect(page.locator('.canvas-readonly')).toContainText('expresión');
  await expect(
    page.getByRole('button', { name: 'Texto', exact: true }),
  ).toBeDisabled();
  await mdx.fill(original);
  await expect(page.locator('.canvas-readonly')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Texto', exact: true }),
  ).toBeEnabled();
});

test('variante con otros números: la copia queda a continuación con los números nuevos', async ({
  page,
}) => {
  const fake = await open(page, 'guiada');
  const before = await page.locator('.thumb').count();
  await page.getByRole('button', { name: 'Otras formas de duplicar' }).click();
  await page.getByRole('menuitem', { name: /Con otros números/ }).click();
  const dialog = page.getByRole('dialog', { name: /^Variante de la lámina/ });
  await expect(dialog).toContainText('Los resultados no se recalculan');
  await expect(
    dialog.getByRole('button', { name: 'Crear copia sin cambios' }),
  ).toBeVisible();
  await dialog.getByLabel('Nuevo valor para 6.700').fill('7.200');
  await expect(
    dialog.getByRole('button', { name: 'Crear variante · 1 número cambia' }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: /^Crear variante/ }).click();
  await expect(page.locator('.toast')).toContainText(
    'Variante creada como «guiada-variante»',
  );
  await expect(page.locator('.thumb')).toHaveCount(before + 1);
  await expect(canvas(page)).toContainText('7.200');
  await publish(page);
  const copy = fake.files()[`${SISTEMAS}/laminas/guiada-variante.mdx`] ?? '';
  expect(copy).toContain('7.200');
  expect(copy).not.toContain('6.700');
  expect(fake.files()[`${SISTEMAS}/laminas/guiada.mdx`]).toContain('6.700');
});

test('las notas del orador se guardan con la lámina y se leen al presentar', async ({
  page,
}) => {
  const fake = await open(page, 'guiada');
  await page
    .getByRole('textbox', { name: 'Notas del orador' })
    .fill('Preguntar por qué se despeja x.');
  await publish(page);
  expect(fake.files()[`${SISTEMAS}/laminas/guiada.mdx`]).toContain(
    'notas: "Preguntar por qué se despeja x."',
  );
  await page.getByRole('button', { name: /^Presentar desde/ }).click();
  const notes = page.getByRole('complementary', { name: 'Notas del orador' });
  await expect(notes).toHaveCount(0);
  await page.getByRole('button', { name: 'Notas del orador' }).click();
  await expect(notes).toContainText('Preguntar por qué se despeja x.');
  await page.keyboard.press('s');
  await expect(notes).toHaveCount(0);
});
