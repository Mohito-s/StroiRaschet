/**
 * Чистая математика расчёта бетонной смеси для фундаментов
 * Нормативная база: ГОСТ 7473-2010, ГОСТ 26633-2015.
 */

export type FoundationType = 'tape' | 'slab' | 'pillars';

export interface TapeFoundationInput {
  type: 'tape';
  totalLength: number; // Общая длина ленты (внешние + внутренние перемычки), м
  tapeWidth: number;   // Ширина ленты, м
  tapeHeight: number;  // Высота ленты, м
  marginPercent?: number; // Технологический запас, % (по умолчанию 5%)
}

export interface SlabFoundationInput {
  type: 'slab';
  slabLength: number; // Длина плиты, м
  slabWidth: number;  // Ширина плиты, м
  slabThickness: number; // Толщина плиты, м
  marginPercent?: number;
}

export interface PillarsFoundationInput {
  type: 'pillars';
  pillarCount: number; // Количество столбов/свай, шт
  pillarDiameter?: number; // Диаметр круглых свай, м
  pillarSideA?: number;    // Сторона прямоугольных столбов, м
  pillarSideB?: number;
  pillarHeight: number; // Глубина/высота столба, м
  isRound: boolean;
  marginPercent?: number;
}

export type ConcreteInput = TapeFoundationInput | SlabFoundationInput | PillarsFoundationInput;

export interface ConcreteResult {
  netVolumeM3: number;     // Геометрический объём без запаса, м³
  totalVolumeM3: number;   // Объём с учётом технологического запаса, м³
  marginPercent: number;   // Применённый процент запаса
  totalMassKg: number;     // Примерная масса бетона (при плотности 2400 кг/м³), кг
  trucksRequired: number;  // Ориентировочное число миксеров (по 7 м³), шт
  proportions?: {          // Ориентировочный справочный расход (Ц:П:Щ)
    cementKg: number;
    sandKg: number;
    crushedStoneKg: number;
    waterLiters: number;
    verified: false;
  };
}

export function calculateConcrete(input: ConcreteInput, concreteGrade: 'M200' | 'M250' | 'M300' = 'M250'): ConcreteResult {
  let netVolume = 0;

  if (input.type === 'tape') {
    if (input.totalLength <= 0 || input.tapeWidth <= 0 || input.tapeHeight <= 0) {
      throw new Error('Размеры ленты фундамента должны быть положительными числами');
    }
    netVolume = input.totalLength * input.tapeWidth * input.tapeHeight;
  } else if (input.type === 'slab') {
    if (input.slabLength <= 0 || input.slabWidth <= 0 || input.slabThickness <= 0) {
      throw new Error('Размеры фундаментной плиты должны быть положительными числами');
    }
    netVolume = input.slabLength * input.slabWidth * input.slabThickness;
  } else if (input.type === 'pillars') {
    if (input.pillarCount <= 0 || input.pillarHeight <= 0) {
      throw new Error('Количество столбов и высота должны быть положительными числами');
    }
    if (input.isRound) {
      const d = input.pillarDiameter || 0;
      if (d <= 0) throw new Error('Диаметр сваи должен быть положительным числом');
      const area = Math.PI * Math.pow(d / 2, 2);
      netVolume = input.pillarCount * area * input.pillarHeight;
    } else {
      const a = input.pillarSideA || 0;
      const b = input.pillarSideB || 0;
      if (a <= 0 || b <= 0) throw new Error('Стороны сечения столба должны быть положительными числами');
      netVolume = input.pillarCount * a * b * input.pillarHeight;
    }
  }

  const margin = typeof input.marginPercent === 'number' && input.marginPercent >= 0 ? input.marginPercent : 5;
  const totalVolume = netVolume * (1 + margin / 100);

  // Округление кубатуры до 2 знаков
  const roundedNet = Math.round(netVolume * 100) / 100;
  const roundedTotal = Math.round(totalVolume * 100) / 100;

  // Плотность тяжелого бетона по ГОСТ 26633-2015 ≈ 2400 кг/м³
  const totalMassKg = Math.round(roundedTotal * 2400);
  const trucksRequired = Math.ceil(roundedTotal / 7);

  // Справочные ориентировочные пропорции Ц:П:Щ на 1 м³ бетона (VERIFY: FALSE)
  let cementPerM3 = 330;
  let sandPerM3 = 700;
  let crushedPerM3 = 1150;
  let waterPerM3 = 185;

  if (concreteGrade === 'M200') {
    cementPerM3 = 280;
    sandPerM3 = 780;
    crushedPerM3 = 1200;
    waterPerM3 = 180;
  } else if (concreteGrade === 'M300') {
    cementPerM3 = 380;
    sandPerM3 = 650;
    crushedPerM3 = 1120;
    waterPerM3 = 195;
  }

  return {
    netVolumeM3: roundedNet,
    totalVolumeM3: roundedTotal,
    marginPercent: margin,
    totalMassKg,
    trucksRequired,
    proportions: {
      cementKg: Math.round(roundedTotal * cementPerM3),
      sandKg: Math.round(roundedTotal * sandPerM3),
      crushedStoneKg: Math.round(roundedTotal * crushedPerM3),
      waterLiters: Math.round(roundedTotal * waterPerM3),
      verified: false
    }
  };
}
