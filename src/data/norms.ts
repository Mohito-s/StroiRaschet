export interface NormativeItem {
  code: string;
  title: string;
  note?: string;
  url?: string;
  verified: boolean;
}

export interface CalculatorNormInfo {
  calculatorId: string;
  title: string;
  normativeBasis: NormativeItem[];
}

export const NORMATIVE_REGISTRY: Record<string, CalculatorNormInfo> = {
  'kalkulyator-betona': {
    calculatorId: 'kalkulyator-betona',
    title: 'Калькулятор бетона для фундамента',
    normativeBasis: [
      {
        code: 'ГОСТ 7473-2010',
        title: 'Смеси бетонные. Технические условия',
        note: 'Классификация по маркам и классам прочности B7.5 - B40, подвижность П1-П5.',
        verified: true
      },
      {
        code: 'ГОСТ 26633-2015',
        title: 'Бетоны тяжелые и мелкозернистые. Технические условия',
        note: 'Требования к заполнителям, плотности и компонентам бетонной смеси.',
        verified: true
      },
      {
        code: 'Справочные пропорции Ц:П:Щ',
        title: 'Ориентировочные составы тяжелого бетона (Ц:П:Щ)',
        note: 'Массовые и объемные пропорции (М200/М250/М300) носят исключительно справочный рекомендательный характер.',
        verified: false
      }
    ]
  },
  'kalkulyator-armatury': {
    calculatorId: 'kalkulyator-armatury',
    title: 'Калькулятор арматуры для фундамента',
    normativeBasis: [
      {
        code: 'СП 63.13330.2018',
        title: 'Бетонные и железобетонные конструкции. Основные положения (СНиП 52-01-2003)',
        note: 'Минимальный процент продольного армирования железобетонных элементов (mu >= 0.1%), защитный слой бетона.',
        verified: false
      },
      {
        code: 'ГОСТ 34028-2016',
        title: 'Прокат арматурный для железобетонных конструкций. Технические условия',
        note: 'Теоретическая масса 1 погонного метра арматуры: m = 0.00617 * d^2 кг/м.',
        verified: true
      }
    ]
  },
  'kalkulyator-kirpicha': {
    calculatorId: 'kalkulyator-kirpicha',
    title: 'Калькулятор кирпича',
    normativeBasis: [
      {
        code: 'ГОСТ 530-2012',
        title: 'Кирпич и камень керамические. Общие технические условия',
        note: 'Номинальные размеры: одинарный 250х120х65 мм, полуторный 250х120х88 мм, двойной 250х120х138 мм. Толщина шва 10 мм.',
        verified: true
      }
    ]
  },
  'kalkulyator-gazobetona': {
    calculatorId: 'kalkulyator-gazobetona',
    title: 'Калькулятор газобетонных блоков',
    normativeBasis: [
      {
        code: 'ГОСТ 31360-2007',
        title: 'Изделия стеновые неармированные из ячеистого бетона автоклавного твердения',
        note: 'Геометрические размеры и допуски типовых блоков (600х200х300 мм и др.).',
        verified: true
      },
      {
        code: 'ГОСТ 31359-2007',
        title: 'Бетоны ячеистые автоклавного твердения. Технические условия',
        note: 'Марки по средней плотности D300 - D600.',
        verified: true
      }
    ]
  },
  'kalkulyator-pilomaterialov': {
    calculatorId: 'kalkulyator-pilomaterialov',
    title: 'Калькулятор пиломатериалов (доска, брус)',
    normativeBasis: [
      {
        code: 'ГОСТ 8486-86',
        title: 'Пиломатериалы хвойных пород. Технические условия',
        note: 'Размеры, номинальные сечения и требования к влажности.',
        verified: true
      },
      {
        code: 'ГОСТ 2695-83',
        title: 'Пиломатериалы лиственных пород. Технические условия',
        note: 'Размеры, классификация по сортам.',
        verified: true
      }
    ]
  },
  'kalkulyator-krovli': {
    calculatorId: 'kalkulyator-krovli',
    title: 'Калькулятор кровли (площадь и покрытия)',
    normativeBasis: [
      {
        code: 'СП 17.13330.2017',
        title: 'Кровли (Актуализированная редакция СНиП II-26-76)',
        note: 'Минимальные уклоны скатов в зависимости от кровельного материала (металлочерепица, профнастил, гибкая черепица).',
        verified: false
      }
    ]
  },
  'kalkulyator-snegovoy-nagruzki': {
    calculatorId: 'kalkulyator-snegovoy-nagruzki',
    title: 'Калькулятор снеговой нагрузки и шага стропил',
    normativeBasis: [
      {
        code: 'СП 20.13330.2016',
        title: 'Нагрузки и воздействия (Актуализированная редакция СНиП 2.01.07-85*)',
        note: 'Расчетное значение снеговой нагрузки S0 = 0.7 * ce * ct * mu * Sg. Таблица снеговых районов I-VIII.',
        verified: true
      }
    ]
  },
  'kalkulyator-glubiny-promerzaniya': {
    calculatorId: 'kalkulyator-glubiny-promerzaniya',
    title: 'Калькулятор глубины промерзания грунта',
    normativeBasis: [
      {
        code: 'СП 22.13330.2016',
        title: 'Основания зданий и сооружений (СНиП 2.02.01-83*)',
        note: 'Нормативная глубина сезонного промерзания: d_fn = d0 * sqrt(Mt). Коэффициенты типов грунтов: глина/суглинок 0.23, супесь/песок мелкий 0.28, песок средний/крупный 0.30, крупнообломочный 0.34.',
        verified: true
      },
      {
        code: 'СП 131.13330.2020',
        title: 'Строительная климатология (СНиП 23-01-99*)',
        note: 'Климатические таблицы зимних среднемесячных температур (Mt) по городам РФ.',
        verified: false
      }
    ]
  },
  'kalkulyator-utepleniya': {
    calculatorId: 'kalkulyator-utepleniya',
    title: 'Теплотехнический расчет стены и толщины утеплителя',
    normativeBasis: [
      {
        code: 'СП 50.13330.2012',
        title: 'Тепловая защита зданий (СНиП 23-02-2003)',
        note: 'Градусо-сутки отопительного периода (ГСОП), требуемое сопротивление теплопередаче R_тр = a*ГСОП + b.',
        verified: true
      }
    ]
  },
  'kalkulyator-styazhki': {
    calculatorId: 'kalkulyator-styazhki',
    title: 'Калькулятор стяжки пола',
    normativeBasis: [
      {
        code: 'СП 29.13330.2011',
        title: 'Полы (Актуализированная редакция СНиП 2.03.13-88)',
        note: 'Минимальная толщина цементно-песчаной стяжки: сцепленной >= 20 мм, по тепло/звукоизоляционному слою >= 40 мм.',
        verified: false
      }
    ]
  },
  'kalkulyator-shtukaturki': {
    calculatorId: 'kalkulyator-shtukaturki',
    title: 'Калькулятор штукатурки стен',
    normativeBasis: [
      {
        code: 'СП 71.13330.2017',
        title: 'Изоляционные и отделочные покрытия (СНиП 3.04.01-87)',
        note: 'Допуски плоскостности и вертикали (простая, улучшенная, высококачественная штукатурка).',
        verified: false
      }
    ]
  },
  'kalkulyator-plitki': {
    calculatorId: 'kalkulyator-plitki',
    title: 'Калькулятор плитки и затирки',
    normativeBasis: [
      {
        code: 'СП 71.13330.2017',
        title: 'Изоляционные и отделочные покрытия (СНиП 3.04.01-87)',
        note: 'Требования к укладке облицовочной плитки, толщине клеевого шва и затирке.',
        verified: true
      }
    ]
  },
  'kalkulyator-lestnicy': {
    calculatorId: 'kalkulyator-lestnicy',
    title: 'Калькулятор параметров межэтажной лестницы',
    normativeBasis: [
      {
        code: 'СП 55.13330.2016',
        title: 'Дома жилые одноквартирные (СНиП 31-02-2001)',
        note: 'Ширина марша не менее 0.9 м, уклон не более 1:1.25, проступь >= 0.25 м, подступенок <= 0.22 м.',
        verified: false
      }
    ]
  },
  'kalkulyator-ventilyacii': {
    calculatorId: 'kalkulyator-ventilyacii',
    title: 'Калькулятор воздухообмена и сечения вентиляции',
    normativeBasis: [
      {
        code: 'СП 60.13330.2020',
        title: 'Отопление, вентиляция и кондиционирование воздуха',
        note: 'Нормы воздухообмена жилых комнат: 30 м³/ч на человека либо 3 м³/ч на 1 м² площади.',
        verified: true
      },
      {
        code: 'СП 54.13330.2022',
        title: 'Здания жилые многоквартирные',
        note: 'Вытяжка: кухня с электроплитой >= 60 м³/ч, совмещенный санузел/ванная >= 25-50 м³/ч.',
        verified: false
      }
    ]
  },
  'kalkulyator-secheniya-kabelya': {
    calculatorId: 'kalkulyator-secheniya-kabelya',
    title: 'Калькулятор сечения кабеля по мощности и длине',
    normativeBasis: [
      {
        code: 'ПУЭ (7-е издание)',
        title: 'Правила устройства электроустановок. Главы 1.3 (токовые нагрузки) и 7.1',
        note: 'Формулы расчетного тока 1-фазной и 3-фазной сети, допустимые токи кабелей с медными жилами.',
        verified: false
      },
      {
        code: 'ГОСТ 31996-2012',
        title: 'Кабели силовые с пластмассовой изоляцией на номинальное напряжение 0,66; 1 и 3 кВ',
        note: 'Параметры жил, удельное сопротивление меди rho = 0.0175 Ом*мм2/м.',
        verified: true
      }
    ]
  },
  'kalkulyator-septika': {
    calculatorId: 'kalkulyator-septika',
    title: 'Калькулятор объема септика и дренажа',
    normativeBasis: [
      {
        code: 'СП 32.13330.2018',
        title: 'Канализация. Наружные сети и сооружения (СНиП 2.04.03-85)',
        note: 'Рабочий объем септика должен быть не менее трехкратного суточного притока сточных вод при расходе до 5 м³/сут.',
        verified: true
      }
    ]
  }
};
