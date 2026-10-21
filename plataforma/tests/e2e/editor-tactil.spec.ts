import { test, expect, type Page } from '@playwright/test';
import { connectFakeGitHub } from './fake-github';

const CUADRATICA =
  'contenido/cursos/competencia-matematica-3m/clases/funcion-cuadratica-2';

async function open(page: Page, clase = 'sistemas-2x2') {
  await page.addInitScript(() =>
    localStorage.setItem('profe-pina-aula-acceso', '1'),
  );
  const fake = await connectFakeGitHub(page);
  await page.goto(`/#rol=docente&vista=clase&clase=${clase}&seccion=laminas`);
  await expect(
    page.getByRole('button', { name: /^Al día con GitHub/ }),
  ).toBeVisible();
  await expect(page.locator('.thumb').first()).toBeVisible();
  return fake;
}
const thumb = (page: Page, title: string) =>
  page.locator('.thumb', {
    has: page.locator('.thumb-title', { hasText: title }),
  });

test.describe('celular', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('lista por tramos, lámina con bloques y escritura en modo enfoque', async ({
    page,
  }) => {
    await open(page, 'funcion-cuadratica-2');
    await expect(
      page.getByRole('button', { name: /^1\. Inicio/ }),
    ).toBeVisible();
    await thumb(page, 'Función cuadrática (parte 2)').tap();
    // La lámina se ve sin controles y sus bloques están en lista.
    await expect(page.locator('.phone-slide')).toBeVisible();
    await expect(page.locator('.canvas-overlay')).toHaveCount(0);
    const blocks = page.getByRole('region', { name: 'Bloques de la lámina' });
    await expect(blocks.locator('.phone-block').first()).toBeVisible();
    await blocks.locator('.phone-block-main', { hasText: 'Objetivo' }).tap();
    const focus = page.getByRole('dialog', { name: /^Escribir en «/ });
    await expect(focus).toBeVisible();
    await expect(focus.getByLabel('Aparece en')).toBeVisible();
    await focus
      .locator('textarea')
      .first()
      .fill('Objetivo nuevo escrito con el dedo.');
    await expect(focus.locator('.mini-slide')).toContainText(
      'Objetivo nuevo escrito con el dedo.',
    );
    await focus
      .getByRole('button', { name: 'Listo', exact: true })
      .first()
      .tap();
    await expect(focus).toHaveCount(0);
    await expect(
      page.locator('.canvas-frame, .phone-canvas').first(),
    ).toContainText('Objetivo nuevo escrito con el dedo.');
    // Volver a la lista.
    await page.getByRole('button', { name: 'Láminas', exact: true }).tap();
    await expect(page.locator('.phone-slide')).toHaveCount(0);
  });

  test('hoja «Insertar bloque» y pasos con el control en vez de la línea de tiempo', async ({
    page,
  }) => {
    await open(page, 'funcion-cuadratica-2');
    await thumb(page, 'Función cuadrática (parte 2)').tap();
    await expect(page.locator('.timeline')).toHaveCount(0);
    await page.getByRole('button', { name: '+ Paso' }).tap();
    await expect(
      page.getByRole('button', { name: 'Paso 1', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Insertar', exact: true }).tap();
    const sheet = page.getByRole('dialog', { name: 'Insertar bloque' });
    await expect(sheet).toBeVisible();
    await sheet.getByRole('button', { name: 'Texto', exact: true }).tap();
    await expect(
      page.getByRole('dialog', { name: /^Escribir en «/ }),
    ).toBeVisible();
  });

  test('«Datos y acciones» cambia el título y duplica la lámina', async ({
    page,
  }) => {
    await open(page, 'funcion-cuadratica-2');
    const before = await page.locator('.thumb').count();
    await thumb(page, 'Función cuadrática (parte 2)').tap();
    await page
      .getByRole('button', { name: 'Datos y acciones de la lámina' })
      .tap();
    const sheet = page.getByRole('dialog', { name: 'Datos y acciones' });
    await sheet.getByLabel('Título').fill('Portada editada en el celular');
    await expect(
      sheet.getByRole('button', { name: 'Mover a otro tramo…' }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: 'Duplicar lámina' }).tap();
    await expect(sheet).toHaveCount(0);
    await page.getByRole('button', { name: 'Láminas', exact: true }).tap();
    await expect(page.locator('.thumb')).toHaveCount(before + 1);
  });

  test('nueva lámina sube como hoja con diseños en dos columnas', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('button', { name: 'Nueva lámina', exact: true }).tap();
    const sheet = page.getByRole('dialog', { name: 'Nueva lámina' });
    await expect(sheet).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: /^Resolución/ }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: /^Concepto/ }).tap();
    await expect(page.locator('.phone-slide')).toBeVisible();
    await expect(page.locator('.phone-title')).toHaveText('Concepto nuevo');
  });
});

test.describe('tableta', () => {
  test.use({
    viewport: { width: 1024, height: 768 },
    hasTouch: true,
    isMobile: true,
  });

  test('Organizar mueve láminas entre tramos con botones', async ({ page }) => {
    const fake = await open(page, 'funcion-cuadratica-2');
    await page.getByRole('button', { name: 'Organizar', exact: true }).tap();
    await page.getByRole('button', { name: 'Bajar la lámina 01' }).tap();
    await expect(page.locator('.pub')).toHaveText('1 por publicar');
    await page
      .getByLabel('Mover la lámina 03 a un tramo')
      .selectOption({ index: 3 });
    await page.getByRole('button', { name: 'Listo', exact: true }).tap();
    await page.locator('.pub').tap();
    await page.getByRole('button', { name: 'Publicar', exact: true }).tap();
    await expect(page.locator('.pub')).toHaveText('Publicado');
    const yaml = fake.files()[`${CUADRATICA}/clase.yaml`] ?? '';
    expect(yaml).toContain('slides:\n  - precio-optimo.mdx\n  - apertura.mdx');
  });

  test('un toque elige el bloque, otro lo abre en modo enfoque y «Más» guarda Duplicar y Eliminar', async ({
    page,
  }) => {
    await open(page);
    await page.locator('.canvas-frame > .fit-slide .block-objetivo').tap();
    const bar = page.getByRole('toolbar', { name: /^Bloque «Objetivo/ });
    await expect(bar).toBeVisible();
    await expect(
      bar.getByRole('button', { name: 'Duplicar', exact: true }),
    ).toHaveCount(0);
    await bar.getByRole('button', { name: 'Más sobre el bloque' }).tap();
    await expect(
      page.getByRole('menuitem', { name: 'Duplicar' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await bar.getByRole('button', { name: 'Escribir', exact: true }).tap();
    const focus = page.getByRole('dialog', { name: /^Escribir en «/ });
    await expect(focus).toBeVisible();
    await expect(
      focus.getByRole('toolbar', { name: 'Formato del texto' }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(focus).toHaveCount(0);
  });

  test('en la línea de pasos, tocar una ficha ofrece «Mover a»', async ({
    page,
  }) => {
    await open(page);
    await page.locator('.thumb').nth(11).tap();
    const chip = page.locator('.timeline-chip').first();
    await chip.tap();
    await expect(
      page.getByRole('menuitem', { name: /^Mover a Paso/ }).first(),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Opciones del paso 1' }).tap();
    await expect(
      page.getByRole('menuitem', { name: 'Quitar paso 1' }),
    ).toBeVisible();
  });
});
