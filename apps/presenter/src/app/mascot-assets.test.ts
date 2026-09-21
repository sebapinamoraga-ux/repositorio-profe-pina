import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { usedMascotPoses } from '../../../../packages/content-model/src/used-poses';
import { bundledMascotPoses, mascotUrl } from './mascot-assets';

it('carga exactamente las poses que usa el contenido', async () => {
  const used = await usedMascotPoses(resolve('content'));
  expect(used.length).toBeGreaterThan(0);
  expect(bundledMascotPoses).toEqual(used);
});
it('entrega una URL para cada pose usada', () => {
  for (const pose of bundledMascotPoses)
    expect(mascotUrl(pose), `pose ${pose}`).toBeTruthy();
});
it('rechaza una pose que el contenido no usa', () => {
  expect(bundledMascotPoses).not.toContain(100);
  expect(() => mascotUrl(100)).toThrow(/pose 100/);
});
