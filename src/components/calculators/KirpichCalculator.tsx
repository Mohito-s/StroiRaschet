import { useState, useEffect } from 'preact/hooks';
import { calculateBricks, type BrickType, type WallThickness, type BrickResult, BRICK_RATES_PER_M3 } from '../../lib/calc/kirpich';
import { CalculationActions } from './CalculationActions';

export function KirpichCalculator() {
  const [brickType, setBrickType] = useState<BrickType>('single');
  const [wallLength, setWallLength] = useState<string>('10');
  const [wallHeight, setWallHeight] = useState<string>('3.0');
  const [thickness, setThickness] = useState<WallThickness>(1.0);
  const [margin, setMargin] = useState<number>(5);

  // Openings
  const [winWidth, setWinWidth] = useState<string>('1.5');
  const [winHeight, setWinHeight] = useState<string>('1.4');
  const [winCount, setWinCount] = useState<string>('2');
  const [doorWidth, setDoorWidth] = useState<string>('1.0');
  const [doorHeight, setDoorHeight] = useState<string>('2.1');
  const [doorCount, setDoorCount] = useState<string>('1');

  const [result, setResult] = useState<BrickResult | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const l = parseFloat(wallLength.replace(',', '.')) || 0;
      const h = parseFloat(wallHeight.replace(',', '.')) || 0;
      const wW = parseFloat(winWidth.replace(',', '.')) || 0;
      const wH = parseFloat(winHeight.replace(',', '.')) || 0;
      const wC = parseInt(winCount, 10) || 0;
      const dW = parseFloat(doorWidth.replace(',', '.')) || 0;
      const dH = parseFloat(doorHeight.replace(',', '.')) || 0;
      const dC = parseInt(doorCount, 10) || 0;

      if (l > 0 && h > 0) {
        const res = calculateBricks({
          brickType,
          wallLengthM: l,
          wallHeightM: h,
          wallThickness: thickness,
          openings: [
            { widthM: wW, heightM: wH, count: wC },
            { widthM: dW, heightM: dH, count: dC }
          ],
          marginPercent: margin
        });
        setResult(res);
      } else {
        setResult(null);
      }
    } catch {
      setResult(null);
    }
  }, [brickType, wallLength, wallHeight, thickness, margin, winWidth, winHeight, winCount, doorWidth, doorHeight, doorCount]);

  const renderResultsContent = () => {
    if (!result) {
      return (
        <div class="glass-card rounded-2xl p-6 border border-[var(--border)] text-center text-[var(--text-muted)] text-xs">
          Заполните размеры стен для автоматического расчёта количества кирпича.
        </div>
      );
    }

    return (
      <div class="space-y-5" aria-live="polite">
        {/* Metric Cards Grid */}
        <div class="grid grid-cols-1 sm:grid-cols-3 [@media(min-width:900px)]:grid-cols-1 gap-3.5">
          <div class="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-bold block mb-1">
              Кирпича к заказу (запас {margin}%)
            </span>
            <div class="text-3xl sm:text-4xl font-black text-amber-800 dark:text-amber-400 font-mono truncate">
              {result.totalBricksCount} <span class="text-lg font-sans text-amber-700 dark:text-amber-300">шт.</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Чистое количество: {Math.round(result.totalBricksCount / (1 + margin / 100))} шт.
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-sky-700 dark:text-cyan-300 font-bold block mb-1">
              Кладочный раствор
            </span>
            <div class="text-3xl sm:text-4xl font-black text-sky-800 dark:text-cyan-400 font-mono truncate">
              {result.mortarVolumeM3} <span class="text-lg font-sans text-sky-700 dark:text-cyan-300">м³</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              Шов: 10 мм по ГОСТ 530-2012
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 min-w-0">
            <span class="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300 font-bold block mb-1">
              Чистая площадь кладки
            </span>
            <div class="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-400 font-mono truncate">
              {result.netWallAreaM2} <span class="text-lg font-sans text-emerald-700 dark:text-emerald-300">м²</span>
            </div>
            <span class="text-[11px] text-[var(--text-muted)] mt-1 block">
              За вычетом проёмов: {result.openingsAreaM2} м²
            </span>
          </div>
        </div>

        {/* Universal Actions */}
        <CalculationActions
          calcSlug="kalkulyator-kirpicha"
          calcName="Кирпичная кладка стен"
          defaultTitle={`Кладка кирпича: ${result.totalBricksCount} шт. (${result.masonryVolumeM3} м³)`}
          summaryText={`Кирпич (${BRICK_RATES_PER_M3[brickType].name}): ${result.totalBricksCount} шт. (запас ${margin}%) • Раствор: ${result.mortarVolumeM3} м³ • Площадь: ${result.netWallAreaM2} м²`}
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
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Объём кладки стен</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.masonryVolumeM3}</td>
                <td class="px-3.5 py-2">м³</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">V = S_net · t</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Кирпич без запаса</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{Math.round(result.totalBricksCount / (1 + margin / 100))}</td>
                <td class="px-3.5 py-2">шт.</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">ГОСТ 530-2012</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">К заказу с боем</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.totalBricksCount}</td>
                <td class="px-3.5 py-2">шт.</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">Запас {margin}%</td>
              </tr>
              <tr>
                <td class="px-3.5 py-2 font-medium text-[var(--text)]">Вычтено проёмов</td>
                <td class="px-3.5 py-2 font-mono text-amber-700 dark:text-amber-300 font-semibold">{result.openingsAreaM2}</td>
                <td class="px-3.5 py-2">м²</td>
                <td class="px-3.5 py-2 text-[var(--text-muted)]">Окна + двери</td>
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
          {/* Brick Type Selector */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3">
              Формат кирпича по ГОСТ 530-2012
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-full">
              {(Object.keys(BRICK_RATES_PER_M3) as BrickType[]).map((key) => {
                const spec = BRICK_RATES_PER_M3[key];
                const active = brickType === key;
                return (
                  <button
                    type="button"
                    onClick={() => setBrickType(key)}
                    class={`p-3 sm:p-4 rounded-2xl border text-left transition-all min-h-[44px] flex flex-col justify-between cursor-pointer ${
                      active
                        ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--text)] shadow-lg'
                        : 'bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div>
                      <span class="text-xs font-bold block mb-1 text-[var(--text)]">{spec.name}</span>
                      <span class="text-[11px] font-mono text-amber-700 dark:text-amber-300 block font-semibold">{spec.sizeMm} мм</span>
                    </div>
                    <span class="text-[10px] text-[var(--text-muted)] mt-2 block">
                      ~{spec.perM3} шт / м³
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Wall Dimensions */}
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="min-w-0">
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Длина стен (м)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={wallLength}
                onInput={(e) => setWallLength((e.target as HTMLInputElement).value)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                placeholder="10"
              />
            </div>
            <div class="min-w-0">
              <label class="block text-xs font-medium text-[var(--text)] mb-1.5">
                Высота стен (м)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={wallHeight}
                onInput={(e) => setWallHeight((e.target as HTMLInputElement).value)}
                class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                placeholder="3.0"
              />
            </div>
          </div>

          {/* Wall Thickness Selector (Segmented buttons with flex-wrap) */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Толщина стены
            </label>
            <div class="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] max-w-full">
              {[
                { val: 0.5, label: '0.5 кирпича (120 мм)' },
                { val: 1.0, label: '1 кирпич (250 мм)' },
                { val: 1.5, label: '1.5 кирпича (380 мм)' },
                { val: 2.0, label: '2 кирпича (510 мм)' }
              ].map((item) => (
                <button
                  type="button"
                  onClick={() => setThickness(item.val as WallThickness)}
                  class={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] flex items-center justify-center cursor-pointer text-center ${
                    thickness === item.val
                      ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-lg'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Openings Form */}
          <div class="pt-4 border-t border-[var(--border)] space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Вычет оконных и дверных проёмов
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="p-3.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-2">
                <span class="text-xs font-semibold text-[var(--text)] block">Оконные проёмы</span>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Ширина (м)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={winWidth}
                      onInput={(e) => setWinWidth((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Высота (м)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={winHeight}
                      onInput={(e) => setWinHeight((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Кол-во (шт)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={winCount}
                      onInput={(e) => setWinCount((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div class="p-3.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-2">
                <span class="text-xs font-semibold text-[var(--text)] block">Дверные проёмы</span>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Ширина (м)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={doorWidth}
                      onInput={(e) => setDoorWidth((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Высота (м)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={doorHeight}
                      onInput={(e) => setDoorHeight((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label class="text-[10px] text-[var(--text-muted)] block mb-1">Кол-во (шт)</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={doorCount}
                      onInput={(e) => setDoorCount((e.target as HTMLInputElement).value)}
                      class="w-full px-2.5 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] text-base min-h-[44px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Margin Slider */}
          <div class="pt-4 border-t border-[var(--border)]">
            <div class="flex justify-between items-center mb-1.5 flex-wrap gap-1">
              <label class="text-xs font-medium text-[var(--text)]">
                Запас на бой и подрезку: <strong class="text-amber-700 dark:text-amber-400">{margin}%</strong>
              </label>
              <span class="text-[10px] text-[var(--text-muted)]">СП 70.13330</span>
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
              <span>0% (без запаса)</span>
              <span>5% (норма)</span>
              <span>15% (сложный фасад)</span>
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
              Кирпича к заказу (запас {margin}%)
            </span>
            <div class="text-xl sm:text-2xl font-black font-mono text-amber-700 dark:text-amber-400 truncate leading-none mt-0.5">
              {result.totalBricksCount} <span class="text-sm font-sans text-amber-600 dark:text-amber-300">шт.</span>
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
                  Кирпич: {result.totalBricksCount} шт. • Раствор: {result.mortarVolumeM3} м³
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
