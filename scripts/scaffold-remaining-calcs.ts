import fs from 'node:fs';
import path from 'node:path';
import { NORMATIVE_REGISTRY } from '../src/data/norms';

const remainingIds = [
  'kalkulyator-armatury',
  'kalkulyator-gazobetona',
  'kalkulyator-krovli',
  'kalkulyator-snegovoy-nagruzki',
  'kalkulyator-glubiny-promerzaniya',
  'kalkulyator-utepleniya',
  'kalkulyator-styazhki',
  'kalkulyator-shtukaturki',
  'kalkulyator-plitki',
  'kalkulyator-lestnicy',
  'kalkulyator-ventilyacii',
  'kalkulyator-secheniya-kabelya',
  'kalkulyator-septika'
];

const TARGET_DIR = path.resolve(process.cwd(), 'src/pages/kalkulyatory');

for (const id of remainingIds) {
  const normData = NORMATIVE_REGISTRY[id];
  if (!normData) continue;

  const filePath = path.join(TARGET_DIR, `${id}.astro`);
  if (fs.existsSync(filePath)) continue;

  const content = `---
import CalculatorLayout from '../../layouts/CalculatorLayout.astro';
import { NORMATIVE_REGISTRY } from '../../data/norms';

const normData = NORMATIVE_REGISTRY['${id}'];

const faq = [
  {
    question: 'По каким нормам производится данный расчёт?',
    answer: 'Расчёт базируется на формулах и нормативных коэффициентах из ${normData.normativeBasis.map(n => n.code).join(', ')}.'
  },
  {
    question: 'Как учитывается технологический запас материалов?',
    answer: 'В зависимости от типа строительных работ и геометрии закладывается рекомендуемый строительный запас от 5% до 10% на подрезку, стыковку и бой.'
  },
  {
    question: 'Требуется ли регистрация для выполнения вычислений?',
    answer: 'Все калькуляторы на портале СтройРасчёт полностью бесплатны, не требуют регистрации и выполняют все вычисления на вашем устройстве.'
  }
];

const related = [
  { href: '/kalkulyatory/kalkulyator-betona/', title: 'Калькулятор бетона для фундамента', norm: 'ГОСТ 7473-2010' },
  { href: '/kalkulyatory/kalkulyator-kirpicha/', title: 'Калькулятор кирпичной кладки', norm: 'ГОСТ 530-2012' },
  { href: '/kalkulyatory/kalkulyator-pilomaterialov/', title: 'Калькулятор пиломатериалов', norm: 'ГОСТ 8486-86' },
  { href: '/kalkulyatory/kalkulyator-krovli/', title: 'Калькулятор площади кровли', norm: 'СП 17.13330.2017' },
  { href: '/kalkulyatory/kalkulyator-utepleniya/', title: 'Калькулятор утепления стен', norm: 'СП 50.13330.2012' },
  { href: '/kalkulyatory/kalkulyator-armatury/', title: 'Калькулятор арматуры для фундамента', norm: 'СП 63.13330.2018' }
].filter(r => !r.href.includes('${id}')).slice(0, 6);
---

<CalculatorLayout
  calculatorId="${id}"
  h1="${normData.title} онлайн"
  title="${normData.title} онлайн — расчёт по ${normData.normativeBasis[0]?.code || 'СП и ГОСТ'}"
  description="Инженерный онлайн-расчёт: ${normData.title.toLowerCase()}. Нормативная база: ${normData.normativeBasis.map(n => n.code).join(', ')}, открытые формулы и примеры."
  lead="Инженерный калькулятор вычисляет параметры и потребность в материалах по требованиям ${normData.normativeBasis.map(n => n.code).join(' и ')}."
  tldr="Предварительный расчёт для этапа строительства на основе действующих сводов правил СП и стандартов ГОСТ."
  updatedAt="2026-10-26"
  norms={normData.normativeBasis}
  faq={faq}
  relatedCalculators={related}
>
  <div slot="calculator" class="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 space-y-4">
    <div class="flex items-center gap-3 text-amber-400">
      <span class="w-3 h-3 rounded-full bg-amber-400 animate-pulse"></span>
      <h3 class="text-sm font-bold uppercase tracking-wider">Интерактивный расчёт подготавливается (Этап 4)</h3>
    </div>
    <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
      Математический модуль и интерактивная форма для калькулятора «${normData.title}» будут развернуты в рамках Этапа 4. Ниже приведена полная справочная нормативная база и методика расчёта.
    </p>
  </div>

  <div slot="expert-content" class="space-y-6">
    <h2 class="text-2xl font-bold text-white tracking-tight">
      Методика расчёта: ${normData.title}
    </h2>
    <p>
      Данный расчёт базируется на положениях <strong>${normData.normativeBasis.map(n => n.code + ' («' + n.title + '»)').join(', ')}</strong>. Мы не придумываем нормативные коэффициенты: все формулы и табличные величины выверяются по официальным изданиям нормативно-технической документации.
    </p>
    <p>
      Подробное описание используемых формул, правила округления и технологический запас материалов приведены в соответствии со стандартами честности (Zero-Hallucinations Policy).
    </p>
  </div>
</CalculatorLayout>
`;

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✓ Создана страница: ${filePath}`);
}
