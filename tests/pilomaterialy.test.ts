import { describe, it, expect } from 'vitest';
import { calculateLumber } from '../src/lib/calc/pilomaterialy';

describe('Калькулятор пиломатериалов (ГОСТ 8486-86)', () => {
  it('Сценарий 1: Расчёт стандартной обрезной доски 50х150х6000 мм по количеству (40 штук)', () => {
    const res = calculateLumber({
      thicknessMm: 50,
      widthMm: 150,
      lengthM: 6.0,
      mode: 'byPieces',
      piecesCount: 40,
      marginPercent: 0
    });

    // Объем 1 шт = 0.05 * 0.15 * 6 = 0.045 м³
    // Штук в м³ = 1 / 0.045 = 22.22... шт
    // 40 шт = 40 * 0.045 = 1.8 м³
    expect(res.onePieceVolumeM3).toBe(0.045);
    expect(res.piecesPerM3).toBe(22);
    expect(res.totalPieces).toBe(40);
    expect(res.totalVolumeM3).toBe(1.8);
  });

  it('Сценарий 2: Расчёт бруса 150х150х6000 мм по требуемой кубатуре (5 м³)', () => {
    const res = calculateLumber({
      thicknessMm: 150,
      widthMm: 150,
      lengthM: 6.0,
      mode: 'byVolume',
      volumeTargetM3: 5.0,
      marginPercent: 5
    });

    // 1 шт = 0.15 * 0.15 * 6 = 0.135 м³
    // 5 / 0.135 = 37.037 -> 38 шт без запаса
    // С запасом 5% = ceil(38 * 1.05) = 40 шт
    expect(res.onePieceVolumeM3).toBe(0.135);
    expect(res.totalPieces).toBe(40);
    expect(res.totalVolumeM3).toBeCloseTo(40 * 0.135, 3);
  });

  it('Сценарий 3: Расчёт половой доски 35х120х6000 мм по площади пола 60 м²', () => {
    const res = calculateLumber({
      thicknessMm: 35,
      widthMm: 120,
      lengthM: 6.0,
      mode: 'byArea',
      areaTargetM2: 60,
      marginPercent: 5
    });

    // Площадь 1 шт = 0.12 * 6 = 0.72 м²
    // 60 / 0.72 = 83.33 -> 84 шт
    // С запасом 5% = ceil(84 * 1.05) = 89 шт
    expect(res.totalPieces).toBe(89);
    expect(res.totalAreaM2).toBeGreaterThanOrEqual(60);
  });

  it('Граничные значения: Ошибка при некорректных нулевых или отрицательных размерах', () => {
    expect(() => calculateLumber({
      thicknessMm: 0,
      widthMm: 150,
      lengthM: 6,
      mode: 'byPieces',
      piecesCount: 10
    })).toThrowError();
  });
});
