import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import { UNVERIFIED_CALCULATOR_SLUGS } from './src/data/calculators.ts';

export default defineConfig({
  site: 'https://stroyraschet.ru',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  integrations: [
    tailwind({
      applyBaseStyles: false
    }),
    preact(),
    sitemap({
      filter: (page) => {
        // Exclude unverified pages, preview color params, or error pages
        if (page.includes('/404') || page.includes('?')) return false;
        if (UNVERIFIED_CALCULATOR_SLUGS.some((slug) => page.includes(slug))) return false;
        return true;
      },
      serialize: (item) => {
        // Ensure canonical trailing slash
        if (!item.url.endsWith('/')) {
          item.url = `${item.url}/`;
        }
        item.changefreq = 'weekly';
        item.priority = item.url === 'https://stroyraschet.ru/' ? 1.0 : 0.8;
        return item;
      }
    })
  ]
});
