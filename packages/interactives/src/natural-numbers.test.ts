import { describe, expect, it } from 'vitest';
import {
  cifras,
  dividir,
  divisores,
  escrituraPrima,
  esPrimo,
  factoresPrimos,
  formatNatural,
  mcd,
  mcm,
  multiplosHasta,
  paresDivisores,
  tachadosPorCriba,
  trozoVigente,
} from './natural-numbers';

describe('números naturales', () => {
  it('lista divisores y pares de divisores', () => {
    expect(divisores(12)).toEqual([1, 2, 3, 4, 6, 12]);
    expect(paresDivisores(12)).toEqual([
      [1, 12],
      [2, 6],
      [3, 4],
    ]);
    expect(paresDivisores(16)).toEqual([
      [1, 16],
      [2, 8],
      [4, 4],
    ]);
    expect(paresDivisores(13)).toEqual([[1, 13]]);
  });

  it('reconoce primos, con 0 y 1 fuera', () => {
    expect([0, 1, 2, 3, 4, 9, 13, 29].map(esPrimo)).toEqual([
      false,
      false,
      true,
      true,
      false,
      false,
      true,
      true,
    ]);
  });

  it('descompone en factores primos y escribe con potencias', () => {
    expect(factoresPrimos(360)).toEqual([2, 2, 2, 3, 3, 5]);
    expect(escrituraPrima(360)).toBe('2³ · 3² · 5');
    expect(escrituraPrima(28)).toBe('2² · 7');
    expect(escrituraPrima(13)).toBe('13');
  });

  it('calcula MCM y mcd', () => {
    expect(mcm([12, 18, 24])).toBe(72);
    expect(mcd([12, 18, 24])).toBe(6);
    expect(mcm([8, 12])).toBe(24);
    expect(mcd([8, 12]) * mcm([8, 12])).toBe(8 * 12);
    expect(multiplosHasta(18, 72)).toEqual([18, 36, 54, 72]);
  });

  it('aplica el algoritmo de la división', () => {
    expect(dividir(137, 3)).toEqual({ cociente: 45, resto: 2 });
    expect(dividir(23, 5)).toEqual({ cociente: 4, resto: 3 });
    expect(() => dividir(5, 0)).toThrow('divisor');
  });

  it('separa cifras y escribe miles con punto', () => {
    expect(cifras(3623)).toEqual([3, 6, 2, 3]);
    expect(formatNatural(3623)).toBe('3.623');
  });

  it('elige el trozo vigente de cada paso', () => {
    const etapas = [
      { trozo: 4, paso: 1 },
      { trozo: 3, paso: 2 },
      { trozo: 6, paso: 3 },
    ];
    expect(trozoVigente(etapas, 0, false)).toBeUndefined();
    expect(trozoVigente(etapas, 1, false)).toBe(4);
    expect(trozoVigente(etapas, 2, false)).toBe(3);
    expect(trozoVigente(etapas, 5, false)).toBe(6);
    expect(trozoVigente(etapas, 0, true)).toBe(6);
    expect(trozoVigente([{ trozo: 6, paso: 0 }], 0, false)).toBe(6);
    expect(() => trozoVigente([{ trozo: 4, paso: 2 }, { trozo: 6, paso: 2 }], 2, false)).toThrow('crecer');
    expect(dividir(18, 4)).toEqual({ cociente: 4, resto: 2 });
  });

  it('tacha los múltiplos de los primos de la criba, sin los primos', () => {
    const tachados = tachadosPorCriba(30, [2, 3]);
    expect(tachados.has(2)).toBe(false);
    expect(tachados.has(9)).toBe(true);
    expect(tachados.has(25)).toBe(false);
    expect([...tachadosPorCriba(30, [2, 3, 5])].length).toBe(19);
    expect(() => tachadosPorCriba(30, [4])).toThrow('no es primo');
  });
});

