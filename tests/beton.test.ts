import { describe, it, expect } from 'vitest';
import { calculateConcrete } from '../src/lib/calc/beton';

describe('Калькулятор бетона (ГОСТ 7473-2010, ГОСТ 26633-2015)', () => {
  it('Сценарий 1: Расчёт ленточного фундамента (длина 40 м, сечение 0.4х0.8 м, запас 5%)', () => {
    const res = calculateConcrete({
      type: 'tape',
      totalLength: 40,
      tapeWidth: 0.4,
      tapeHeight: 0.8,
      marginPercent: 5
    });

    expect(res.netVolumeM3).toBe(12.8); // 40 * 0.4 * 0.8 = 12.8 м³
    expect(res.totalVolumeM3).toBe(13.44); // 12.8 * 1.05 = 13.44 м³
    expect(res.marginPercent).toBe(5);
    expect(res.trucksRequired).toBe(2); // 13.44 / 7 = 1.92 -> 2 миксера
    expect(res.totalMassKg).toBe(32256); // 13.44 * 2400 кг
  });

  it('Сценарий 2: Расчёт монолитной фундаментной плиты (10х10 м, толщина 0.3 м, запас 3%)', () => {
    const res = calculateConcrete({
      type: 'slab',
      slabLength: 10,
      slabWidth: 10,
      slabThickness: 0.3,
      marginPercent: 3
    });

    expect(res.netVolumeM3).toBe(30.0);
    expect(res.totalVolumeM3).toBe(30.9);
    expect(res.trucksRequired).toBe(5);
  });

  it('Сценарий 3: Расчёт буронабивных круглых свай (20 свай диаметром 0.3 м, глубина 2.5 м)', () => {
    const res = calculateConcrete({
      type: 'pillars',
      pillarCount: 20,
      pillarDiameter: 0.3,
      pillarHeight: 2.5,
      isRound: true,
      marginPercent: 5
    });

    // Площадь = pi * 0.15^2 ≈ 0.0706858
    // Объем 1 сваи = 0.0706858 * 2.5 ≈ 0.17671
    // 20 свай = 3.534 м³
    expect(res.netVolumeM3).toBeCloseTo(3.53, 1);
    expect(res.totalVolumeM3).toBeGreaterThan(res.netVolumeM3);
  });

  it('Граничные значения: Ошибки при некорректных или отрицательных параметрах', () => {
    expect(() => calculateConcrete({
      type: 'tape',
      totalLength: 0,
      tapeWidth: 0.4,
      tapeHeight: 0.8
    })).toThrowError();

    expect(() => calculateConcrete({
      type: 'slab',
      slabLength: -10,
      slabWidth: 5,
      slabThickness: 0.2
    })).toThrowError();
  });
});
