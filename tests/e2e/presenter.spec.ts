import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('clicker conserva navegación después de tocar botones y el menú', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&slide=activar');
  await page.getByRole('button', { name: 'Revelar siguiente paso' }).click();
  await expect(page.locator('.step-label')).toHaveText('Paso 1 de 1');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slide')).toHaveAttribute('data-slide', 'signos');
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', { name: '04 Una compra admite distintos precios' })
    .click();
  await expect(page.locator('.step-label')).toHaveText('Paso 1 de 1');
  await page.reload();
  await expect(page.locator('.step-label')).toHaveText('Paso 0 de 1');
});
test('interactivo conserva parámetros y se reinicia con la clase', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&slide=grafico');
  const slider = page.getByRole('slider', {
    name: 'Precio del sándwich sobre la primera condición',
  });
  await slider.fill('1200');
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', { name: '08 Las cuatro decisiones de la reducción' })
    .click();
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', {
      name: '17 El mismo par es la intersección de las rectas',
    })
    .click();
  await expect(slider).toHaveValue('1200');
  await page.getByRole('button', { name: 'Reiniciar clase' }).click();
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', {
      name: '17 El mismo par es la intersección de las rectas',
    })
    .click();
  await expect(slider).toHaveValue('0');
});
test('monedas y fórmulas centrales se distinguen', async ({ page }) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await expect(page.locator('[data-slide="desafio"]')).toContainText('$5.100');
  await expect(page.locator('[data-slide="desafio"] .katex')).toHaveCount(0);
  await expect(
    page.locator('[data-slide="individual"] .katex-display'),
  ).toHaveCount(1);
});
test('navegación por pasos y respuesta explícita', async ({ page }) => {
  await page.goto('/#clase=sistemas-2x2&slide=paes');
  await expect(
    page.getByText('Ticket: compara con tu resultado'),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: 'B 80 en preventa y 40 el día.',
      exact: true,
    })
    .click();
  await expect(page.locator('.answer')).not.toBeVisible();
  await page.getByRole('button', { name: 'Revelar siguiente paso' }).click();
  await expect(page.locator('.answer')).toBeVisible();
  await page.getByRole('button', { name: 'Reiniciar clase' }).click();
  await expect(page.locator('h1')).toHaveText(
    'Sistemas de ecuaciones lineales de 2×2',
  );
});
test('25 diapositivas exportables sin recortes ni controles', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.slide')).toHaveCount(25);
  await expect(page.locator('.toolbar')).toHaveCount(0);
  await expect(page.locator('button,input,textarea')).toHaveCount(0);
  const overflow = await page.locator('.slide').evaluateAll((slides) =>
    slides.flatMap((slide) => {
      const content = slide.querySelector('.slide-content');
      const footer = slide.querySelector('footer');
      if (!content || !footer) return ['estructura'];
      return content.getBoundingClientRect().bottom >
        footer.getBoundingClientRect().top - 5
        ? [slide.getAttribute('data-slide')]
        : [];
    }),
  );
  expect(overflow).toEqual([]);
  await expect(page.locator('.answer')).toBeVisible();
});
test('tema claro y tres niveles de mascota llegan a la clase y al PDF', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await expect(page.locator('.slide').first()).toHaveCSS(
    'background-color',
    'rgb(251, 248, 241)',
  );
  await expect(page.locator('.mascot-level-marca')).toHaveCount(1);
  await expect(page.locator('.mascot-level-sutil')).toHaveCount(2);
  await expect(page.locator('.mascot-level-pedagogica')).toHaveCount(6);
  await expect(page.locator('.block-definicion')).toHaveCount(1);
  await expect(page.locator('[data-slide="definicion"] h1')).toHaveText(
    'Sistema de ecuaciones lineales de 2x2',
  );
  await expect(
    page.locator('[data-slide="apertura"] .block-objetivo'),
  ).toHaveCSS('background-color', 'rgb(255, 253, 250)');
  await expect(
    page.locator('[data-slide="definicion"] .block-definicion'),
  ).toHaveCSS('background-color', 'rgb(231, 239, 255)');
  const cover = page.locator('[data-slide="apertura"]');
  await expect(cover).toContainText('Objetivo de clase');
  await expect(cover).not.toContainText('Nuestro propósito');
  await expect(cover).not.toContainText('80 minutos');
  await expect(cover).not.toContainText('Ecuaciones → Sistemas → Modelamiento');
  await expect(cover).not.toContainText(
    'Dos cantidades desconocidas pueden estar conectadas',
  );
  await expect(cover.locator('.brand > span:last-child')).toHaveText(
    'PROFE PIÑA',
  );
  await expect
    .poll(() =>
      cover.evaluate((element) =>
        getComputedStyle(element, '::after').getPropertyValue('content'),
      ),
    )
    .toBe('none');
});
test('galería ofrece plantillas filtrables y vuelve a la clase', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&galeria=mascotas');
  await expect(
    page.getByRole('heading', { name: 'Presencia de Profe Piña' }),
  ).toBeVisible();
  await expect(page.locator('.gallery-card')).toHaveCount(17);
  await expect(page.locator('.gallery-feature .template-slide')).toContainText(
    'Objetivo de clase',
  );
  await expect(
    page.locator('.gallery-feature .template-slide'),
  ).not.toContainText('PROFE PIÑA / AULA');
  await expect
    .poll(() =>
      page
        .locator('.gallery-feature .template-slide')
        .evaluate((element) =>
          getComputedStyle(element, '::after').getPropertyValue('content'),
        ),
    )
    .toBe('none');
  await page.getByRole('button', { name: 'Pedagógica', exact: true }).click();
  await expect(page.locator('.gallery-card')).toHaveCount(8);
  await page.getByLabel('Momento de clase').selectOption('cierre');
  await expect(page.getByRole('status')).toContainText('No hay plantillas');
  await page.getByLabel('Momento de clase').selectOption('practica');
  await expect(page.locator('.gallery-card')).toHaveCount(3);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Descargar plantilla' }).click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) throw new Error('No se descargó la plantilla');
  const source = await readFile(path, 'utf8');
  expect(source).toContain('<Composicion plantilla="pedagogica-comprobacion">');
  expect(source).toContain('<Comprobacion');
  expect(source).not.toContain('<Definicion');
  await page.getByRole('link', { name: 'Volver a la clase' }).click();
  await expect(page.locator('.slide')).toHaveCount(1);
});
for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
])
  test(`lienzo visible ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const box = await page.locator('.slide').boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y + box.height).toBeLessThan(viewport.height - 65);
    }
  });
