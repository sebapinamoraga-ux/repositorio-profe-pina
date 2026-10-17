import { describe, expect, it } from 'vitest';
import { parsePrint, parseRoute, roleStateOf, routeHash } from './routes';

const parse = (hash: string) => parseRoute(new URLSearchParams(hash));
const canonical = (hash: string) => routeHash(parse(hash));

describe('parseRoute', () => {
  it('lee rol, vista, clase, pestaña y lámina', () => {
    expect(parse('rol=docente&vista=clase&clase=a&seccion=laminas&slide=b')).toEqual({
      role: 'docente',
      view: 'clase',
      section: 'laminas',
      lesson: 'a',
      slide: 'b',
      library: null,
    });
    expect(parse('rol=docente&vista=presentar&clase=sistemas-2x2&slide=signos')).toEqual({
      role: 'docente',
      view: 'presentar',
      section: null,
      lesson: 'sistemas-2x2',
      slide: 'signos',
      library: null,
    });
  });

  it('una vista desconocida vuelve a Clases y una pestaña desconocida al resumen', () => {
    expect(parse('rol=docente&vista=otra')).toMatchObject({ view: 'clases', section: null });
    expect(parse('rol=docente&vista=clase&seccion=otra')).toMatchObject({ section: 'resumen' });
  });

  it('Clases lleva la biblioteca elegida; las demás vistas no', () => {
    expect(parse('rol=docente&vista=clases&biblioteca=canal')).toMatchObject({ library: 'canal' });
    expect(canonical('rol=docente&vista=clases&biblioteca=canal')).toBe(
      '#rol=docente&vista=clases&biblioteca=canal',
    );
    expect(parse('rol=docente&vista=cursos&biblioteca=canal')).toMatchObject({ library: null });
  });

  it('las vistas renombradas siguen abriendo su sección', () => {
    expect(parse('rol=docente&vista=biblioteca')).toMatchObject({ view: 'clases' });
    expect(parse('rol=docente&vista=conexion')).toMatchObject({ view: 'ajustes' });
    expect(parse('rol=docente')).toMatchObject({ view: 'clases' });
  });

  it('las vistas anteriores al espacio de la clase son pestañas', () => {
    expect(parse('rol=docente&vista=hoy&clase=a')).toMatchObject({ view: 'clase', section: 'resumen', lesson: 'a' });
    expect(parse('rol=docente&vista=editor')).toMatchObject({ view: 'clase', section: 'laminas' });
    expect(parse('rol=docente&vista=pdf&clase=a')).toMatchObject({ view: 'clase', section: 'pdf' });
  });

  it('acepta los enlaces anteriores a la app por rol', () => {
    expect(parse('clase=sistemas-2x2&slide=activar')).toEqual({
      role: 'docente',
      view: 'presentar',
      section: null,
      lesson: 'sistemas-2x2',
      slide: 'activar',
      library: null,
    });
    expect(parse('clase=sistemas-2x2&galeria=mascotas')).toEqual({
      role: 'docente',
      view: 'galeria',
      section: null,
      lesson: 'sistemas-2x2',
      slide: null,
      library: null,
    });
  });

  it('sin rol recurre al último guardado, sin clase', () => {
    expect(parseRoute(new URLSearchParams(''), { role: 'docente', view: 'cursos' })).toEqual({
      role: 'docente',
      view: 'cursos',
      section: null,
      lesson: null,
      slide: null,
      library: null,
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
  it('lleva la clase solo en las vistas de clase y la lámina solo donde se elige', () => {
    expect(canonical('rol=docente&vista=editor&clase=a&slide=b')).toBe(
      '#rol=docente&vista=clase&clase=a&seccion=laminas&slide=b',
    );
    expect(canonical('rol=docente&vista=clase&clase=a&seccion=pdf&slide=b')).toBe(
      '#rol=docente&vista=clase&clase=a&seccion=pdf',
    );
    expect(canonical('rol=docente&vista=clases&clase=a&seccion=pdf')).toBe(
      '#rol=docente&vista=clases',
    );
    expect(canonical('slide=b&clase=a')).toBe('#rol=docente&vista=presentar&clase=a&slide=b');
  });

  it('quita parámetros ajenos y no inventa un rol', () => {
    expect(canonical('rol=remoto&vista=hoy&clase=a')).toBe('#rol=remoto');
    expect(canonical('')).toBe('#');
  });

  it('es estable: interpretar la forma canónica da la misma ruta', () => {
    for (const hash of [
      'rol=docente&vista=pdf&clase=a',
      'rol=docente&vista=clase&clase=a&seccion=repaso&slide=r1',
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
      stepped: false,
    });
    expect(parsePrint(new URLSearchParams('clase=a&modo=pdf&pasos=1'))?.stepped).toBe(true);
    expect(parsePrint(new URLSearchParams('rol=docente&vista=pdf'))).toBeNull();
  });
});

it('recuerda rol y vista, y conserva la vista docente al pasar a otro rol', () => {
  expect(roleStateOf({ role: 'remoto' }, { role: 'docente', view: 'cursos' })).toEqual({
    role: 'remoto',
    view: 'cursos',
  });
});
