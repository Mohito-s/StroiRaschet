import { useState, useEffect } from 'preact/hooks';
import { calculateLumber, type CalculationMode, type LumberResult } from '../../lib/calc/pilomaterialy';
import { CalculationActions } from './CalculationActions';

const PRESET_BOARDS = [
  { name: 'Доска 50х150х6000', th: 50, w: 150, l: 6.0 },
  { name: 'Доска 25х100х6000', th: 25, w: 100, l: 6.0 },
  { name: 'Доска 40х150х6000', th: 40, w: 150, l: 6.0 },
  { name: 'Брус 100х100х6000', th: 100, w: 100, l: 6.0 },
  { name: 'Брус 150х150х6000', th: 150, w: 150, l: 6.0 },
  { name: 'Брус 150х200х6000', th: 150, w: 200, l: 6.0 },
];

export function PilomaterialyCalculator() {
  const [thickness, setThickness] = useState<string>('50');
  const [width, setWidth] = useState<string>('150');
  const [length, setLength] = useState<string>('6.0');
  const [mode, setMode] = useState<CalculationMode>('byPieces');
  const [targetPieces, setTargetPieces] = useState<string>('40');
  const [targetVolume, setTargetVolume] = useState<string>('5.0');
  const [targetArea, setTargetArea] = useState<string>('60');
  const margin = 5;

  const [result, setResult] = useState<LumberResult | null>(() => {
    try {
      return calculateLumber({
        thicknessMm: 50,
        widthMm: 150,
        lengthM: 6.0,
        mode: 'byPieces',
        piecesCount: 40,
        marginPercent: 5
      });
    } catch {
      return null;
    }
  });
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const th = parseFloat(thickness.replace(',', '.')) || 0;
      const w = parseFloat(width.replace(',', '.')) || 0;
      const l = parseFloat(length.replace(',', '.')) || 0;

      if (th > 0 && w > 0 && l > 0) {
        const res = calculateLumber({
          thicknessMm: th,
          widthMm: w,
          lengthM: l,
          mode,
          piecesCount: parseInt(targetPieces, 10) || 0,
          volumeTargetM3: parseFloat(targetVolume.replace(',', '.')) || 0,
          areaTargetM2: parseFloat(targetArea.replace(',', '.')) || 0,
          marginPercent: margin
        });
        setResult(res);
      } else {
        setResult(null);
      }
    } catch {
      setResult(null);
    }
  }, [thickness, width, length, mode, targetPieces, targetVolume, targetArea, margin]);

  const selectPreset = (p: typeof PRESET_BOARDS[0]) => {
    setThickness(String(p.th));
    setWidth(String(p.w));
    setLength(String(p.l));
  };

  const renderResultsContent = () => {
    if (!result) {
      return (
        <div class="glass-card rounded-2xl p-6 border border-[var(--border)] text-center text-[var(--text-muted)] text-xs">
          Заполните параметры пиломатериала для мгновенного инженерного расчёта.
        </div>
      );
    }

    return (
      <div class="space-y-5" aria-live="polite">
        {/* Metric Cards Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 [@media(min-width:900px)]:grid-cols-1 gap-3.5">
          <div class="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold block mb-1">
              Объём к заказу (с запасом 5%)
            </span>
            <div class="text-3xl sm:text-4xl font-black text-amber-800 dark:text-amber-400 font-mono truncate">
              {result.totalVolumeM3} <span class="text-lg font-sans text-amber-700 dark:text-amber-300">м³</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Чистый объём партии: {result.netVolumeM3} м³
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-sky-700 dark:text-cyan-300 font-bold block mb-1">
              Количество единиц
            </span>
            <div class="text-3xl sm:text-4xl font-black text-sky-800 dark:text-cyan-400 font-mono truncate">
              {result.totalPieces} <span class="text-lg font-sans text-sky-700 dark:text-cyan-300">досок</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              В одном кубе: {result.piecesPerM3} шт.
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
              Масса партии (сосна естественной влажн.)
            </span>
            <div class="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-400 font-mono truncate">
              {result.approxWeightKg} <span class="text-lg font-sans text-emerald-700 dark:text-emerald-300">кг</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Плотность: ~550 кг/м³ (ГОСТ 8486)
            </span>
          </div>
        </div>

        {/* Universal Actions */}
        <CalculationActions
          calcSlug="kalkulyator-pilomaterialov"
          calcName="Пиломатериалы (доска и брус)"
          defaultTitle={`Пиломатериалы ${thickness}×${width}×${length}м: ${result.totalVolumeM3} м³ (${result.totalPieces} шт)`}
          summaryText={`Сечение ${thickness}×${width} мм (длина ${length} м): объём ${result.totalVolumeM3} м³ (${result.totalPieces} шт.) • Вес: ${result.approxWeightKg} кг • Площадь: ${result.totalAreaM2} м²`}
        />

        {/* Table */}
        <div class="overflow-x-auto rounded-xl border border-[var(--border)] max-w-full">
          <table class="w-full text-xs text-left text-[var(--text)] min-w-[340px]">
            <thead class="bg-[var(--surface-hover)] text-[var(--text-muted)] font-semibold uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th class="px-3.5 py-2.5">Показатель</th>
                <th class="px-3.5 py-2.5">Значение</th>
                <th class="px-3.5 py-2.5">Ед.</th>
                <th class="px-3.5 py-2.5">Базис</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border)]">
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Объём 1 штуки</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.onePieceVolumeM3}</td>
                <td class="px-3.5 py-2">м³</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">V = a·b·L</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Штук в одном м³</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.piecesPerM3}</td>
                <td class="px-3.5 py-2">шт/м³</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">1 / V_ед</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Площадь покрытия</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.totalAreaM2}</td>
                <td class="px-3.5 py-2">м²</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">Ширина × Длина</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div class="calc-grid pb-20 [@media(min-width:900px)]:pb-0 max-w-full">
      <div class="grid grid-cols-1 [@media(min-width:900px)]:grid-cols-12 gap-6 lg:gap-8 items-start max-w-full">
        {/* Left Column: Form Inputs (7 cols on desktop) */}
        <div class="min-w-0 max-w-full [@media(min-width:900px)]:col-span-7 glass-card rounded-3xl p-5 sm:p-7 border border-[var(--border)] shadow-xl space-y-6">
          {/* Quick Presets */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Быстрый выбор типоразмера по ГОСТ 8486-86
            </label>
            <div class="flex flex-wrap gap-2 max-w-full">
              {PRESET_BOARDS.map((p) => (
                <button
                  type="button"
                  onClick={() => selectPreset(p)}
                  class="px-3 py-2 rounded-xl bg-[var(--surface-hover)] hover:border-[var(--accent)] border border-[var(--border)] text-xs text-[var(--text)] transition-all min-h-[38px] cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Dimensions */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="min-w-0">
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Толщина a (мм)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={thickness}
                onInput={(e) => setThickness((e.target as HTMLInputElement).value)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                placeholder="50"
              />
            </div>
            <div class="min-w-0">
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Ширина b (мм)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={width}
                onInput={(e) => setWidth((e.target as HTMLInputElement).value)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                placeholder="150"
              />
            </div>
            <div class="min-w-0">
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Длина L (м)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={length}
                onInput={(e) => setLength((e.target as HTMLInputElement).value)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                placeholder="6.0"
              />
            </div>
          </div>

          {/* Mode Selector */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Что вам известно для расчёта?
            </label>
            <div class="flex flex-wrap sm:grid sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] max-w-full">
              <button
                type="button"
                onClick={() => setMode('byPieces')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  mode === 'byPieces' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Нужно N штук
              </button>
              <button
                type="button"
                onClick={() => setMode('byVolume')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  mode === 'byVolume' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Нужно N кубов (м³)
              </button>
              <button
                type="button"
                onClick={() => setMode('byArea')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  mode === 'byArea' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                По площади (м²)
              </button>
            </div>
          </div>

          {/* Dynamic Target Input */}
          <div class="pt-2">
            {mode === 'byPieces' && (
              <div class="max-w-sm">
                <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                  Требуемое количество досок / бруса (шт)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={targetPieces}
                  onInput={(e) => setTargetPieces((e.target as HTMLInputElement).value)}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                  placeholder="40"
                />
              </div>
            )}
            {mode === 'byVolume' && (
              <div class="max-w-sm">
                <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                  Требуемый объём пиломатериала (м³)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetVolume}
                  onInput={(e) => setTargetVolume((e.target as HTMLInputElement).value)}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                  placeholder="5.0"
                />
              </div>
            )}
            {mode === 'byArea' && (
              <div class="max-w-sm">
                <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                  Площадь обшивки / настила (м²)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetArea}
                  onInput={(e) => setTargetArea((e.target as HTMLInputElement).value)}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                  placeholder="60"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Result Panel (5 cols on desktop, sticky top-20) */}
        <div id="calculator-result" class="min-w-0 max-w-full [@media(min-width:900px)]:col-span-5 [@media(min-width:900px)]:sticky [@media(min-width:900px)]:top-20 space-y-4">
          <div class="glass-card rounded-3xl p-5 sm:p-7 border border-[var(--border)] shadow-2xl">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border)] flex items-center justify-between">
              <span>Результат расчёта</span>
              {result && (
                <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                  ● Онлайн-обновление
                </span>
              )}
            </h3>
            {renderResultsContent()}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Summary Bar (<= 900px) */}
      {result && (
        <div class="fixed bottom-0 inset-x-0 z-40 [@media(min-width:900px)]:hidden bg-[var(--surface)] backdrop-blur-xl border-t border-[var(--border)] px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] flex items-center justify-between gap-3 text-[var(--text)]">
          <div class="min-w-0 flex-1">
            <span class="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] block truncate">
              Объём пиломатериала
            </span>
            <div class="text-xl sm:text-2xl font-black font-mono text-amber-700 dark:text-amber-400 truncate leading-none mt-0.5">
              {result.totalVolumeM3} <span class="text-sm font-sans text-amber-600 dark:text-amber-300">м³</span> ({result.totalPieces} шт)
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
            class="btn-primary text-xs py-2 px-3.5 min-h-[44px] flex items-center gap-1.5 font-bold flex-shrink-0 cursor-pointer shadow-lg"
          >
            <span>{isMobileDrawerOpen ? 'Свернуть' : 'Подробнее'}</span>
            <svg class={`w-4 h-4 transition-transform ${isMobileDrawerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile Drawer Sheet for Detailed Breakdown */}
      {result && isMobileDrawerOpen && (
        <div class="fixed inset-0 z-50 [@media(min-width:900px)]:hidden flex flex-col justify-end">
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          <div class="relative z-10 bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl text-[var(--text)]">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 class="text-sm font-bold uppercase tracking-wider text-[var(--text)]">
                  Полный расклад расчёта
                </h3>
                <span class="text-[11px] text-[var(--text-muted)]">
                  Партия: {result.totalVolumeM3} м³ ({result.totalPieces} шт)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                class="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] rounded-lg p-2"
                aria-label="Закрыть расклад"
              >
                ✕
              </button>
            </div>
            {renderResultsContent()}
          </div>
        </div>
      )}
    </div>
  );
}
