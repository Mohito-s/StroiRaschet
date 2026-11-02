import { describe, it, expect } from 'vitest';
import { calculateArmatura } from '../src/lib/calc/armatura';

describe('calculateArmatura (СП 63.13330.2018 & ГОСТ 5781-82)', () => {
  it('должен корректно рассчитывать арматурный каркас для ленточного фундамента (40 м, 0.4х0.8 м)', () => {
    const res = calculateArmatura({
      type: 'tape',
      totalLength: 40,
      tapeWidth: 0.4,
      tapeHeight: 0.8,
      workingDiameter: 12,
      clampDiameter: 8,
      barsCount: 4,
      clampSpacing: 0.35,
      marginPercent: 7
    });

    expect(res.foundationType).toBe('tape');
    expect(res.workingDiameter).toBe(12);
    expect(res.clampDiameter).toBe(8);
    expect(res.workingLengthM).toBeGreaterThan(160); // 40 * 4 + нахлёсты + 7% запас
    expect(res.clampCount).toBeGreaterThan(110);
    expect(res.totalWeightKg).toBeGreaterThan(100);
    expect(res.totalWeightTons).toBeGreaterThan(0.1);
    expect(res.workingBars117mCount).toBeGreaterThan(10);
    expect(res.workingBars6mCount).toBeGreaterThan(20);
    expect(res.wireWeightKg).toBeGreaterThan(0);
    expect(res.fixatorsCount).toBe(160);
    expect(res.isNormCompliant).toBe(true);
    expect(res.actualReinforcementPercent).toBeGreaterThanOrEqual(0.1);
  });

  it('должен предупреждать при нарушении минимального процента армирования (< 0.1%)', () => {
    // Очень толстая балка 1.5м шириной и 1.5м высотой, но всего 4 тонких прутка d10
    const res = calculateArmatura({
      type: 'tape',
      totalLength: 20,
      tapeWidth: 1.5,
      tapeHeight: 1.5,
      workingDiameter: 10,
      barsCount: 4
    });

    expect(res.isNormCompliant).toBe(false);
    expect(res.actualReinforcementPercent).toBeLessThan(0.1);
    expect(res.normRecommendation).toBeDefined();
    expect(res.normRecommendation).toContain('СП 63.13330.2018');
  });

  it('должен корректно рассчитывать арматурную сетку фундаментной плиты (10х10 м, толщина 0.3 м)', () => {
    const res = calculateArmatura({
      type: 'slab',
      slabLength: 10,
      slabWidth: 10,
      slabThickness: 0.3,
      gridStep: 0.2,
      workingDiameter: 12,
      frogDiameter: 8,
      marginPercent: 8
    });

    expect(res.foundationType).toBe('slab');
    expect(res.concreteVolumeM3).toBe(30);
    expect(res.concreteAreaSqm).toBe(100);
    expect(res.workingLengthM).toBeGreaterThan(2000); // 2 сетки по 100 прутков ~ 2000м + запас
    expect(res.clampCount).toBeGreaterThan(150); // поддерживающие лягушки
    expect(res.totalWeightKg).toBeGreaterThan(1500);
    expect(res.wireKnotsCount).toBeGreaterThan(5000);
    expect(res.fixatorsCount).toBe(500);
    expect(res.isNormCompliant).toBe(true);
  });

  it('должен рассчитывать смету «Режима мастера» при включении', () => {
    const res = calculateArmatura(
      {
        type: 'tape',
        totalLength: 30,
        tapeWidth: 0.4,
        tapeHeight: 0.8,
        workingDiameter: 12
      },
      {
        enabled: true,
        tieRatePerTon: 30000,
        formworkRatePerSqm: 700,
        concretePourPerM3: 5000
      }
    );

    expect(res.laborEstimate).toBeDefined();
    expect(res.laborEstimate?.tieCost).toBeGreaterThan(0);
    expect(res.laborEstimate?.formworkCost).toBeGreaterThan(0);
    expect(res.laborEstimate?.concreteCost).toBeGreaterThan(0);
    expect(res.laborEstimate?.totalLaborCost).toBeGreaterThan(10000);
    expect(res.laborEstimate?.grandTotal).toBeGreaterThan(res.laborEstimate!.totalLaborCost);
  });

  it('выбрасывает ошибку при нулевых или отрицательных размерах', () => {
    expect(() => calculateArmatura({ type: 'tape', totalLength: 0, tapeWidth: 0.4, tapeHeight: 0.8 })).toThrow();
    expect(() => calculateArmatura({ type: 'slab', slabLength: -10, slabWidth: 10, slabThickness: 0.3 })).toThrow();
  });
});
