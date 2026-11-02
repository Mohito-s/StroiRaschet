import { useState, useEffect } from 'preact/hooks';
import {
  calculateArmatura,
  type ArmaturaFoundationType,
  type ArmaturaResult,
  type MasterLaborRates
} from '../../lib/calc/armatura';
import { CalculationActions } from './CalculationActions';

export function ArmaturaCalculator() {
  const [type, setType] = useState<ArmaturaFoundationType>('tape');

  // Tape parameters
  const [totalLength, setTotalLength] = useState<string>('40');
  const [tapeWidth, setTapeWidth] = useState<string>('0.4');
  const [tapeHeight, setTapeHeight] = useState<string>('0.8');
  const [cornersCount, setCornersCount] = useState<string>('4');
  const [crossingsCount, setCrossingsCount] = useState<string>('0');
  const [barsCount, setBarsCount] = useState<string>('4');
  const [tapeWorkingDiameter, setTapeWorkingDiameter] = useState<number>(12);
  const [clampDiameter, setClampDiameter] = useState<number>(8);
  const [clampSpacing, setClampSpacing] = useState<string>('0.35');

  // Slab parameters
  const [slabLength, setSlabLength] = useState<string>('10');
  const [slabWidth, setSlabWidth] = useState<string>('10');
  const [slabThickness, setSlabThickness] = useState<string>('0.3');
  const [gridStep, setGridStep] = useState<string>('0.2');
  const [slabWorkingDiameter, setSlabWorkingDiameter] = useState<number>(12);
  const [frogDiameter, setFrogDiameter] = useState<number>(8);

  // General parameters
  const [coverLayer, setCoverLayer] = useState<number>(40);
  const [margin, setMargin] = useState<number>(7);

  // Master Mode State (Labor rates)
  const [masterMode, setMasterMode] = useState<boolean>(false);
  const [tieRate, setTieRate] = useState<string>('30000');
  const [formworkRate, setFormworkRate] = useState<string>('700');
  const [pourRate, setPourRate] = useState<string>('5000');

  // Result & Drawer
  const [result, setResult] = useState<ArmaturaResult | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Recalculate
  useEffect(() => {
    try {
      const marginVal = Number(margin) || 7;
      const coverVal = Number(coverLayer) || 40;
      const labor: MasterLaborRates = {
        enabled: masterMode,
        tieRatePerTon: parseFloat(tieRate) || 30000,
        formworkRatePerSqm: parseFloat(formworkRate) || 700,
        concretePourPerM3: parseFloat(pourRate) || 5000
      };

      if (type === 'tape') {
        const l = parseFloat(totalLength.replace(',', '.')) || 0;
        const w = parseFloat(tapeWidth.replace(',', '.')) || 0;
        const h = parseFloat(tapeHeight.replace(',', '.')) || 0;
        const corners = parseInt(cornersCount, 10) || 4;
        const crossings = parseInt(crossingsCount, 10) || 0;
        const bars = parseInt(barsCount, 10) || 4;
        const spacing = parseFloat(clampSpacing.replace(',', '.')) || 0.35;

        if (l > 0 && w > 0 && h > 0) {
          const res = calculateArmatura(
            {
              type: 'tape',
              totalLength: l,
              tapeWidth: w,
              tapeHeight: h,
              cornersCount: corners,
              crossingsCount: crossings,
              barsCount: bars,
              workingDiameter: tapeWorkingDiameter,
              clampDiameter,
              clampSpacing: spacing,
              coverLayer: coverVal,
              marginPercent: marginVal
            },
            labor
          );
          setResult(res);
        } else {
          setResult(null);
        }
      } else {
        const l = parseFloat(slabLength.replace(',', '.')) || 0;
        const w = parseFloat(slabWidth.replace(',', '.')) || 0;
        const t = parseFloat(slabThickness.replace(',', '.')) || 0;
        const step = parseFloat(gridStep.replace(',', '.')) || 0.2;

        if (l > 0 && w > 0 && t > 0) {
          const res = calculateArmatura(
            {
              type: 'slab',
              slabLength: l,
              slabWidth: w,
              slabThickness: t,
              gridStep: step,
              workingDiameter: slabWorkingDiameter,
              frogDiameter,
              coverLayer: coverVal,
              marginPercent: marginVal
            },
            labor
          );
          setResult(res);
        } else {
          setResult(null);
        }
      }
    } catch {
      setResult(null);
    }
  }, [
    type,
    totalLength,
    tapeWidth,
    tapeHeight,
    cornersCount,
    crossingsCount,
    barsCount,
    tapeWorkingDiameter,
    clampDiameter,
    clampSpacing,
    slabLength,
    slabWidth,
    slabThickness,
    gridStep,
    slabWorkingDiameter,
    frogDiameter,
    coverLayer,
    margin,
    masterMode,
    tieRate,
    formworkRate,
    pourRate
  ]);

  // Dynamic SVG Section Diagram (Auto-scales to inputs)
  const renderDiagram = () => {
    if (type === 'tape') {
      const w = parseFloat(tapeWidth) || 0.4;
      const h = parseFloat(tapeHeight) || 0.8;
      const bars = parseInt(barsCount, 10) || 4;
      const d = tapeWorkingDiameter;

      return (
        <div class="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Схема поперечного сечения ленты (СП 63.13330)</span>
            <span class="font-mono text-[var(--accent)]">{Math.round(w * 1000)}×{Math.round(h * 1000)} мм</span>
          </div>
          <svg viewBox="0 0 280 200" class="w-full h-44 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <defs>
              <pattern id="concrete-hatch" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="currentColor" stroke-width="0.5" class="text-slate-500/20" />
              </pattern>
            </defs>

            {/* Concrete tape rect */}
            <rect x="70" y="20" width="140" height="150" fill="url(#concrete-hatch)" stroke="currentColor" stroke-width="1.5" class="text-slate-400 dark:text-slate-500" rx="2" />
            
            {/* Clamp cage (outer stirrup) */}
            <rect x="85" y="35" width="110" height="120" fill="none" stroke="currentColor" stroke-width="2.5" class="text-emerald-500 dark:text-emerald-400" rx="3" stroke-dasharray="0" />

            {/* Rebar dots (top & bottom layers, plus mid layer if barsCount === 6) */}
            {/* Bottom 2 bars */}
            <circle cx="95" cy="145" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
            <circle cx="185" cy="145" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
            
            {/* Top 2 bars */}
            <circle cx="95" cy="45" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
            <circle cx="185" cy="45" r="5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />

            {/* Mid bars if 6 bars */}
            {bars >= 6 && (
              <>
                <circle cx="95" cy="95" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
                <circle cx="185" cy="95" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" />
              </>
            )}

            {/* Dimensions and callouts */}
            <text x="140" y="15" text-anchor="middle" font-size="9" fill="currentColor" class="text-[var(--text-muted)] font-mono font-bold">b = {Math.round(w * 1000)} мм</text>
            <text x="50" y="100" text-anchor="middle" font-size="9" fill="currentColor" class="text-[var(--text-muted)] font-mono font-bold" transform="rotate(-90 50 100)">h = {Math.round(h * 1000)} мм</text>
            <text x="140" y="185" text-anchor="middle" font-size="9" fill="currentColor" class="text-amber-600 dark:text-amber-400 font-mono">
              Рабочая арматура: {bars} шт ⌀{d} мм (A500C)
            </text>
            <text x="140" y="98" text-anchor="middle" font-size="8" fill="currentColor" class="text-emerald-600 dark:text-emerald-400 font-mono">
              Хомут: ⌀{clampDiameter} мм (шаг {clampSpacing} м)
            </text>
          </svg>
        </div>
      );
    } else {
      const step = parseFloat(gridStep) || 0.2;
      const d = slabWorkingDiameter;
      return (
        <div class="p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-2">
          <div class="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
            <span>Схема двойного армирования плиты (СП 63.13330)</span>
            <span class="font-mono text-[var(--accent)]">Ячейка {Math.round(step * 1000)}×{Math.round(step * 1000)} мм</span>
          </div>
          <svg viewBox="0 0 280 200" class="w-full h-44 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <defs>
              <pattern id="concrete-hatch-slab" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="currentColor" stroke-width="0.5" class="text-slate-500/20" />
              </pattern>
            </defs>

            {/* Concrete slab slice */}
            <rect x="30" y="45" width="220" height="110" fill="url(#concrete-hatch-slab)" stroke="currentColor" stroke-width="1.5" class="text-slate-400 dark:text-slate-500" rx="3" />

            {/* Top mesh line */}
            <line x1="45" y1="65" x2="235" y2="65" stroke="#f59e0b" stroke-width="3" />
            {/* Top mesh cross dots */}
            <circle cx="65" cy="65" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="115" cy="65" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="165" cy="65" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="215" cy="65" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />

            {/* Bottom mesh line */}
            <line x1="45" y1="135" x2="235" y2="135" stroke="#f59e0b" stroke-width="3" />
            {/* Bottom mesh cross dots */}
            <circle cx="65" cy="135" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="115" cy="135" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="165" cy="135" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />
            <circle cx="215" cy="135" r="4.5" fill="#f59e0b" stroke="#b45309" stroke-width="1" />

            {/* Frog support spacer (зелёная лягушка между сетками) */}
            <path d="M 120 135 L 130 135 L 138 65 L 152 65 L 160 135 L 170 135" fill="none" stroke="#10b981" stroke-width="2" />

            <text x="140" y="35" text-anchor="middle" font-size="9" fill="currentColor" class="text-amber-600 dark:text-amber-400 font-mono font-bold">
              2 сетки: верхняя и нижняя ⌀{d} мм
            </text>
            <text x="140" y="105" text-anchor="middle" font-size="8.5" fill="currentColor" class="text-emerald-600 dark:text-emerald-400 font-mono">
              Фиксатор-лягушка ⌀{frogDiameter} мм
            </text>
            <text x="140" y="180" text-anchor="middle" font-size="9" fill="currentColor" class="text-[var(--text-muted)] font-mono">
              Защитный слой: {coverLayer} мм (пластиковые фиксаторы)
            </text>
          </svg>
        </div>
      );
    }
  };

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
        {/* Main Metric Hero Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div class="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 min-w-0">
            <span class="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 block truncate">
              Общий вес арматуры (с запасом {result.marginPercent}%)
            </span>
            <div class="text-2xl sm:text-3xl font-black font-mono text-amber-800 dark:text-amber-300 mt-1 truncate">
              {result.totalWeightTons} <span class="text-base font-sans font-bold">тн</span>
              <span class="text-xs font-mono font-normal text-amber-700/80 dark:text-amber-400/80 ml-2">({result.totalWeightKg} кг)</span>
            </div>
            <span class="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1 block">
              Сталь А500С / А400 (ГОСТ 5781-82)
            </span>
          </div>

          <div class="p-4 sm:p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 min-w-0">
            <span class="text-[10px] uppercase font-bold tracking-wider text-cyan-700 dark:text-cyan-400 block truncate">
              Общий погонаж стержней
            </span>
            <div class="text-2xl sm:text-3xl font-black font-mono text-cyan-800 dark:text-cyan-300 mt-1 truncate">
              {Math.round(result.workingLengthM + result.clampLengthM + result.reinforcementLengthM)} <span class="text-base font-sans font-bold">м</span>
            </div>
            <span class="text-[11px] text-cyan-800/80 dark:text-cyan-300/80 mt-1 block">
              ~{result.workingBars117mCount} хлыстов по 11.7 м (или {result.workingBars6mCount} по 6 м)
            </span>
          </div>
        </div>

        {/* SP 63.13330 Norm Compliance Alert Badge */}
        <div class={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${result.isNormCompliant ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'}`}>
          <span class="text-base shrink-0 mt-0.5">{result.isNormCompliant ? '✓' : '⚠️'}</span>
          <div class="space-y-1">
            <div class="font-bold flex items-center gap-2">
              <span>Норма армирования СП 63.13330.2018: {result.isNormCompliant ? 'Выполняется' : 'Требует усиления'}</span>
              <span class="font-mono text-[11px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">μ = {result.actualReinforcementPercent}% (мин. 0.10%)</span>
            </div>
            {result.normRecommendation && (
              <p class="text-[11px] leading-relaxed opacity-90">{result.normRecommendation}</p>
            )}
          </div>
        </div>

        {/* Detailed Material Breakdown Table */}
        <div class="p-4 sm:p-5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-[var(--text)] pb-2 border-b border-[var(--border)] flex items-center justify-between">
            <span>Спецификация металлопроката</span>
            <span class="text-[10px] text-[var(--text-muted)] font-normal">ГОСТ 5781-82 / ГОСТ 34028</span>
          </h4>

          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between py-1 border-b border-[var(--border)]/50">
              <span class="text-[var(--text-muted)]">
                Рабочая арматура ⌀{result.workingDiameter} мм:
              </span>
              <span class="font-mono font-bold text-[var(--text)]">
                {result.workingLengthM} м ({result.workingWeightKg} кг)
              </span>
            </div>

            <div class="flex items-center justify-between py-1 border-b border-[var(--border)]/50">
              <span class="text-[var(--text-muted)]">
                {type === 'tape' ? `Хомуты ⌀${result.clampDiameter} мм (${result.clampCount} шт):` : `Фиксаторы-лягушки ⌀${result.clampDiameter} мм (${result.clampCount} шт):`}
              </span>
              <span class="font-mono font-bold text-[var(--text)]">
                {result.clampLengthM} м ({result.clampWeightKg} кг)
              </span>
            </div>

            <div class="flex items-center justify-between py-1 border-b border-[var(--border)]/50">
              <span class="text-[var(--text-muted)]">
                {type === 'tape' ? 'Угловые Г-образные анкеры:' : 'Торцевое П-усиление контура:'}
              </span>
              <span class="font-mono font-bold text-[var(--text)]">
                {result.reinforcementLengthM} м ({result.reinforcementWeightKg} кг)
              </span>
            </div>

            <div class="flex items-center justify-between py-1 border-b border-[var(--border)]/50">
              <span class="text-[var(--text-muted)]">Вязальная проволока ⌀1.2 мм ({result.wireKnotsCount} узлов):</span>
              <span class="font-mono font-bold text-[var(--text)]">~{result.wireWeightKg} кг</span>
            </div>

            <div class="flex items-center justify-between py-1">
              <span class="text-[var(--text-muted)]">Пластиковые фиксаторы защитного слоя:</span>
              <span class="font-mono font-bold text-[var(--text)]">{result.fixatorsCount} шт</span>
            </div>
          </div>
        </div>

        {/* Master Mode Breakdown Section (if enabled) */}
        {masterMode && result.laborEstimate && (
          <div class="p-4 sm:p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-indigo-500/30">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Смета «Режима мастера» (ЕНиР)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                🖨️ Печать сметы
              </button>
            </div>

            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between py-1 border-b border-indigo-500/20">
                <span class="text-[var(--text-muted)]">Вязка и укладка арматуры ({result.totalWeightTons} тн):</span>
                <span class="font-mono font-bold text-[var(--text)]">{result.laborEstimate.tieCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-indigo-500/20">
                <span class="text-[var(--text-muted)]">Монтаж опалубки ({result.formworkAreaSqm} м²):</span>
                <span class="font-mono font-bold text-[var(--text)]">{result.laborEstimate.formworkCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div class="flex items-center justify-between py-1 border-b border-indigo-500/20">
                <span class="text-[var(--text-muted)]">Приёмка и вибрирование бетона ({result.concreteVolumeM3} м³):</span>
                <span class="font-mono font-bold text-[var(--text)]">{result.laborEstimate.concreteCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div class="flex items-center justify-between py-1.5 font-bold border-t border-indigo-500/40 text-indigo-700 dark:text-indigo-300">
                <span>Итого за работу бригады:</span>
                <span class="font-mono text-sm">{result.laborEstimate.totalLaborCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div class="flex items-center justify-between py-1 text-[var(--text-muted)] text-[11px]">
                <span>Ориентировочная стоимость материалов:</span>
                <span class="font-mono">~{result.laborEstimate.approxMaterialsCost.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div class="flex items-center justify-between pt-2 border-t-2 border-indigo-500/50 font-black text-sm text-[var(--text)]">
                <span>Бюджет фундамента под ключ:</span>
                <span class="font-mono text-base text-indigo-600 dark:text-indigo-400">
                  ~{result.laborEstimate.grandTotal.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons: Save to MyHouse, Share, Copy */}
        <CalculationActions
          calcSlug="kalkulyator-armatury"
          calcName="Арматурный каркас фундамента"
          defaultTitle={`Арматура фундамента (${result.totalWeightTons} тн)`}
          summaryText={`Арматура фундамента: ${result.totalWeightTons} тн (${result.workingDiameter} мм, ${result.workingBars117mCount} хлыстов 11.7м), хомуты ⌀${result.clampDiameter} мм (${result.clampCount} шт), проволока ~${result.wireWeightKg} кг, фиксаторы ${result.fixatorsCount} шт. Расчёт по СП 63.13330 на stroyraschet.ru`}
        />
      </div>
    );
  };

  return (
    <div class="space-y-8 min-w-0 max-w-full">
      {/* Type Selector Tabs */}
      <div class="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] max-w-xl">
        <button
          type="button"
          onClick={() => setType('tape')}
          class={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 ${
            type === 'tape'
              ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>📏 Ленточный фундамент</span>
        </button>
        <button
          type="button"
          onClick={() => setType('slab')}
          class={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[44px] flex items-center justify-center gap-2 ${
            type === 'slab'
              ? 'bg-[var(--accent)] text-[var(--btn-text)] shadow-md'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <span>⬛ Монолитная плита</span>
        </button>
      </div>

      {/* Main 2-column Grid */}
      <div class="grid grid-cols-1 [@media(min-width:900px)]:grid-cols-12 gap-8 items-start min-w-0 max-w-full">
        {/* Left Column: Input Fields (7 cols) */}
        <div class="min-w-0 max-w-full [@media(min-width:900px)]:col-span-7 space-y-6">
          <div class="glass-card rounded-3xl p-5 sm:p-7 border border-[var(--border)] space-y-6">
            <h3 class="text-sm font-bold uppercase tracking-wider text-[var(--text)] pb-3 border-b border-[var(--border)] flex items-center justify-between">
              <span>Параметры армирования</span>
              <span class="text-[10px] text-[var(--accent)] font-mono font-medium">СП 63.13330.2018</span>
            </h3>

            {/* Tape Inputs */}
            {type === 'tape' && (
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Длина ленты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={totalLength}
                      onInput={(e) => setTotalLength((e.target as HTMLInputElement).value)}
                      placeholder="40"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">Периметр + перемычки</span>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Ширина ленты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tapeWidth}
                      onInput={(e) => setTapeWidth((e.target as HTMLInputElement).value)}
                      placeholder="0.4"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">Обычно 0.3 - 0.5 м</span>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Высота ленты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tapeHeight}
                      onInput={(e) => setTapeHeight((e.target as HTMLInputElement).value)}
                      placeholder="0.8"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">Заглубление + цоколь</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Диаметр рабочей (А500С)
                    </label>
                    <select
                      value={tapeWorkingDiameter}
                      onChange={(e) => setTapeWorkingDiameter(parseInt((e.target as HTMLSelectElement).value, 10))}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="10">⌀ 10 мм</option>
                      <option value="12">⌀ 12 мм (рекомендуется)</option>
                      <option value="14">⌀ 14 мм</option>
                      <option value="16">⌀ 16 мм</option>
                    </select>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Стержней в сечении
                    </label>
                    <select
                      value={barsCount}
                      onChange={(e) => setBarsCount((e.target as HTMLSelectElement).value)}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="4">4 стержня (2 верха + 2 низа)</option>
                      <option value="6">6 стержней (при h &gt; 80 см)</option>
                    </select>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Шаг хомутов, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={clampSpacing}
                      onInput={(e) => setClampSpacing((e.target as HTMLInputElement).value)}
                      placeholder="0.35"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">СП: ≤ 0.75h, до 0.5м</span>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Диаметр хомутов
                    </label>
                    <select
                      value={clampDiameter}
                      onChange={(e) => setClampDiameter(parseInt((e.target as HTMLSelectElement).value, 10))}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="6">⌀ 6 мм (гладкая А240)</option>
                      <option value="8">⌀ 8 мм (рекомендуется)</option>
                    </select>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Внешних углов, шт
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cornersCount}
                      onInput={(e) => setCornersCount((e.target as HTMLInputElement).value)}
                      placeholder="4"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">Г-образное усиление</span>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Т-примыканий, шт
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={crossingsCount}
                      onInput={(e) => setCrossingsCount((e.target as HTMLInputElement).value)}
                      placeholder="0"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                    <span class="text-[10px] text-[var(--text-muted)]">Внутренние стены</span>
                  </div>
                </div>
              </div>
            )}

            {/* Slab Inputs */}
            {type === 'slab' && (
              <div class="space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Длина плиты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={slabLength}
                      onInput={(e) => setSlabLength((e.target as HTMLInputElement).value)}
                      placeholder="10"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Ширина плиты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={slabWidth}
                      onInput={(e) => setSlabWidth((e.target as HTMLInputElement).value)}
                      placeholder="10"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Толщина плиты, м
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={slabThickness}
                      onInput={(e) => setSlabThickness((e.target as HTMLInputElement).value)}
                      placeholder="0.3"
                      class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--border)]">
                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Диаметр сетки (А500С)
                    </label>
                    <select
                      value={slabWorkingDiameter}
                      onChange={(e) => setSlabWorkingDiameter(parseInt((e.target as HTMLSelectElement).value, 10))}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="10">⌀ 10 мм</option>
                      <option value="12">⌀ 12 мм (стандарт)</option>
                      <option value="14">⌀ 14 мм</option>
                      <option value="16">⌀ 16 мм</option>
                    </select>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Шаг ячейки сетки, м
                    </label>
                    <select
                      value={gridStep}
                      onChange={(e) => setGridStep((e.target as HTMLSelectElement).value)}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="0.2">200 × 200 мм (стандарт)</option>
                      <option value="0.15">150 × 150 мм (усиленный)</option>
                    </select>
                  </div>

                  <div class="space-y-1.5 min-w-0">
                    <label class="block text-xs font-semibold text-[var(--text)]">
                      Диаметр лягушек
                    </label>
                    <select
                      value={frogDiameter}
                      onChange={(e) => setFrogDiameter(parseInt((e.target as HTMLSelectElement).value, 10))}
                      class="w-full px-3 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                    >
                      <option value="8">⌀ 8 мм</option>
                      <option value="10">⌀ 10 мм</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* General Settings: Cover Layer & Margin */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border)]">
              <div class="space-y-1.5 min-w-0">
                <label class="block text-xs font-semibold text-[var(--text)]">
                  Защитный слой бетона, мм
                </label>
                <select
                  value={coverLayer}
                  onChange={(e) => setCoverLayer(parseInt((e.target as HTMLSelectElement).value, 10))}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                >
                  <option value="35">35 мм (внутренние конструкции)</option>
                  <option value="40">40 мм (в грунте с подбетонкой)</option>
                  <option value="50">50 мм (в грунте без подбетонки)</option>
                </select>
              </div>

              <div class="space-y-1.5 min-w-0">
                <label class="block text-xs font-semibold text-[var(--text)]">
                  Запас на нахлёст и подрезку, %
                </label>
                <select
                  value={margin}
                  onChange={(e) => setMargin(Number((e.target as HTMLSelectElement).value))}
                  class="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors text-base min-h-[44px]"
                >
                  <option value="5">5% — минимальный</option>
                  <option value="7">7% — стандартный по СП</option>
                  <option value="10">10% — сложная геометрия</option>
                </select>
              </div>
            </div>

            {/* Dynamic Interactive SVG Section Diagram */}
            {renderDiagram()}
          </div>

          {/* Master Mode Toggle & Labor Rates Card */}
          <div class="glass-card rounded-3xl p-5 sm:p-7 border border-indigo-500/30 bg-indigo-500/5 space-y-4">
            <div class="flex items-center justify-between">
              <div class="space-y-0.5">
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 block">
                  🛠️ Режим мастера
                </span>
                <span class="text-xs text-[var(--text-muted)]">
                  Расчёт стоимости монтажных работ и составление комплексной сметы
                </span>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={masterMode}
                  onChange={(e) => setMasterMode((e.target as HTMLInputElement).checked)}
                  class="sr-only peer"
                />
                <div class="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {masterMode && (
              <div class="pt-3 border-t border-indigo-500/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div class="space-y-1.5 min-w-0">
                  <label class="block font-semibold text-[var(--text)]">
                    Вязка армокаркаса, ₽/тн
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tieRate}
                    onInput={(e) => setTieRate((e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono text-sm min-h-[40px]"
                  />
                  <span class="text-[10px] text-[var(--text-muted)]">Рынок: 25 000–35 000</span>
                </div>

                <div class="space-y-1.5 min-w-0">
                  <label class="block font-semibold text-[var(--text)]">
                    Опалубка, ₽/м²
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formworkRate}
                    onInput={(e) => setFormworkRate((e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono text-sm min-h-[40px]"
                  />
                  <span class="text-[10px] text-[var(--text-muted)]">Монтаж + демонтаж</span>
                </div>

                <div class="space-y-1.5 min-w-0">
                  <label class="block font-semibold text-[var(--text)]">
                    Укладка бетона, ₽/м³
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={pourRate}
                    onInput={(e) => setPourRate((e.target as HTMLInputElement).value)}
                    class="w-full px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-mono text-sm min-h-[40px]"
                  />
                  <span class="text-[10px] text-[var(--text-muted)]">Приёмка + вибрирование</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Result Panel (5 cols on desktop, sticky top-20) */}
        <div id="calculator-result" class="min-w-0 max-w-full [@media(min-width:900px)]:col-span-5 [@media(min-width:900px)]:sticky [@media(min-width:900px)]:top-20 space-y-4">
          <div class="glass-card rounded-3xl p-5 sm:p-7 border border-[var(--border)] shadow-2xl">
            <h3 class="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-4 pb-2 border-b border-[var(--border)] flex items-center justify-between">
              <span>Спецификация и итог</span>
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
              Общий вес стали (с запасом {result.marginPercent}%)
            </span>
            <div class="text-xl sm:text-2xl font-black font-mono text-amber-700 dark:text-amber-400 truncate leading-none mt-0.5">
              {result.totalWeightTons} <span class="text-sm font-sans text-amber-600 dark:text-amber-300">тн</span>
              <span class="text-xs font-mono font-normal text-[var(--text-muted)] ml-1">({result.totalWeightKg} кг)</span>
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
                  Спецификация армокаркаса
                </h3>
                <span class="text-[11px] text-[var(--text-muted)]">
                  Вес: {result.totalWeightTons} тн ({result.totalWeightKg} кг)
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
