import { test, expect, type Page } from '@playwright/test';
import { connectFakeGitHub } from './fake-github';

async function open(page: Page, slide = 'apertura') {
  await page.addInitScript(() =>
    localStorage.setItem('profe-pina-aula-acceso', '1'),
  );
  await connectFakeGitHub(page);
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.goto(
    `/#rol=docente&vista=clase&clase=sistemas-2x2&seccion=laminas&slide=${slide}`,
  );
  await expect(
    page.getByRole('button', { name: /^Al día con GitHub/ }),
  ).toBeVisible();
  await expect(page.locator('.canvas-frame .slide')).toBeVisible();
}
const frame = (page: Page) => page.locator('.canvas-frame');

test('la lámina se recorre con el teclado: flechas, Enter, Esc y Supr con Ctrl + Z', async ({
  page,
}) => {
  await open(page);
  await frame(page).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.canvas-box.is-selected')).toBeVisible();
  const blocksBefore = await page.locator('.canvas-box').count();
  await page.keyboard.press('Enter');
  const editor = page.getByRole('group', { name: /^Escribir en «/ });
  await expect(editor).toBeVisible();
  // Esc termina de escribir; otro Esc quita la selección.
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(page.locator('.canvas-box.is-selected')).toBeVisible();
  await frame(page).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.canvas-box.is-selected')).toHaveCount(0);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Delete');
  await expect(page.locator('.canvas-box')).toHaveCount(blocksBefore - 1);
  // Ctrl + Z, con el foco fuera de los campos, devuelve el bloque.
  await page.locator('.ws-title h1').click();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.canvas-box')).toHaveCount(blocksBefore);
});

test('Ctrl + Z dentro de un campo deshace el texto del campo, no la lámina', async ({
  page,
}) => {
  await open(page);
  await page.locator('.canvas-frame > .fit-slide .block-objetivo').click();
  await page.keyboard.press('Enter');
  const text = page
    .getByRole('group', { name: /^Escribir en «/ })
    .locator('textarea')
    .first();
  await text.fill('Texto nuevo');
  await expect(page.locator('.pub')).toHaveText('1 por publicar');
  await text.press('Control+z');
  // El navegador deshace lo tecleado en el campo; la app no ejecuta además su propio deshacer.
  await expect(text).not.toHaveValue('Texto nuevo');
  await expect(page.locator('.toast')).toHaveCount(0);
});

test('Ctrl + D duplica la lámina solo con el foco dentro del editor; Ctrl + K y ? abren sus diálogos', async ({
  page,
}) => {
  await open(page);
  const total = await page.locator('.thumb').count();
  // Fuera del editor (el título de la clase) no hace nada.
  await page.locator('.ws-title h1').click();
  await page.keyboard.press('Control+d');
  await expect(page.locator('.thumb')).toHaveCount(total);
  await page.locator('.thumb').first().focus();
  await page.keyboard.press('Control+d');
  await expect(page.locator('.thumb')).toHaveCount(total + 1);

  await page.keyboard.press('Control+k');
  await expect(
    page.getByRole('dialog', { name: 'Buscar en la clase' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Buscar en la clase' }),
  ).toHaveCount(0);

  await page.locator('.thumb').first().focus();
  await page.keyboard.press('?');
  await expect(
    page.getByRole('dialog', { name: 'Atajos de teclado' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Atajos de teclado' }),
  ).toHaveCount(0);
});

test('los menús se manejan con flechas, Enter y Esc, y devuelven el foco al botón', async ({
  page,
}) => {
  await open(page);
  const more = page.getByRole('button', { name: 'Más acciones de la lámina' });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('menu', { name: 'Más acciones de la lámina' }),
  ).toBeVisible();
  const items = page.getByRole('menuitem');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(items.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(more).toBeFocused();
  // Abrir otro menú cierra el anterior.
  await more.press('Enter');
  await page.getByRole('button', { name: 'Otras formas de presentar' }).click();
  await expect(page.getByRole('menu')).toHaveCount(1);
  await expect(
    page.getByRole('menu', { name: 'Otras formas de presentar' }),
  ).toBeVisible();
});

test('Alt + flechas mueve la lámina y Esc suelta la selección múltiple', async ({
  page,
}) => {
  await open(page, 'concepto');
  const before = await page.locator('.thumb-title').allTextContents();
  const at = before.indexOf('Del contexto a la primera ecuación');
  await page.locator('.thumb').nth(at).click();
  await page.keyboard.press('Alt+ArrowDown');
  const after = await page.locator('.thumb-title').allTextContents();
  expect(after[at + 1]).toBe('Del contexto a la primera ecuación');
  await page
    .locator('.thumb')
    .nth(at + 1)
    .click({ modifiers: ['Shift'] });
  await page
    .locator('.thumb')
    .nth(at + 2)
    .click({ modifiers: ['Shift'] });
  await expect(
    page.getByRole('group', { name: 'Láminas elegidas' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('group', { name: 'Láminas elegidas' }),
  ).toHaveCount(0);
});

test('la barra de la lámina cabe en una fila a 1280 px', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('profe-pina-aula-acceso', '1'),
  );
  await connectFakeGitHub(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(
    '/#rol=docente&vista=clase&clase=sistemas-2x2&seccion=laminas&slide=guiada',
  );
  await expect(page.locator('.slide-bar')).toBeVisible();
  const box = await page.locator('.slide-bar').boundingBox();
  // Una fila: el número de 36 px con el relleno de la barra.
  expect(box?.height ?? 999).toBeLessThan(70);
  const head = await page.locator('.ws-head').boundingBox();
  const viewport = page.viewportSize();
  expect((head?.x ?? 0) + (head?.width ?? 0)).toBeLessThanOrEqual(
    (viewport?.width ?? 0) + 1,
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(1280);
});
