/**
 * Чистая математика расчёта пиломатериалов (доска, брус)
 * Нормативная база: ГОСТ 8486-86, ГОСТ 2695-83.
 */

export type CalculationMode = 'byPieces' | 'byVolume' | 'byArea';
export type WoodMoisture = 'dry' | 'natural'; // сухая ~500 кг/м³, естественная влажность ~750 кг/м³

export interface LumberInput {
  thicknessMm: number;    // Толщина a, мм (например 25, 40, 50, 100, 150)
  widthMm: number;        // Ширина b, мм (например 100, 150, 200)
  lengthM: number;        // Длина L, м (обычно 6.0 или 3.0 м)
  mode: CalculationMode;  // Режим расчёта
  piecesCount?: number;   // Если режим 'byPieces'
  volumeTargetM3?: number;// Если режим 'byVolume'
  areaTargetM2?: number;  // Если режим 'byArea'
  moisture?: WoodMoisture;
  marginPercent?: number; // Запас, % (по умолчанию 5%)
}

export interface LumberResult {
  onePieceVolumeM3: number;   // Объём одной штуки, м³
  piecesPerM3: number;         // Количество целых штук в 1 м³
  piecesPerM3Exact: number;    // Точное число штук в 1 м³ (с десятыми)
  totalPieces: number;         // Итоговое количество штук с запасом
  totalVolumeM3: number;       // Итоговый объём с запасом, м³
  netVolumeM3: number;         // Чистый объём без запаса, м³
  totalAreaM2: number;         // Площадь покрытия данным количеством, м²
  approxWeightKg: number;      // Примерный вес партии, кг
  marginPercent: number;
}

export function calculateLumber(input: LumberInput): LumberResult {
  if (input.thicknessMm <= 0 || input.widthMm <= 0 || input.lengthM <= 0) {
    throw new Error('Размеры пиломатериала (толщина, ширина, длина) должны быть положительными');
  }

  // Объем одной единицы пиломатериала V = a * b * L
  const thicknessM = input.thicknessMm / 1000;
  const widthM = input.widthMm / 1000;
  const onePieceVolume = thicknessM * widthM * input.lengthM;

  if (onePieceVolume <= 0) {
    throw new Error('Некорректный нулевой объем пиломатериала');
  }

  const piecesPerM3Exact = 1 / onePieceVolume;
  const piecesPerM3 = Math.floor(piecesPerM3Exact);

  const margin = typeof input.marginPercent === 'number' && input.marginPercent >= 0 ? input.marginPercent : 5;
  const marginMultiplier = 1 + margin / 100;

  let totalPieces = 0;
  let netVolumeM3 = 0;

  if (input.mode === 'byPieces') {
    const rawPieces = input.piecesCount && input.piecesCount > 0 ? input.piecesCount : 1;
    totalPieces = Math.ceil(rawPieces * marginMultiplier);
    netVolumeM3 = rawPieces * onePieceVolume;
  } else if (input.mode === 'byVolume') {
    const rawVol = input.volumeTargetM3 && input.volumeTargetM3 > 0 ? input.volumeTargetM3 : 1;
    netVolumeM3 = rawVol;
    const rawPieces = Math.ceil(rawVol / onePieceVolume);
    totalPieces = Math.ceil(rawPieces * marginMultiplier);
  } else if (input.mode === 'byArea') {
    const rawArea = input.areaTargetM2 && input.areaTargetM2 > 0 ? input.areaTargetM2 : 1;
    const onePieceArea = widthM * input.lengthM;
    const rawPieces = Math.ceil(rawArea / onePieceArea);
    totalPieces = Math.ceil(rawPieces * marginMultiplier);
    netVolumeM3 = rawPieces * onePieceVolume;
  }

  const totalVolumeM3 = Math.round(totalPieces * onePieceVolume * 1000) / 1000;
  const totalAreaM2 = Math.round(totalPieces * widthM * input.lengthM * 100) / 100;

  // Плотность древесины: сухая сосна ~520 кг/м³, естественная влажность ~780 кг/м³
  const density = input.moisture === 'dry' ? 520 : 780;
  const approxWeightKg = Math.round(totalVolumeM3 * density);

  return {
    onePieceVolumeM3: Math.round(onePieceVolume * 100000) / 100000,
    piecesPerM3,
    piecesPerM3Exact: Math.round(piecesPerM3Exact * 100) / 100,
    totalPieces,
    totalVolumeM3,
    netVolumeM3: Math.round(netVolumeM3 * 1000) / 1000,
    totalAreaM2,
    approxWeightKg,
    marginPercent: margin
  };
}
