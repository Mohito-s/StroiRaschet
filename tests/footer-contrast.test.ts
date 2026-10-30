import { describe, it, expect } from 'vitest';
import { THEME_PRESETS } from '../src/config/theme';
import * as fs from 'fs';
import * as path from 'path';

/**
 * WCAG 2.1 Relative Luminance calculation for sRGB hex color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 * where C_linear = C <= 0.04045 ? C / 12.92 : ((C + 0.055) / 1.055) ^ 2.4
 */
function srgbToLinear(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '').trim();
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Контрастность элементов футера по WCAG 2.1 для всех 5 тем', () => {
  const themes = Object.values(THEME_PRESETS);

  it('Должно быть ровно 5 настроенных тем оформления', () => {
    expect(themes.length).toBe(5);
  });

  themes.forEach((theme) => {
    describe(`Тема: "${theme.name}" (${theme.id})`, () => {
      const { footerBg, footerText, footerLink, footerHeading } = theme.variables;

      it(`Основной текст футера (${footerText} на ${footerBg}) должен соответствовать WCAG AA (>= 4.5:1)`, () => {
        const ratio = getContrastRatio(footerText, footerBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`Ссылки футера (${footerLink} на ${footerBg}) должны соответствовать WCAG AA (>= 4.5:1)`, () => {
        const ratio = getContrastRatio(footerLink, footerBg);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });

      it(`Заголовки колонок футера (${footerHeading} на ${footerBg}) должны соответствовать WCAG AAA (>= 7.0:1)`, () => {
        const ratio = getContrastRatio(footerHeading, footerBg);
        expect(ratio).toBeGreaterThanOrEqual(7.0);
      });
    });
  });

  it('Переменные в global.css должны совпадать с TS-конфигурацией тем', () => {
    const cssPath = path.resolve(__dirname, '../src/styles/global.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    for (const theme of themes) {
      const { footerBg, footerText, footerLink, footerHeading } = theme.variables;
      expect(cssContent).toContain(`--footer-bg: ${footerBg};`);
      expect(cssContent).toContain(`--footer-text: ${footerText};`);
      expect(cssContent).toContain(`--footer-link: ${footerLink};`);
      expect(cssContent).toContain(`--footer-heading: ${footerHeading};`);
    }
  });
});
