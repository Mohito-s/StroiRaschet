/**
 * Инженерный расчёт арматурного каркаса фундаментов
 * Нормативная база:
 * - СП 63.13330.2018 «Бетонные и железобетонные конструкции. Основные положения»
 * - ГОСТ 5781-82 / ГОСТ 34028-2016 «Прокат арматурный для железобетонных конструкций»
 * - СП 50-101-2004 «Проектирование и устройство оснований и фундаментов зданий и сооружений»
 */

export type ArmaturaFoundationType = 'tape' | 'slab';

/** Погонная масса стали по ГОСТ 5781-82 / ГОСТ 34028-2016 (кг на 1 пог. м) */
export const ARMATURA_WEIGHT_PER_METER: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  14: 1.210,
  16: 1.580,
  18: 2.000,
  20: 2.470,
};

export interface TapeArmaturaInput {
  type: 'tape';
  totalLength: number;       // Общая длина ленты (внешние + перемычки), м
  tapeWidth: number;         // Ширина ленты, м
  tapeHeight: number;        // Высота ленты, м
  cornersCount?: number;     // Количество внешних углов (по умолчанию 4)
  crossingsCount?: number;   // Количество Т-образных примыканий (по умолчанию 0)
  barsCount?: number;        // Число рабочих продольных стержней (обычно 4 или 6)
  workingDiameter?: number;  // Диаметр продольной арматуры (10, 12, 14, 16 мм)
  clampDiameter?: number;    // Диаметр хомутов (6 или 8 мм)
  clampSpacing?: number;     // Шаг хомутов по длине, м (0.3 - 0.5 м)
  coverLayer?: number;       // Защитный слой бетона, мм (обычно 35–50 мм, по умолчанию 40)
  marginPercent?: number;    // Запас на подрезку и стыки (по умолчанию 7%)
}

export interface SlabArmaturaInput {
  type: 'slab';
  slabLength: number;        // Длина плиты, м
  slabWidth: number;         // Ширина плиты, м
  slabThickness: number;     // Толщина плиты, м
  gridStep?: number;         // Шаг ячейки сетки, м (0.15 или 0.2 м)
  workingDiameter?: number;  // Диаметр рабочей сетки (10, 12, 14, 16 мм)
  frogDiameter?: number;     // Диаметр поддерживающих "лягушек" (8 или 10 мм)
  coverLayer?: number;       // Защитный слой бетона, мм (по умолчанию 40)
  marginPercent?: number;    // Запас на нахлёст и подрезку (по умолчанию 8%)
}

export type ArmaturaInput = TapeArmaturaInput | SlabArmaturaInput;

/** Параметры тарифов «Режима мастера» */
export interface MasterLaborRates {
  enabled: boolean;
  tieRatePerTon: number;        // Вязка армокаркаса за 1 тонну, руб (рынок 25 000 - 35 000)
  formworkRatePerSqm: number;   // Монтаж/демонтаж опалубки за 1 м², руб (рынок 600 - 900)
  concretePourPerM3: number;    // Приёмка бетона за 1 м³, руб (рынок 4 500 - 6 000)
}

export interface ArmaturaResult {
  foundationType: ArmaturaFoundationType;
  
  // Геометрия бетона
  concreteVolumeM3: number;
  concreteAreaSqm: number;
  formworkAreaSqm: number;

  // Продольная рабочая арматура
  workingDiameter: number;
  workingLengthM: number;
  workingWeightKg: number;
  workingBars117mCount: number;  // Эквивалент целых хлыстов 11.7 м
  workingBars6mCount: number;    // Эквивалент хлыстов 6.0 м

  // Поперечная конструктивная арматура (хомуты или лягушки)
  clampDiameter: number;
  clampCount: number;
  clampLengthM: number;
  clampWeightKg: number;

  // Угловое и торцевое усиление (Г-образные / П-образные анкеры)
  reinforcementWeightKg: number;
  reinforcementLengthM: number;

  // Общие показатели арматуры
  totalWeightKg: number;
  totalWeightTons: number;
  marginPercent: number;

  // Расходники
  wireWeightKg: number;          // Вязальная проволока d1.2 мм, кг
  wireKnotsCount: number;        // Количество узлов вязки
  fixatorsCount: number;         // Пластиковые фиксаторы защитного слоя, шт

  // Проверка норм СП 63.13330.2018
  minReinforcementNormPercent: number; // Нормативный минимум: 0.1%
  actualReinforcementPercent: number;  // Фактический процент армирования
  isNormCompliant: boolean;            // Выполняется ли требование СП
  normRecommendation?: string;         // Рекомендация эксперта

  // Режим мастера: Смета работ
  laborEstimate?: {
    tieCost: number;
    formworkCost: number;
    concreteCost: number;
    totalLaborCost: number;
    approxMaterialsCost: number; // При средней стоимости металлопроката ~75 000 руб/тн
    grandTotal: number;
  };
}

/**
 * Расчёт арматурного каркаса по СП 63.13330.2018
 */
export function calculateArmatura(
  input: ArmaturaInput,
  laborRates?: Partial<MasterLaborRates>
): ArmaturaResult {
  const margin = typeof input.marginPercent === 'number' && input.marginPercent >= 0 ? input.marginPercent : 7;
  const coverMm = input.coverLayer ?? 40;
  const coverM = coverMm / 1000;

  if (input.type === 'tape') {
    if (input.totalLength <= 0 || input.tapeWidth <= 0 || input.tapeHeight <= 0) {
      throw new Error('Размеры ленты фундамента должны быть положительными числами');
    }

    const { totalLength, tapeWidth, tapeHeight } = input;
    const corners = input.cornersCount ?? 4;
    const crossings = input.crossingsCount ?? 0;
    
    // Минимальное число рабочих стержней по СП: при высоте ленты > 80 см требуется не менее 6 стержней
    let barsCount = input.barsCount ?? (tapeHeight > 0.8 ? 6 : 4);
    if (barsCount < 4) barsCount = 4;

    const workingDiameter = input.workingDiameter ?? 12;
    const clampDiameter = input.clampDiameter ?? 8;
    const clampSpacing = input.clampSpacing ?? 0.35; // Шаг хомутов по СП (не более 0.75h и не более 500 мм)

    const wUnitWeight = ARMATURA_WEIGHT_PER_METER[workingDiameter] || 0.888;
    const cUnitWeight = ARMATURA_WEIGHT_PER_METER[clampDiameter] || 0.395;

    // 1. Продольные стержни с учётом нахлёстов (нахлёст = 50 * d)
    const overlapLenM = (50 * workingDiameter) / 1000;
    // Количество стыков при длине стандартного хлыста 11.7 м
    const standardBarLen = 11.7;
    const jointsPerLine = Math.max(0, Math.ceil(totalLength / standardBarLen) - 1);
    const lineLengthWithOverlaps = totalLength + jointsPerLine * overlapLenM;
    const rawWorkingLength = lineLengthWithOverlaps * barsCount;
    const workingLengthM = Math.round(rawWorkingLength * (1 + margin / 100) * 10) / 10;
    const workingWeightKg = Math.round(workingLengthM * wUnitWeight * 10) / 10;

    // 2. Хомуты (прямоугольные замкнутые рамки с загибом лапок 10 см)
    const innerW = Math.max(0.1, tapeWidth - 2 * coverM);
    const innerH = Math.max(0.1, tapeHeight - 2 * coverM);
    const clampPerimeter = 2 * (innerW + innerH) + 0.15; // +15 см нахлёст/крюки замка
    const clampsCount = Math.ceil(totalLength / clampSpacing) + corners * 2; // уплотнение шага на углах
    const rawClampLength = clampsCount * clampPerimeter;
    const clampLengthM = Math.round(rawClampLength * (1 + margin / 100) * 10) / 10;
    const clampWeightKg = Math.round(clampLengthM * cUnitWeight * 10) / 10;

    // 3. Усиление углов и Т-примыканий Г-образными анкерами (длина лапы 50d)
    const cornerAnchorLength = overlapLenM * 2; // две лапы
    const anchorsPerCorner = barsCount; // по числу продольных стержней
    const totalAnchorsCount = (corners + crossings * 2) * anchorsPerCorner;
    const reinforcementLengthM = Math.round(totalAnchorsCount * cornerAnchorLength * 10) / 10;
    const reinforcementWeightKg = Math.round(reinforcementLengthM * wUnitWeight * 10) / 10;

    // 4. Общий вес
    const totalWeightKg = Math.round((workingWeightKg + clampWeightKg + reinforcementWeightKg) * 10) / 10;
    const totalWeightTons = Math.round((totalWeightKg / 1000) * 1000) / 1000;

    // 5. Расходники
    // Узлы вязки: пересечение каждого продольного стержня с каждым хомутом + фиксация анкеров
    const wireKnotsCount = clampsCount * barsCount + totalAnchorsCount * 2;
    // Расход проволоки 1.2 мм: ~0.35 г на узел (или ~15 см проволоки)
    const wireWeightKg = Math.max(1, Math.round(wireKnotsCount * 0.00035 * 1.2 * 10) / 10);
    // Фиксаторы защитного слоя: 4 шт на метр погонный ленты (дно + бока)
    const fixatorsCount = Math.round(totalLength * 4);

    // 6. Проверка процента армирования по СП 63.13330.2018 (п. 10.3.6)
    // Минимальная площадь сечения продольной арматуры: 0.1% от рабочей площади бетона
    const concreteSectionAreaMm2 = tapeWidth * 1000 * tapeHeight * 1000;
    const singleBarAreaMm2 = (Math.PI * Math.pow(workingDiameter, 2)) / 4;
    const totalSteelAreaMm2 = singleBarAreaMm2 * barsCount;
    const actualPercent = Math.round((totalSteelAreaMm2 / concreteSectionAreaMm2) * 10000) / 100;
    const isNormCompliant = actualPercent >= 0.1;
    let normRecommendation: string | undefined;
    if (!isNormCompliant) {
      normRecommendation = `По СП 63.13330.2018 минимальный процент продольного армирования должен быть ≥ 0.10%. У вас ${actualPercent}%. Рекомендуется увеличить диаметр стержней до ${workingDiameter + 2} мм или добавить продольные ряды.`;
    }

    // Геометрия бетона и опалубки
    const concreteVolumeM3 = Math.round(totalLength * tapeWidth * tapeHeight * 100) / 100;
    const concreteAreaSqm = Math.round(totalLength * tapeWidth * 100) / 100;
    const formworkAreaSqm = Math.round(totalLength * 2 * tapeHeight * 100) / 100; // 2 стороны ленты

    // Расчёт сметы мастера
    let laborEstimate: ArmaturaResult['laborEstimate'];
    if (laborRates?.enabled) {
      const tieRate = laborRates.tieRatePerTon ?? 30000;
      const formworkRate = laborRates.formworkRatePerSqm ?? 700;
      const pourRate = laborRates.concretePourPerM3 ?? 5000;
      
      const tieCost = Math.round(totalWeightTons * tieRate);
      const formworkCost = Math.round(formworkAreaSqm * formworkRate);
      const concreteCost = Math.round(concreteVolumeM3 * pourRate);
      const totalLaborCost = tieCost + formworkCost + concreteCost;
      const approxMaterialsCost = Math.round(totalWeightTons * 75000 + concreteVolumeM3 * 6200);
      laborEstimate = {
        tieCost,
        formworkCost,
        concreteCost,
        totalLaborCost,
        approxMaterialsCost,
        grandTotal: totalLaborCost + approxMaterialsCost
      };
    }

    return {
      foundationType: 'tape',
      concreteVolumeM3,
      concreteAreaSqm,
      formworkAreaSqm,
      workingDiameter,
      workingLengthM,
      workingWeightKg,
      workingBars117mCount: Math.ceil(workingLengthM / 11.7),
      workingBars6mCount: Math.ceil(workingLengthM / 6.0),
      clampDiameter,
      clampCount: clampsCount,
      clampLengthM,
      clampWeightKg,
      reinforcementWeightKg,
      reinforcementLengthM,
      totalWeightKg,
      totalWeightTons,
      marginPercent: margin,
      wireWeightKg,
      wireKnotsCount,
      fixatorsCount,
      minReinforcementNormPercent: 0.1,
      actualReinforcementPercent: actualPercent,
      isNormCompliant,
      normRecommendation,
      laborEstimate
    };
  } else {
    // SLAB (Плитный фундамент)
    if (input.slabLength <= 0 || input.slabWidth <= 0 || input.slabThickness <= 0) {
      throw new Error('Размеры плиты фундамента должны быть положительными числами');
    }

    const { slabLength, slabWidth, slabThickness } = input;
    const gridStep = input.gridStep ?? 0.2; // 200х200 мм стандарт
    const workingDiameter = input.workingDiameter ?? 12;
    const frogDiameter = input.frogDiameter ?? 8;

    const wUnitWeight = ARMATURA_WEIGHT_PER_METER[workingDiameter] || 0.888;
    const fUnitWeight = ARMATURA_WEIGHT_PER_METER[frogDiameter] || 0.395;

    // Плита имеет 2 сетки (нижняя и верхняя). Каждая сетка состоит из продольных и поперечных прутков.
    const barsCountAlongLength = Math.ceil(slabWidth / gridStep) + 1;
    const barsCountAlongWidth = Math.ceil(slabLength / gridStep) + 1;

    // С учётом нахлёстов при длине хлыста 11.7 м
    const overlapLenM = (50 * workingDiameter) / 1000;
    const jointsX = Math.max(0, Math.ceil(slabLength / 11.7) - 1);
    const jointsY = Math.max(0, Math.ceil(slabWidth / 11.7) - 1);

    const lengthPerXBar = slabLength + jointsX * overlapLenM;
    const lengthPerYBar = slabWidth + jointsY * overlapLenM;

    // 2 сетки:
    const totalWorkingLenRaw = 2 * (barsCountAlongLength * lengthPerXBar + barsCountAlongWidth * lengthPerYBar);
    const workingLengthM = Math.round(totalWorkingLenRaw * (1 + margin / 100) * 10) / 10;
    const workingWeightKg = Math.round(workingLengthM * wUnitWeight * 10) / 10;

    // Поддерживающие лягушки между верхней и нижней сетками (высота = толщина плиты - 2 * защитный слой)
    const frogHeight = Math.max(0.08, slabThickness - 2 * coverM - (4 * workingDiameter) / 1000);
    // Периметр лягушки: нижние опорные лапки (20 см), вертикальные стойки (2*h), верхняя полка (25 см)
    const singleFrogLen = 0.25 + 2 * frogHeight + 0.40;
    // Плотность расстановки лягушек: ~1.5 - 2.0 шт на 1 м² плиты
    const slabArea = slabLength * slabWidth;
    const frogsCount = Math.ceil(slabArea * 1.8);
    const clampLengthM = Math.round(frogsCount * singleFrogLen * (1 + margin / 100) * 10) / 10;
    const clampWeightKg = Math.round(clampLengthM * fUnitWeight * 10) / 10;

    // Торцевое П-образное усиление торцов плиты по СП 63.13330 (шаг = шаг сетки по периметру)
    const slabPerimeter = 2 * (slabLength + slabWidth);
    const uElementsCount = Math.ceil(slabPerimeter / gridStep);
    const uElemLen = 2 * 0.4 + frogHeight; // П-образный элемент (две лапки по 40 см + высота)
    const reinforcementLengthM = Math.round(uElementsCount * uElemLen * 10) / 10;
    const reinforcementWeightKg = Math.round(reinforcementLengthM * wUnitWeight * 10) / 10;

    // Итоговый вес
    const totalWeightKg = Math.round((workingWeightKg + clampWeightKg + reinforcementWeightKg) * 10) / 10;
    const totalWeightTons = Math.round((totalWeightKg / 1000) * 1000) / 1000;

    // Расходники
    const knotsPerGrid = barsCountAlongLength * barsCountAlongWidth;
    const wireKnotsCount = knotsPerGrid * 2 + frogsCount * 4 + uElementsCount * 2;
    const wireWeightKg = Math.max(2, Math.round(wireKnotsCount * 0.00035 * 1.2 * 10) / 10);
    // Фиксаторы нижнего слоя плиты («стульчики»): 4-5 шт на 1 м²
    const fixatorsCount = Math.ceil(slabArea * 5);

    // Проверка СП 63.13330.2018 (процент армирования)
    const concreteSectionMm2 = slabWidth * 1000 * slabThickness * 1000;
    const singleBarMm2 = (Math.PI * Math.pow(workingDiameter, 2)) / 4;
    const totalSteelMm2 = singleBarMm2 * barsCountAlongLength * 2; // в обоих поясах
    const actualPercent = Math.round((totalSteelMm2 / concreteSectionMm2) * 10000) / 100;
    const isNormCompliant = actualPercent >= 0.1;
    let normRecommendation: string | undefined;
    if (!isNormCompliant) {
      normRecommendation = `По СП 63.13330.2018 минимальный процент продольного армирования должен быть ≥ 0.10%. У вас ${actualPercent}%. Рекомендуется уменьшить шаг ячейки до ${Math.round(gridStep * 1000 - 50)} мм или увеличить диаметр арматуры.`;
    }

    const concreteVolumeM3 = Math.round(slabLength * slabWidth * slabThickness * 100) / 100;
    const concreteAreaSqm = Math.round(slabArea * 100) / 100;
    const formworkAreaSqm = Math.round(slabPerimeter * slabThickness * 100) / 100;

    // Расчёт сметы мастера
    let laborEstimate: ArmaturaResult['laborEstimate'];
    if (laborRates?.enabled) {
      const tieRate = laborRates.tieRatePerTon ?? 28000;
      const formworkRate = laborRates.formworkRatePerSqm ?? 600;
      const pourRate = laborRates.concretePourPerM3 ?? 4800;
      
      const tieCost = Math.round(totalWeightTons * tieRate);
      const formworkCost = Math.round(formworkAreaSqm * formworkRate);
      const concreteCost = Math.round(concreteVolumeM3 * pourRate);
      const totalLaborCost = tieCost + formworkCost + concreteCost;
      const approxMaterialsCost = Math.round(totalWeightTons * 75000 + concreteVolumeM3 * 6200);
      laborEstimate = {
        tieCost,
        formworkCost,
        concreteCost,
        totalLaborCost,
        approxMaterialsCost,
        grandTotal: totalLaborCost + approxMaterialsCost
      };
    }

    return {
      foundationType: 'slab',
      concreteVolumeM3,
      concreteAreaSqm,
      formworkAreaSqm,
      workingDiameter,
      workingLengthM,
      workingWeightKg,
      workingBars117mCount: Math.ceil(workingLengthM / 11.7),
      workingBars6mCount: Math.ceil(workingLengthM / 6.0),
      clampDiameter: frogDiameter,
      clampCount: frogsCount,
      clampLengthM,
      clampWeightKg,
      reinforcementWeightKg,
      reinforcementLengthM,
      totalWeightKg,
      totalWeightTons,
      marginPercent: margin,
      wireWeightKg,
      wireKnotsCount,
      fixatorsCount,
      minReinforcementNormPercent: 0.1,
      actualReinforcementPercent: actualPercent,
      isNormCompliant,
      normRecommendation,
      laborEstimate
    };
  }
}
