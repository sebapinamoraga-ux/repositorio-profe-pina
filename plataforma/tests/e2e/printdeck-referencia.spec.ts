import { readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * El modo PDF no debe cambiar con el rediseño del editor: el HTML de `PrintDeck` de
 * sistemas-2x2 se compara con una captura generada antes de tocar el editor. Si el cambio es
 * intencional (contenido de la clase o motor de láminas), regenerarla con
 * `UPDATE_PRINTDECK_REFERENCE=1 npm run test:e2e -- printdeck-referencia`.
 */
const REFERENCE = new URL(
  './referencias/printdeck-sistemas-2x2.html',
  import.meta.url,
);

/**
 * Las imágenes de la mascota se sirven desde la ruta de cada equipo (`/@fs/<carpeta del
 * repositorio>/contenido/…`): se iguala para que la referencia valga en cualquier máquina.
 */
const normalize = (html: string) =>
  html.replace(/\/@fs\/[^"]*?\/contenido\//g, '/@fs/REPO/contenido/');

test('el HTML de PrintDeck de sistemas-2x2 coincide con la referencia', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await expect(page.locator('.print-deck [data-slide]')).toHaveCount(25);
  await page.evaluate(() => document.fonts.ready);
  const html = normalize(
    await page.locator('.print-deck').evaluate((node) => node.outerHTML),
  );
  if (process.env.UPDATE_PRINTDECK_REFERENCE) {
    writeFileSync(REFERENCE, `${html}\n`);
    return;
  }
  // Git en Windows puede entregar el archivo con CRLF; el DOM siempre usa LF.
  expect(`${html}\n`).toBe(
    readFileSync(REFERENCE, 'utf8').replace(/\r\n/g, '\n'),
  );
});
