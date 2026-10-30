import { describe, it, expect } from 'vitest';
import { calculateBricks } from '../src/lib/calc/kirpich';

describe('Калькулятор кирпича (ГОСТ 530-2012)', () => {
  it('Сценарий 1: Стена 10х3 м в 1 кирпич (250 мм) из одинарного кирпича без проёмов с запасом 5%', () => {
    const res = calculateBricks({
      brickType: 'single',
      wallLengthM: 10,
      wallHeightM: 3,
      wallThickness: 1, // 0.25 м
      marginPercent: 5
    });

    // Площадь 30 м2, объем = 30 * 0.25 = 7.5 м3
    // Штук на м3 = 512, без запаса = 3840 шт
    // С запасом 5% = 3840 * 1.05 = 4032 шт
    expect(res.netWallAreaM2).toBe(30);
    expect(res.masonryVolumeM3).toBe(7.5);
    expect(res.totalBricksCount).toBe(4032);
    expect(res.mortarVolumeM3).toBeCloseTo(1.8, 1);
  });

  it('Сценарий 2: Стена из полуторного кирпича в 1.5 кирпича (380 мм) с вычетом окон и двери', () => {
    const res = calculateBricks({
      brickType: 'oneAndHalf',
      wallLengthM: 12,
      wallHeightM: 3,
      wallThickness: 1.5, // 0.38 м
      openings: [
        { widthM: 1.5, heightM: 1.4, count: 2 }, // 2 окна = 4.2 м2
        { widthM: 1.0, heightM: 2.1, count: 1 }  // 1 дверь = 2.1 м2
      ],
      marginPercent: 5
    });

    // Общая площадь = 36 м2
    // Проемы = 4.2 + 2.1 = 6.3 м2
    // Чистая площадь = 29.7 м2
    expect(res.openingsAreaM2).toBe(6.3);
    expect(res.netWallAreaM2).toBe(29.7);
    expect(res.masonryVolumeM3).toBeCloseTo(29.7 * 0.38, 2);
    expect(res.totalBricksCount).toBeGreaterThan(4000);
  });

  it('Сценарий 3: Перегородка в 0.5 кирпича (120 мм) из двойного кирпича', () => {
    const res = calculateBricks({
      brickType: 'double',
      wallLengthM: 6,
      wallHeightM: 2.7,
      wallThickness: 0.5, // 0.12 м
      marginPercent: 3
    });

    expect(res.wallThicknessM).toBe(0.12);
    expect(res.bricksPerM3).toBe(242);
    expect(res.totalBricksCount).toBeGreaterThan(0);
  });

  it('Граничные значения: Обработка некорректных размеров', () => {
    expect(() => calculateBricks({
      brickType: 'single',
      wallLengthM: 0,
      wallHeightM: 3,
      wallThickness: 1
    })).toThrowError();
  });
});
