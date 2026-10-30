import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');

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

const htmlFiles = getAllHtmlFiles(DIST_DIR);
const sitemapUrls = parseSitemapUrls();

console.log('| № | Страница (URL) | Title | Длина | H1 | Canonical | В Sitemap? |');
console.log('|---|---|---|:---:|---|---|:---:|');

let idx = 1;
const rows: any[] = [];

for (const file of htmlFiles) {
  const relativePath = path.relative(DIST_DIR, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf-8');
  let pageUrlPath = '/' + relativePath.replace(/index\.html$/, '').replace(/\.html$/, '');
  if (!pageUrlPath.endsWith('/')) pageUrlPath += '/';
  if (relativePath === '404.html') pageUrlPath = '/404.html';

  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '-';

  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let h1 = '-';
  if (h1Match) {
    h1 = h1Match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  const canonicalMatch = content.match(/<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']*)["']/i);
  let canonical = canonicalMatch ? canonicalMatch[1] : '-';
  if (canonical.startsWith('https://stroyraschet.ru')) {
    canonical = canonical.replace('https://stroyraschet.ru', '');
  }

  const inSitemap = sitemapUrls.has(pageUrlPath) ? '✅ Да' : '❌ Исключена';

  rows.push({
    pageUrlPath,
    title,
    len: title.length,
    h1,
    canonical,
    inSitemap
  });
}

// Sort alphabetically, with '/' first
rows.sort((a, b) => {
  if (a.pageUrlPath === '/') return -1;
  if (b.pageUrlPath === '/') return 1;
  return a.pageUrlPath.localeCompare(b.pageUrlPath);
});

rows.forEach(r => {
  console.log(`| ${idx++} | \`${r.pageUrlPath}\` | ${r.title} | ${r.len} | ${r.h1} | \`${r.canonical}\` | ${r.inSitemap} |`);
});
