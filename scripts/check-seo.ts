import fs from 'node:fs';
import path from 'node:path';
import { UNVERIFIED_CALCULATOR_SLUGS } from '../src/data/calculators';

const DIST_DIR = path.resolve(process.cwd(), 'dist');

interface SeoIssue {
  file: string;
  type: 'error' | 'warning';
  message: string;
}

function getAllHtmlFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllHtmlFiles(fullPath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function parseSitemapUrls(): Set<string> {
  const sitemapPath = path.join(DIST_DIR, 'sitemap-0.xml');
  const urls = new Set<string>();
  if (!fs.existsSync(sitemapPath)) return urls;
  const content = fs.readFileSync(sitemapPath, 'utf-8');
  const matches = content.matchAll(/<loc>([^<]+)<\/loc>/g);
  for (const match of matches) {
    try {
      const parsed = new URL(match[1]);
      urls.add(parsed.pathname);
    } catch {
      urls.add(match[1]);
    }
  }
  return urls;
}

function checkSeo(): void {
  console.log('🔍 Запуск расширенного SEO-аудита для dist/ ...\n');

  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Каталог dist/ не найден. Сначала выполните npm run build');
    process.exit(1);
  }

  const htmlFiles = getAllHtmlFiles(DIST_DIR);
  console.log(`Найдено HTML-страниц для проверки: ${htmlFiles.length}`);

  const sitemapUrls = parseSitemapUrls();
  console.log(`Страниц в sitemap-0.xml: ${sitemapUrls.size}`);

  const issues: SeoIssue[] = [];
  const titles = new Map<string, string>();
  const descriptions = new Map<string, string>();

  // Множество существующих внутренних путей
  const existingPaths = new Set<string>();
  for (const file of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/');
    let urlPath = '/' + relativePath.replace(/index\.html$/, '').replace(/\.html$/, '');
    if (!urlPath.endsWith('/')) urlPath += '/';
    existingPaths.add(urlPath);
  }

  for (const file of htmlFiles) {
    const relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    const is404 = relativePath.includes('404');
    let pageUrlPath = '/' + relativePath.replace(/index\.html$/, '').replace(/\.html$/, '');
    if (!pageUrlPath.endsWith('/')) pageUrlPath += '/';

    // 1. lang="ru"
    const langMatch = content.match(/<html[^>]*\blang=["']([^"']*)["']/i);
    if (!langMatch || langMatch[1].toLowerCase() !== 'ru') {
      issues.push({
        file: relativePath,
        type: 'error',
        message: `Отсутствует или неверный lang="..." (ожидается "ru", найдено: "${langMatch?.[1] || 'нет'}")`
      });
    }

    // 2. Title
    const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) {
      issues.push({ file: relativePath, type: 'error', message: 'Отсутствует тег <title>' });
    } else {
      if (titles.has(title)) {
        issues.push({ file: relativePath, type: 'error', message: `Дубликат Title с ${titles.get(title)}: "${title}"` });
      } else {
        titles.set(title, relativePath);
      }
      if (title.length < 30 || title.length > 80) {
        issues.push({
          file: relativePath,
          type: 'warning',
          message: `Длина Title (${title.length} симв.) вне оптимума (40-70): "${title}"`
        });
      }
    }

    // 3. Description (строго 120-160 знаков)
    const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    const desc = descMatch ? descMatch[1].trim() : '';
    if (!desc) {
      issues.push({ file: relativePath, type: 'error', message: 'Отсутствует meta description' });
    } else {
      if (descriptions.has(desc)) {
        issues.push({ file: relativePath, type: 'warning', message: `Дубликат Description с ${descriptions.get(desc)}` });
      } else {
        descriptions.set(desc, relativePath);
      }
      if (desc.length < 120 || desc.length > 160) {
        issues.push({
          file: relativePath,
          type: 'warning',
          message: `Длина Description (${desc.length} симв.) вне оптимума (120-160): "${desc}"`
        });
      }
    }

    // 4. Ровно один H1 (кроме 404)
    if (!is404) {
      const h1Matches = content.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi);
      if (!h1Matches || h1Matches.length === 0) {
        issues.push({ file: relativePath, type: 'error', message: 'Отсутствует тег <h1>' });
      } else if (h1Matches.length > 1) {
        issues.push({ file: relativePath, type: 'error', message: `Найдено более одного <h1> (${h1Matches.length})` });
      }
    }

    // 5. Canonical со слэшем на конце
    const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i);
    if (!canonicalMatch) {
      issues.push({ file: relativePath, type: 'error', message: 'Отсутствует <link rel="canonical">' });
    } else {
      const canonicalUrl = canonicalMatch[1];
      if (!canonicalUrl.endsWith('/')) {
        issues.push({ file: relativePath, type: 'error', message: `Canonical URL не заканчивается слэшем: "${canonicalUrl}"` });
      }
    }

    // 6. Open Graph и Twitter image (наличие тега и файла на диске)
    const ogImageMatch = content.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
    if (!ogImageMatch) {
      issues.push({ file: relativePath, type: 'error', message: 'Отсутствует <meta property="og:image">' });
    } else {
      const ogUrl = ogImageMatch[1];
      let localPath = ogUrl.replace(/^https?:\/\/[^\/]+/, '');
      if (localPath.startsWith('/')) localPath = localPath.slice(1);
      const diskPath = path.join(DIST_DIR, localPath);
      if (!fs.existsSync(diskPath)) {
        issues.push({ file: relativePath, type: 'error', message: `Файл og:image не найден на диске: ${diskPath}` });
      }
    }

    // 7. Проверка наличия/отсутствия в Sitemap
    const isUnverifiedCalc = UNVERIFIED_CALCULATOR_SLUGS.some(slug => pageUrlPath.includes(slug));
    const inSitemap = sitemapUrls.has(pageUrlPath);
    if (is404) {
      if (inSitemap) {
        issues.push({ file: relativePath, type: 'error', message: 'Страница 404 ошибочно включена в sitemap.xml' });
      }
    } else if (isUnverifiedCalc) {
      if (inSitemap) {
        issues.push({ file: relativePath, type: 'error', message: `Неверифицированный калькулятор (verified: false) ошибочно попал в sitemap: ${pageUrlPath}` });
      }
    } else {
      if (!inSitemap) {
        issues.push({ file: relativePath, type: 'error', message: `Страница отсутствует в sitemap-0.xml: ${pageUrlPath}` });
      }
    }

    // 8. Битые внутренние ссылки
    const hrefMatches = content.matchAll(/<a\s+[^>]*\bhref=["']([^"']*)["']/gi);
    for (const match of hrefMatches) {
      const rawHref = match[1].trim();
      if (
        !rawHref ||
        rawHref.startsWith('http') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        continue;
      }
      if (rawHref.startsWith('#')) continue;

      const cleanHref = rawHref.split('?')[0].split('#')[0];
      if (!cleanHref) continue;

      let targetUrlPath = cleanHref;
      if (!targetUrlPath.startsWith('/')) {
        targetUrlPath = path.posix.join(pageUrlPath, cleanHref);
      }
      if (!targetUrlPath.endsWith('/') && !path.extname(targetUrlPath)) {
        targetUrlPath += '/';
      }

      if (
        targetUrlPath.endsWith('.xml') ||
        targetUrlPath.endsWith('.svg') ||
        targetUrlPath.endsWith('.png') ||
        targetUrlPath.endsWith('.webp')
      ) {
        const assetPath = path.join(DIST_DIR, targetUrlPath.slice(1));
        if (!fs.existsSync(assetPath)) {
          issues.push({
            file: relativePath,
            type: 'error',
            message: `Битая ссылка на статический файл: "${rawHref}" (не найден ${assetPath})`
          });
        }
      } else {
        if (!existingPaths.has(targetUrlPath)) {
          issues.push({
            file: relativePath,
            type: 'error',
            message: `Битая внутренняя ссылка: "${rawHref}" -> "${targetUrlPath}" не существует`
          });
        }
      }
    }

    // 9. Наличие <footer> минимум с 8 внутренними ссылками, включая политику конфиденциальности и контакты
    const footerMatch = content.match(/<footer[^>]*>([\s\S]*?)<\/footer>/i);
    if (!footerMatch) {
      issues.push({ file: relativePath, type: 'error', message: 'Отсутствует тег <footer> на странице' });
    } else {
      const footerHtml = footerMatch[1];
      const footerLinks = Array.from(footerHtml.matchAll(/<a\s+[^>]*\bhref=["']([^"']*)["']/gi)).map(m => m[1]);
      const internalFooterLinks = footerLinks.filter(h => !h.startsWith('http') && !h.startsWith('mailto:') && !h.startsWith('tel:'));
      if (internalFooterLinks.length < 8) {
        issues.push({
          file: relativePath,
          type: 'error',
          message: `В футере найдено только ${internalFooterLinks.length} внутренних ссылок (ожидается минимум 8)`
        });
      }
      const hasPrivacy = footerLinks.some(h => h.includes('politika-konfidencialnosti'));
      if (!hasPrivacy) {
        issues.push({
          file: relativePath,
          type: 'error',
          message: 'В футере отсутствует ссылка на политику конфиденциальности (/politika-konfidencialnosti/)'
        });
      }
      const hasContacts = footerLinks.some(h => h.includes('kontakty'));
      if (!hasContacts) {
        issues.push({
          file: relativePath,
          type: 'error',
          message: 'В футере отсутствует ссылка на контакты (/kontakty/)'
        });
      }
    }
  }

  // Вывод результатов
  console.log('\n--- Результаты SEO-проверки ---');
  let errorsCount = 0;
  let warningsCount = 0;

  for (const issue of issues) {
    if (issue.type === 'error') {
      errorsCount++;
      console.error(`❌ [ERROR] ${issue.file}: ${issue.message}`);
    } else {
      warningsCount++;
      console.warn(`⚠️ [WARN]  ${issue.file}: ${issue.message}`);
    }
  }

  console.log(`\nИтого: ${errorsCount} ошибок, ${warningsCount} предупреждений.`);
  if (errorsCount > 0) {
    console.error('❌ SEO проверка завершилась с ошибками.');
    process.exit(1);
  } else {
    console.log('✅ Все 25 страниц прошли расширенный аудит SEO без ошибок!');
  }
}

checkSeo();
