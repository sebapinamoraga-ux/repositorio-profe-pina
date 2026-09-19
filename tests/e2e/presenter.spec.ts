import { test, expect } from '@playwright/test';
test('clicker conserva navegación después de tocar botones y el menú', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&slide=activar');
  await page.getByRole('button', { name: 'Revelar siguiente paso' }).click();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.step-label')).toHaveText('Paso 2 de 2');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.slide')).toHaveAttribute('data-slide', 'signos');
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', { name: '03 Transformar sin cambiar la solución' })
    .click();
  await expect(page.locator('.step-label')).toHaveText('Paso 2 de 2');
  await page.reload();
  await expect(page.locator('.step-label')).toHaveText('Paso 0 de 2');
});
test('interactivo conserva parámetros y se reinicia con la clase', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&slide=grafico');
  const slider = page.getByRole('slider', { name: 'Suma de las variables' });
  await slider.fill('9');
  await page.getByRole('button', { name: 'Avanzar diapositiva' }).click();
  await page.getByRole('button', { name: 'Retroceder' }).click();
  await expect(slider).toHaveValue('9');
  await page.getByRole('button', { name: 'Reiniciar clase' }).click();
  await page.getByRole('button', { name: 'Índice de clases' }).click();
  await page
    .getByRole('button', { name: '06 El encuentro de dos condiciones' })
    .click();
  await expect(slider).toHaveValue('7');
});
test('monedas y fórmulas centrales se distinguen', async ({ page }) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await expect(page.locator('[data-slide="desafio"]')).toContainText('$2.000');
  await expect(page.locator('[data-slide="desafio"] .katex')).toHaveCount(0);
  await expect(
    page.locator('[data-slide="individual"] .katex-display'),
  ).toHaveCount(1);
});
test('navegación por pasos y respuesta explícita', async ({ page }) => {
  await page.goto('/#clase=sistemas-2x2&slide=paes');
  await expect(
    page.getByText('De dos condiciones a una respuesta'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'B 10', exact: true }).click();
  await expect(page.locator('.answer')).not.toBeVisible();
  await page.getByRole('button', { name: 'Revelar siguiente paso' }).click();
  await expect(page.locator('.answer')).toBeVisible();
  await page.getByRole('button', { name: 'Reiniciar clase' }).click();
  await expect(page.locator('h1')).toHaveText(
    'Dos incógnitas. Una estrategia.',
  );
});
test('20 diapositivas exportables sin recortes ni controles', async ({
  page,
}) => {
  await page.goto('/#clase=sistemas-2x2&modo=pdf');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.slide')).toHaveCount(20);
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
