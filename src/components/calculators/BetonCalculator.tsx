import { useState, useEffect } from 'preact/hooks';
import { calculateConcrete, type FoundationType, type ConcreteResult } from '../../lib/calc/beton';
import { CalculationActions } from './CalculationActions';

export function BetonCalculator() {
  const [type, setType] = useState<FoundationType>('tape');
  
  // Tape parameters
  const [totalLength, setTotalLength] = useState<string>('40');
  const [tapeWidth, setTapeWidth] = useState<string>('0.4');
  const [tapeHeight, setTapeHeight] = useState<string>('0.8');

  // Slab parameters
  const [slabLength, setSlabLength] = useState<string>('10');
  const [slabWidth, setSlabWidth] = useState<string>('10');
  const [slabThickness, setSlabThickness] = useState<string>('0.3');

  // Pillars parameters
  const [pillarCount, setPillarCount] = useState<string>('24');
  const [pillarDiameter, setPillarDiameter] = useState<string>('0.3');
  const [pillarHeight, setPillarHeight] = useState<string>('2.0');

  // General parameters
  const [margin, setMargin] = useState<number>(5);
  const [grade, setGrade] = useState<'M200' | 'M250' | 'M300'>('M250');
  const [result, setResult] = useState<ConcreteResult | null>(null);

  // Mobile bottom sheet state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Parse query string on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qType = params.get('type') as FoundationType;
    if (qType && ['tape', 'slab', 'pillars'].includes(qType)) setType(qType);

    if (params.get('length')) setTotalLength(params.get('length')!);
    if (params.get('width')) setTapeWidth(params.get('width')!);
    if (params.get('height')) setTapeHeight(params.get('height')!);
    if (params.get('margin')) setMargin(Number(params.get('margin')) || 5);
  }, []);

  // Recalculate on any input change
  useEffect(() => {
    try {
      const marginVal = Number(margin) || 0;
      let res: ConcreteResult;

      if (type === 'tape') {
        const l = parseFloat(totalLength.replace(',', '.')) || 0;
        const w = parseFloat(tapeWidth.replace(',', '.')) || 0;
        const h = parseFloat(tapeHeight.replace(',', '.')) || 0;
        if (l > 0 && w > 0 && h > 0) {
          res = calculateConcrete({ type: 'tape', totalLength: l, tapeWidth: w, tapeHeight: h, marginPercent: marginVal }, grade);
          setResult(res);
        } else {
          setResult(null);
        }
      } else if (type === 'slab') {
        const l = parseFloat(slabLength.replace(',', '.')) || 0;
        const w = parseFloat(slabWidth.replace(',', '.')) || 0;
        const t = parseFloat(slabThickness.replace(',', '.')) || 0;
        if (l > 0 && w > 0 && t > 0) {
          res = calculateConcrete({ type: 'slab', slabLength: l, slabWidth: w, slabThickness: t, marginPercent: marginVal }, grade);
          setResult(res);
        } else {
          setResult(null);
        }
      } else if (type === 'pillars') {
        const count = parseInt(pillarCount, 10) || 0;
        const d = parseFloat(pillarDiameter.replace(',', '.')) || 0;
        const h = parseFloat(pillarHeight.replace(',', '.')) || 0;
        if (count > 0 && d > 0 && h > 0) {
          res = calculateConcrete({ type: 'pillars', pillarCount: count, pillarDiameter: d, pillarHeight: h, isRound: true, marginPercent: marginVal }, grade);
          setResult(res);
        } else {
          setResult(null);
        }
      }
    } catch {
      setResult(null);
    }
  }, [type, totalLength, tapeWidth, tapeHeight, slabLength, slabWidth, slabThickness, pillarCount, pillarDiameter, pillarHeight, margin, grade]);

  // Render Full Results Content (reused in desktop column, mobile flow, and mobile bottom sheet)
  const renderResultsContent = () => {
    if (!result) {
      return (
        <div class="glass-card rounded-2xl p-6 border border-[var(--border)] text-center text-[var(--text-muted)] text-xs">
          Заполните положительные размеры фундамента для мгновенного инженерного расчёта.
        </div>
      );
    }

    return (
      <div class="space-y-5" aria-live="polite">
        {/* Metric Cards Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 [@media(min-width:900px)]:grid-cols-1 gap-3.5">
          <div class="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold block mb-1">
              Объём к заказу (запас {result.marginPercent}%)
            </span>
            <div class="text-3xl sm:text-4xl font-black text-amber-800 dark:text-amber-400 font-mono truncate">
              {result.totalVolumeM3} <span class="text-lg font-sans text-amber-700 dark:text-amber-300">м³</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Чистая геометрия: {result.netVolumeM3} м³
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-sky-700 dark:text-cyan-300 font-bold block mb-1">
              Масса смеси
            </span>
            <div class="text-3xl sm:text-4xl font-black text-sky-800 dark:text-cyan-400 font-mono truncate">
              {(result.totalMassKg / 1000).toFixed(1)} <span class="text-lg font-sans text-sky-700 dark:text-cyan-300">тонн</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Плотность ГОСТ: ~2400 кг/м³
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
              Автобетоносмесители
            </span>
            <div class="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-400 font-mono truncate">
              {result.trucksRequired} <span class="text-lg font-sans text-emerald-700 dark:text-emerald-300">рейсов</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              При загрузке по 7 м³ в рейс
            </span>
          </div>
        </div>

        {/* Universal Calculation Actions: "Мой дом", Поделиться, PDF */}
        <CalculationActions
          calcSlug="kalkulyator-betona"
          calcName="Бетон для фундамента"
          defaultTitle={`Фундамент (${type === 'tape' ? 'Лента' : type === 'slab' ? 'Плита' : 'Сваи'}): ${result.totalVolumeM3} м³`}
          summaryText={`Объём смеси: ${result.totalVolumeM3} м³ (запас ${result.marginPercent}%) • Вес: ${(result.totalMassKg / 1000).toFixed(1)} т • Миксеров (7 м³): ${result.trucksRequired} шт.`}
        />

        {/* Breakdown Table (responsive container) */}
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
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Геометрия опалубки</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.netVolumeM3}</td>
                <td class="px-3.5 py-2">м³</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">V = L·B·H</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Заказ с запасом</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.totalVolumeM3}</td>
                <td class="px-3.5 py-2">м³</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">Запас {result.marginPercent}%</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Масса смеси</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.totalMassKg}</td>
                <td class="px-3.5 py-2">кг</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">ГОСТ 26633</td>
              </tr>
              {result.proportions && (
                <tr>
                  <td class="px-3.5 py-2 font-medium text-[var(--text)]">Цемент М500</td>
                  <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.proportions.cementKg}</td>
                  <td class="px-3.5 py-2">кг</td>
                  <td class="px-3.5 py-2 text-amber-700 dark:text-amber-400">Ориентир</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div class="calc-grid pb-20 [@media(min-width:900px)]:pb-0 max-w-full">
      {/* 2-Column Desktop Grid (> 900px) / 1-Column Mobile (<= 900px) */}
      <div class="grid grid-cols-1 [@media(min-width:900px)]:grid-cols-12 gap-6 lg:gap-8 items-start max-w-full">
        {/* Left Column: Form Inputs (7 cols on desktop) */}
        <div class="min-w-0 max-w-full [@media(min-width:900px)]:col-span-7 glass-card rounded-3xl p-5 sm:p-7 border border-[var(--border)] shadow-xl space-y-6">
          {/* Type Selector (Segmented buttons with flex-wrap and min-h 44px) */}
          <div class="space-y-2">
            <label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Тип фундамента
            </label>
            <div class="flex flex-wrap sm:grid sm:grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] max-w-full">
              <button
                type="button"
                onClick={() => setType('tape')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  type === 'tape' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Ленточный
              </button>
              <button
                type="button"
                onClick={() => setType('slab')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  type === 'slab' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Монолитная плита
              </button>
              <button
                type="button"
                onClick={() => setType('pillars')}
                class={`flex-1 min-w-[100px] py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                  type === 'pillars' ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                Сваи / Столбы
              </button>
            </div>
          </div>

          {/* Dynamic Geometric Inputs */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {type === 'tape' && (
              <>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Длина ленты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalLength}
                    onInput={(e) => setTotalLength((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="40"
                  />
                  <span class="text-[11px] text-[var(--text-muted)] mt-1 block">С перемычками</span>
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Ширина ленты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tapeWidth}
                    onInput={(e) => setTapeWidth((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="0.4"
                  />
                  <span class="text-[11px] text-[var(--text-muted)] mt-1 block">Обычно 0.3–0.5 м</span>
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Высота ленты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={tapeHeight}
                    onInput={(e) => setTapeHeight((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="0.8"
                  />
                  <span class="text-[11px] text-[var(--text-muted)] mt-1 block">Глубина + цоколь</span>
                </div>
              </>
            )}

            {type === 'slab' && (
              <>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Длина плиты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={slabLength}
                    onInput={(e) => setSlabLength((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="10"
                  />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Ширина плиты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={slabWidth}
                    onInput={(e) => setSlabWidth((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="10"
                  />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Толщина плиты (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={slabThickness}
                    onInput={(e) => setSlabThickness((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="0.3"
                  />
                </div>
              </>
            )}

            {type === 'pillars' && (
              <>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Число свай (шт)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={pillarCount}
                    onInput={(e) => setPillarCount((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="24"
                  />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Диаметр сваи (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pillarDiameter}
                    onInput={(e) => setPillarDiameter((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="0.3"
                  />
                </div>
                <div class="min-w-0">
                  <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                    Глубина сваи (м)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pillarHeight}
                    onInput={(e) => setPillarHeight((e.target as HTMLInputElement).value)}
                    class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    placeholder="2.0"
                  />
                </div>
              </>
            )}
          </div>

          {/* Margin Slider & Grade Selector */}
          <div class="space-y-4 pt-4 border-t border-[var(--border)]">
            <div>
              <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                <label class="text-xs font-medium text-[var(--text)]">
                  Технологический запас: <strong class="text-amber-700 dark:text-amber-400">{margin}%</strong>
                </label>
                <span class="text-[10px] text-[var(--text-muted)]">Усадка и неровности опалубки</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={margin}
                onInput={(e) => setMargin(Number((e.target as HTMLInputElement).value))}
                class="w-full accent-amber-500 cursor-pointer"
              />
              <div class="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                <span>0% (чистый)</span>
                <span>5% (стандарт)</span>
                <span>15% (по грунту)</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Марка бетона (для ориентировочного состава)
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade((e.target as HTMLSelectElement).value as any)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
              >
                <option value="M200">Бетон М200 (В15) — для лёгких строений</option>
                <option value="M250">Бетон М250 (В20) — стандарт для ленты</option>
                <option value="M300">Бетон М300 (В22.5) — для плит и тяжёлых стен</option>
              </select>
            </div>
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
              Объём бетона (с запасом {result.marginPercent}%)
            </span>
            <div class="text-xl sm:text-2xl font-black font-mono text-amber-700 dark:text-amber-400 truncate leading-none mt-0.5">
              {result.totalVolumeM3} <span class="text-sm font-sans text-amber-600 dark:text-amber-300">м³</span>
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
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          {/* Sheet */}
          <div class="relative z-10 bg-[var(--surface)] border-t border-[var(--border)] rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 space-y-5 shadow-2xl text-[var(--text)]">
            <div class="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <h3 class="text-sm font-bold uppercase tracking-wider text-[var(--text)]">
                  Полный расклад расчёта
                </h3>
                <span class="text-[11px] text-[var(--text-muted)]">
                  Бетон: {result.totalVolumeM3} м³ ({result.trucksRequired} миксера)
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
