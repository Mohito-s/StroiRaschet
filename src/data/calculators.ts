export interface CalculatorRegistryItem {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: 'fundament' | 'steny' | 'krovlya' | 'otdelka' | 'inzheneriya';
  level: 1 | 2 | 3;
  verified: boolean;
  normCode: string;
}

export const CALCULATORS_REGISTRY: Record<string, CalculatorRegistryItem> = {
  // Уровень 1: Чистая геометрия и проверенные ГОСТ (verified: true)
  'kalkulyator-betona': {
    id: 'kalkulyator-betona',
    slug: 'kalkulyator-betona',
    title: 'Бетон для фундамента',
    shortTitle: 'Бетон',
    category: 'fundament',
    level: 1,
    verified: true,
    normCode: 'ГОСТ 7473-2010'
  },
  'kalkulyator-kirpicha': {
    id: 'kalkulyator-kirpicha',
    slug: 'kalkulyator-kirpicha',
    title: 'Кирпичная кладка стен',
    shortTitle: 'Кирпич',
    category: 'steny',
    level: 1,
    verified: true,
    normCode: 'ГОСТ 530-2012'
  },
  'kalkulyator-gazobetona': {
    id: 'kalkulyator-gazobetona',
    slug: 'kalkulyator-gazobetona',
    title: 'Газобетонные блоки',
    shortTitle: 'Газобетон',
    category: 'steny',
    level: 1,
    verified: true,
    normCode: 'ГОСТ 31360-2007'
  },
  'kalkulyator-pilomaterialov': {
    id: 'kalkulyator-pilomaterialov',
    slug: 'kalkulyator-pilomaterialov',
    title: 'Пиломатериалы: брус и доска',
    shortTitle: 'Пиломатериалы',
    category: 'steny',
    level: 1,
    verified: true,
    normCode: 'ГОСТ 8486-86'
  },
  'kalkulyator-plitki': {
    id: 'kalkulyator-plitki',
    slug: 'kalkulyator-plitki',
    title: 'Плитка и эпоксидная затирка',
    shortTitle: 'Плитка',
    category: 'otdelka',
    level: 1,
    verified: true,
    normCode: 'СП 71.13330.2017'
  },
  'kalkulyator-krovli': {
    id: 'kalkulyator-krovli',
    slug: 'kalkulyator-krovli',
    title: 'Геометрическая площадь кровли',
    shortTitle: 'Кровля',
    category: 'krovlya',
    level: 1,
    verified: true,
    normCode: 'СП 17.13330.2017'
  },
  'kalkulyator-armatury': {
    id: 'kalkulyator-armatury',
    slug: 'kalkulyator-armatury',
    title: 'Арматурный каркас фундамента',
    shortTitle: 'Арматура',
    category: 'fundament',
    level: 1,
    verified: true,
    normCode: 'ГОСТ 5781-82'
  },

  // Уровень 2: Эмпирические строительные нормы (verified: true, пометка «ориентировочно»)
  'kalkulyator-styazhki': {
    id: 'kalkulyator-styazhki',
    slug: 'kalkulyator-styazhki',
    title: 'Цементная стяжка пола',
    shortTitle: 'Стяжка',
    category: 'otdelka',
    level: 2,
    verified: true,
    normCode: 'СП 29.13330.2011'
  },
  'kalkulyator-shtukaturki': {
    id: 'kalkulyator-shtukaturki',
    slug: 'kalkulyator-shtukaturki',
    title: 'Штукатурка стен по маякам',
    shortTitle: 'Штукатурка',
    category: 'otdelka',
    level: 2,
    verified: true,
    normCode: 'СП 71.13330.2017'
  },
  'kalkulyator-lestnicy': {
    id: 'kalkulyator-lestnicy',
    slug: 'kalkulyator-lestnicy',
    title: 'Эргономика межэтажной лестницы',
    shortTitle: 'Лестница',
    category: 'otdelka',
    level: 2,
    verified: true,
    normCode: 'СП 55.13330.2016'
  },

  // Уровень 3: Ждёт таблиц из первоисточников (verified: false, исключены из sitemap.xml)
  'kalkulyator-snegovoy-nagruzki': {
    id: 'kalkulyator-snegovoy-nagruzki',
    slug: 'kalkulyator-snegovoy-nagruzki',
    title: 'Снеговая нагрузка на стропила',
    shortTitle: 'Снеговая нагрузка',
    category: 'krovlya',
    level: 3,
    verified: false,
    normCode: 'СП 20.13330.2016'
  },
  'kalkulyator-glubiny-promerzaniya': {
    id: 'kalkulyator-glubiny-promerzaniya',
    slug: 'kalkulyator-glubiny-promerzaniya',
    title: 'Глубина промерзания грунта',
    shortTitle: 'Промерзание грунта',
    category: 'fundament',
    level: 3,
    verified: false,
    normCode: 'СП 22.13330.2016'
  },
  'kalkulyator-utepleniya': {
    id: 'kalkulyator-utepleniya',
    slug: 'kalkulyator-utepleniya',
    title: 'Теплоизоляция стен (ГСОП)',
    shortTitle: 'Утепление стен',
    category: 'otdelka',
    level: 3,
    verified: false,
    normCode: 'СП 50.13330.2012'
  },
  'kalkulyator-secheniya-kabelya': {
    id: 'kalkulyator-secheniya-kabelya',
    slug: 'kalkulyator-secheniya-kabelya',
    title: 'Сечение электрического кабеля',
    shortTitle: 'Сечение кабеля',
    category: 'inzheneriya',
    level: 3,
    verified: false,
    normCode: 'ПУЭ-7'
  },
  'kalkulyator-septika': {
    id: 'kalkulyator-septika',
    slug: 'kalkulyator-septika',
    title: 'Септик и очистные сооружения',
    shortTitle: 'Септик',
    category: 'fundament',
    level: 3,
    verified: false,
    normCode: 'СП 32.13330.2018'
  },
  'kalkulyator-ventilyacii': {
    id: 'kalkulyator-ventilyacii',
    slug: 'kalkulyator-ventilyacii',
    title: 'Вентиляция и воздухообмен',
    shortTitle: 'Вентиляция',
    category: 'inzheneriya',
    level: 3,
    verified: false,
    normCode: 'СП 60.13330.2020'
  }
};

/**
 * Список slug-ов калькуляторов со статусом verified: false.
 * Используется генератором sitemap.xml и аудитом SEO.
 */
export const UNVERIFIED_CALCULATOR_SLUGS: string[] = Object.values(CALCULATORS_REGISTRY)
  .filter((c) => !c.verified)
  .map((c) => c.slug);

/**
 * Список slug-ов проверенных калькуляторов со статусом verified: true.
 */
export const VERIFIED_CALCULATOR_SLUGS: string[] = Object.values(CALCULATORS_REGISTRY)
  .filter((c) => c.verified)
  .map((c) => c.slug);
