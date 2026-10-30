/**
 * Чистая математика расчёта кирпичной кладки
 * Нормативная база: ГОСТ 530-2012 «Кирпич и камень керамические».
 */

export type BrickType = 'single' | 'oneAndHalf' | 'double'; // одинарный 1НФ, полуторный 1.4НФ, двойной 2.1НФ
export type WallThickness = 0.5 | 1 | 1.5 | 2 | 2.5; // в кирпичах

export interface Opening {
  widthM: number;
  heightM: number;
  count: number;
}

export interface BrickInput {
  brickType: BrickType;
  wallLengthM: number;      // Длина стен, м
  wallHeightM: number;      // Высота стен, м
  wallThickness: WallThickness; // Толщина в кирпичах (0.5, 1, 1.5, 2, 2.5)
  openings?: Opening[];     // Оконные и дверные проёмы для вычета
  marginPercent?: number;   // Запас на подрезку и бой, % (по умолчанию 5%)
}

export interface BrickResult {
  totalWallAreaM2: number;     // Общая площадь стен, м²
  openingsAreaM2: number;      // Площадь вычитаемых проёмов, м²
  netWallAreaM2: number;       // Чистая площадь кладки, м²
  wallThicknessM: number;      // Толщина стены в метрах
  masonryVolumeM3: number;     // Чистый объём кладки, м³
  bricksPerM3: number;         // Норма расхода штук на 1 м³ кладки по ГОСТ
  totalBricksCount: number;    // Итоговое число кирпича с запасом, шт
  mortarVolumeM3: number;      // Ориентировочный объём кладочного раствора, м³
  palletsCount: number;        // Ориентировочное число поддонов (по ~350–400 шт)
  marginPercent: number;
}

// Нормы расхода кирпича на 1 м³ кладки с учетом растворных швов 10 мм (ГОСТ 530-2012)
export const BRICK_RATES_PER_M3: Record<BrickType, { name: string; sizeMm: string; perM3: number; perPallet: number }> = {
  single: {
    name: 'Одинарный (1НФ)',
    sizeMm: '250х120х65',
    perM3: 512,
    perPallet: 420
  },
  oneAndHalf: {
    name: 'Полуторный (1.4НФ)',
    sizeMm: '250х120х88',
    perM3: 378,
    perPallet: 350
  },
  double: {
    name: 'Двойной (2.1НФ)',
    sizeMm: '250х120х138',
    perM3: 242,
    perPallet: 200
  }
};

export const WALL_THICKNESS_METERS: Record<WallThickness, number> = {
  0.5: 0.12,
  1: 0.25,
  1.5: 0.38,
  2: 0.51,
  2.5: 0.64
};

export function calculateBricks(input: BrickInput): BrickResult {
  if (input.wallLengthM <= 0 || input.wallHeightM <= 0) {
    throw new Error('Длина и высота стены должны быть положительными числами');
  }

  const totalWallArea = input.wallLengthM * input.wallHeightM;

  // Вычет проёмов
  let openingsArea = 0;
  if (input.openings && input.openings.length > 0) {
    for (const op of input.openings) {
      if (op.widthM > 0 && op.heightM > 0 && op.count > 0) {
        openingsArea += op.widthM * op.heightM * op.count;
      }
    }
  }

  const netWallArea = Math.max(0, totalWallArea - openingsArea);
  const thicknessM = WALL_THICKNESS_METERS[input.wallThickness] || 0.25;
  const masonryVolumeM3 = netWallArea * thicknessM;

  const brickSpec = BRICK_RATES_PER_M3[input.brickType] || BRICK_RATES_PER_M3.single;
  const margin = typeof input.marginPercent === 'number' && input.marginPercent >= 0 ? input.marginPercent : 5;

  const rawBricksCount = masonryVolumeM3 * brickSpec.perM3;
  const totalBricksCount = Math.ceil(rawBricksCount * (1 + margin / 100));

  // Кладочный раствор занимает в среднем 23-25% от объема кладки
  const mortarVolumeM3 = Math.round(masonryVolumeM3 * 0.24 * 100) / 100;
  const palletsCount = Math.ceil(totalBricksCount / brickSpec.perPallet);

  return {
    totalWallAreaM2: Math.round(totalWallArea * 100) / 100,
    openingsAreaM2: Math.round(openingsArea * 100) / 100,
    netWallAreaM2: Math.round(netWallArea * 100) / 100,
    wallThicknessM: thicknessM,
    masonryVolumeM3: Math.round(masonryVolumeM3 * 100) / 100,
    bricksPerM3: brickSpec.perM3,
    totalBricksCount,
    mortarVolumeM3,
    palletsCount,
    marginPercent: margin
  };
}
