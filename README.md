# 🏗️ СтройРасчёт (StroiRaschet)

> **Высокоточный инженерный портал строительных калькуляторов онлайн по СП и ГОСТ с интерактивной процедурной 3D-визуализацией.**

[![Astro](https://img.shields.io/badge/Astro-5.0-bc52ee?logo=astro&logoColor=white)](https://astro.build)
[![Preact](https://img.shields.io/badge/Preact-10-673ab8?logo=preact&logoColor=white)](https://preactjs.com)
[![Three.js](https://img.shields.io/badge/Three.js-r174-black?logo=threedotjs&logoColor=white)](https://threejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Vitest](https://img.shields.io/badge/Vitest-3.2-729b1b?logo=vitest&logoColor=white)](https://vitest.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Ключевые особенности

- 🏠 **Процедурная 3D-модель (Three.js WebGL):**
  - Детализированный дом из отдельных параметрических кирпичей, цоколя, конька, трубы с дымом и живых окон с очаговым свечением.
  - Единая WebGL-сцена между страницами (`transition:persist`), плавный переход `house` (главная) $\leftrightarrow$ `ambient` (внутренние страницы) без повторной инициализации контекста.
  - Реалистичная анимация сборки (снизу вверх) и разборки (сверху вниз).
- 📐 **Строгая нормативная база РФ:**
  - Каждый калькулятор опирается на формулы и таблицы действующих СП и ГОСТ (ГОСТ 7473-2010, ГОСТ 530-2012, СП 63.13330.2018, СП 17.13330.2017 и др.).
  - Полная прозрачность расчёта с отображением промежуточных формул и коэффициентов запаса.
- 🛠️ **«Режим мастера» (Комплексная смета):**
  - Расчёт не только объёма материалов, но и стоимости монтажных работ по физическим объёмам (укладка бетона, вязка арматурных каркасов, кладка кирпича/блоков).
  - Возможность корректировать региональные расценки и экспортировать готовую смету в PDF/печать.
- ⚡ **Максимальная производительность (Core Web Vitals):**
  - Static Site Generation (SSG) на Astro 5 — нулевой runtime-оверхед для контентных страниц.
  - Островная архитектура Preact — интерактивные модули изолированы и подгружаются по требованию.
  - LCP $\le 1.2$ с, CLS $= 0.00$, 60 FPS рендеринг WebGL.
- 🎨 **Дизайн-система и темы:**
  - 6 калиброванных цветовых тем: *Тёмная, Светлая, Закат, Лес, Тёплая, Неон*.
  - Автоматическая адаптация материалов 3D-сцены и фотометрии под выбранную тему.
  - 100% адаптивность (от iPhone SE 375px до 4K UltraWide).

---

## 📂 Структура проекта

```text
Stroicalc/
├── public/                 # Статические ассеты, иконки, robots.txt, sitemap
├── src/
│   ├── calculators/        # Инженерные математические модули (СП / ГОСТ)
│   ├── components/
│   │   ├── calculators/    # Preact-компоненты интерактивных форм
│   │   ├── common/         # Шапка, футер, тема, навигация
│   │   └── HouseOrb.ts     # Ядро Three.js сцены (шейдеры, инстансы, анимация)
│   ├── config/             # Конфигурация тем, SEO и краулеров
│   ├── data/               # Реестр калькуляторов и нормативная документация
│   ├── layouts/            # Базовые макеты BaseLayout и CalculatorLayout
│   ├── pages/              # Astro SSG маршруты и страницы калькуляторов
│   └── styles/             # Tailwind CSS и глобальные стили
├── tests/                  # Unit-тесты расчётных ядер (Vitest)
└── scripts/                # Скрипты верификации SEO, генерации OG-изображений
```

---

## 🚀 Быстрый старт

### Требования
- Node.js 18.x или выше
- npm 9.x или выше

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
```bash
npm run dev
```
Сервер запустится по адресу [http://localhost:4321](http://localhost:4321).  
Для включения панели отладки параметров 3D-сцены добавьте параметр: `http://localhost:4321/?tune=1`

### Запуск тестов
```bash
npm test
```

### Проверка типов TypeScript
```bash
npm run check:types
```

### Сборка для продакшена
```bash
npm run build
```
Скомпилированный статический сайт будет доступен в директории `dist/`.

---

## 📄 Лицензия

Проект распространяется под лицензией MIT. Подробнее см. в файле [LICENSE](LICENSE).
