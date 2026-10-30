import sharp from 'sharp';
import path from 'node:path';

const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050a14" />
      <stop offset="50%" stop-color="#081326" />
      <stop offset="100%" stop-color="#050a14" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(6, 182, 212, 0.08)" stroke-width="1"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)" />
  <rect width="1200" height="630" fill="url(#grid)" />

  <!-- Ambient Glow Circles -->
  <circle cx="1000" cy="200" r="350" fill="url(#glowGrad)" />
  <circle cx="200" cy="500" r="250" fill="rgba(6, 182, 212, 0.15)" />

  <!-- Border Card Frame -->
  <rect x="40" y="40" width="1120" height="550" rx="24" fill="rgba(11, 19, 38, 0.7)" stroke="rgba(6, 182, 212, 0.3)" stroke-width="2" />

  <!-- Brand Header -->
  <g transform="translate(100, 110)">
    <!-- Icon Box -->
    <rect x="0" y="0" width="64" height="64" rx="16" fill="rgba(6, 182, 212, 0.15)" stroke="rgba(6, 182, 212, 0.4)" stroke-width="2" />
    <path d="M 18 32 L 32 18 L 46 32 M 22 28 L 22 46 L 42 46 L 42 28" fill="none" stroke="#00f0ff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

    <!-- Site Title -->
    <text x="84" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" fill="#f8fafc" letter-spacing="-0.5">СтройРасчёт</text>
    <text x="340" y="43" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="600" fill="#00f0ff">.ru</text>
  </g>

  <!-- Main Headline -->
  <g transform="translate(100, 240)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="900" fill="#ffffff" letter-spacing="-1">
      Инженерные строительные калькуляторы
    </text>
    <text x="0" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="46" font-weight="900" fill="#00f0ff" letter-spacing="-1">
      по СП и ГОСТ онлайн
    </text>
  </g>

  <!-- Subtitle -->
  <g transform="translate(100, 360)">
    <text x="0" y="0" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">
      Точные открытые расчёты бетона, кирпича, пиломатериалов, кровли и арматуры.
    </text>
    <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="400" fill="#94a3b8">
      Для частного домостроения. Без регистрации и скрытых платежей.
    </text>
  </g>

  <!-- Feature Pills -->
  <g transform="translate(100, 460)">
    <!-- Pill 1 -->
    <rect x="0" y="0" width="200" height="44" rx="22" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.35)" stroke-width="1.5" />
    <circle cx="24" cy="22" r="5" fill="#10b981" />
    <text x="38" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">16 калькуляторов</text>

    <!-- Pill 2 -->
    <rect x="220" y="0" width="200" height="44" rx="22" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.35)" stroke-width="1.5" />
    <circle cx="244" cy="22" r="5" fill="#00f0ff" />
    <text x="258" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">Нормы СП и ГОСТ</text>

    <!-- Pill 3 -->
    <rect x="440" y="0" width="180" height="44" rx="22" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.35)" stroke-width="1.5" />
    <circle cx="464" cy="22" r="5" fill="#f59e0b" />
    <text x="478" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">100% бесплатно</text>

    <!-- Pill 4 -->
    <rect x="640" y="0" width="190" height="44" rx="22" fill="rgba(6, 182, 212, 0.12)" stroke="rgba(6, 182, 212, 0.35)" stroke-width="1.5" />
    <circle cx="664" cy="22" r="5" fill="#a855f7" />
    <text x="678" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="700" fill="#f8fafc">Без регистрации</text>
  </g>
</svg>
`;

async function main() {
  const outputPath = path.resolve(process.cwd(), 'public/og-default.png');
  await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toFile(outputPath);
  console.log(`✅ Успешно сгенерирован ${outputPath} (1200x630)`);
}

main().catch(console.error);
