import { describe, expect, it } from 'vitest';
import { parsePrint, parseRoute, roleStateOf, routeHash } from './routes';

const parse = (hash: string) => parseRoute(new URLSearchParams(hash));
const canonical = (hash: string) => routeHash(parse(hash));

describe('parseRoute', () => {
  it('lee rol, vista, clase y lámina', () => {
    expect(parse('rol=docente&vista=presentar&clase=sistemas-2x2&slide=signos')).toEqual({
      role: 'docente',
      view: 'presentar',
      lesson: 'sistemas-2x2',
      slide: 'signos',
    });
  });

  it('una vista desconocida vuelve a Clase de hoy', () => {
    expect(parse('rol=docente&vista=otra')).toMatchObject({ view: 'hoy' });
  });

  it('acepta los enlaces anteriores a la app por rol', () => {
    expect(parse('clase=sistemas-2x2&slide=activar')).toEqual({
      role: 'docente',
      view: 'presentar',
      lesson: 'sistemas-2x2',
      slide: 'activar',
    });
    expect(parse('clase=sistemas-2x2&galeria=mascotas')).toEqual({
      role: 'docente',
      view: 'galeria',
      lesson: 'sistemas-2x2',
      slide: null,
    });
  });

  it('sin rol recurre al último guardado, sin clase', () => {
    expect(parseRoute(new URLSearchParams(''), { role: 'docente', view: 'editor' })).toEqual({
      role: 'docente',
      view: 'editor',
      lesson: null,
      slide: null,
    });
    expect(parse('')).toEqual({ role: null });
  });

  it('el estudiante conserva clase y código de votación', () => {
    expect(parse('rol=estudiante&clase=sistemas-2x2&codigo=ABC')).toEqual({
      role: 'estudiante',
      lesson: 'sistemas-2x2',
      code: 'ABC',
    });
  });
});

describe('routeHash', () => {
  it('lleva la clase solo en las vistas de clase y la lámina solo al presentar', () => {
    expect(canonical('rol=docente&vista=editor&clase=a&slide=b')).toBe(
      '#rol=docente&vista=editor&clase=a',
    );
    expect(canonical('rol=docente&vista=biblioteca&clase=a')).toBe(
      '#rol=docente&vista=biblioteca',
    );
    expect(canonical('slide=b&clase=a')).toBe(
      '#rol=docente&vista=presentar&clase=a&slide=b',
    );
  });

  it('quita parámetros ajenos y no inventa un rol', () => {
    expect(canonical('rol=remoto&vista=hoy&clase=a')).toBe('#rol=remoto');
    expect(canonical('')).toBe('#');
  });

  it('es estable: interpretar la forma canónica da la misma ruta', () => {
    for (const hash of [
      'rol=docente&vista=pdf&clase=a',
      'rol=docente&vista=presentar&clase=a&slide=b',
      'rol=estudiante&clase=a&codigo=X',
      'rol=docente&vista=cursos',
    ])
      expect(canonical(canonical(hash).slice(1))).toBe(canonical(hash));
  });
});

describe('parsePrint', () => {
  it('reconoce la impresión y sus opciones', () => {
    expect(parsePrint(new URLSearchParams('clase=a&modo=pdf&imprimir=1&fuente=local'))).toEqual({
      lesson: 'a',
      autoPrint: true,
      local: true,
    });
    expect(parsePrint(new URLSearchParams('rol=docente&vista=pdf'))).toBeNull();
  });
});

it('recuerda rol y vista, y conserva la vista docente al pasar a otro rol', () => {
  expect(
    roleStateOf({ role: 'remoto' }, { role: 'docente', view: 'editor' }),
  ).toEqual({ role: 'remoto', view: 'editor' });
});
