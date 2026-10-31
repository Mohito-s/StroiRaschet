export interface ThemeCameraConfig {
  fov: number;
  elevation: number; // angle above horizon in degrees (e.g. 24°)
  azimuth: number;   // angle from facade to right wall in degrees (e.g. 32°)
  lookAtY: number;   // Y offset from center of Box3 (e.g. 0)
}

export interface ThemeScene3DConfig {
  bg: string;
  starColor: string;
  dustColor: string;
  sparkColor: string;
  fogColor: string;
  blending: 'additive' | 'normal';
  particleAlpha: number;
  bloomStrength: number;
  vignette: number;
  grain: number;
  camera: ThemeCameraConfig;
}

export interface ThemeHouseConfig {
  wall: string;
  roof: string;
  mortar: string;
  trim: string;
  windowGlow: string;
  smoke: string;
  wallGain: number;
  roofGain: number;
  baseGain: number;
  trimGain: number;
  mortarDarkness: number;
  mortarWidth: number;
  mortarGlow: number; // 0.04 in dark themes, 0.0 in light
  maxLuma: number;    // anti-burnout ceiling (>= 0.45 in dark themes)
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  palette: [string, string, string]; // [accent, bg, surface] for mini-dots
  variables: {
    bg: string;
    bgGlow: string;
    surface: string;
    surfaceHover: string;
    border: string;
    borderHover: string;
    text: string;
    textMuted: string;
    accent: string;
    accent2: string;
    glow: string;
    houseColor: string;
    radius: string;
    footerBg: string;
    footerText: string;
    footerLink: string;
    footerHeading: string;
  };
  scene3d: ThemeScene3DConfig;
  house: ThemeHouseConfig;
}

/**
 * Флаг фиксации финальной темы.
 * Если равен null, на сайте отображается плавающий переключатель пресетов и работает ссылка брату.
 * Если задать строку (например, 'neon' | 'warm' | 'forest' | 'sunset' | 'light'),
 * сайт фиксируется на этой теме, а панель выбора скрывается.
 */
export const LOCKED_THEME: string | null = null;

export const THEME_PRESETS: Record<string, ThemePreset> = {
  neon: {
    id: 'neon',
    name: 'Неон-чертёж',
    description: 'Бирюзовый неон и глубокий графит',
    palette: ['#06b6d4', '#050a14', '#0f172a'],
    variables: {
      bg: '#050a14',
      bgGlow: 'rgba(6, 182, 212, 0.15)',
      surface: 'rgba(11, 19, 38, 0.72)',
      surfaceHover: 'rgba(16, 29, 58, 0.88)',
      border: 'rgba(6, 182, 212, 0.22)',
      borderHover: 'rgba(6, 182, 212, 0.55)',
      text: '#f8fafc',
      textMuted: '#94a3b8',
      accent: '#06b6d4',
      accent2: '#10b981',
      glow: 'rgba(6, 182, 212, 0.35)',
      houseColor: '#00f0ff',
      radius: '1rem',
      footerBg: '#080f1d',
      footerText: '#94a3b8',
      footerLink: '#38bdf8',
      footerHeading: '#f8fafc'
    },
    scene3d: {
      bg: '#050a14',
      starColor: '#bfefff',
      dustColor: '#bfefff',
      sparkColor: '#ffb35c',
      fogColor: '#050a14',
      blending: 'additive',
      particleAlpha: 0.65,
      bloomStrength: 0.30,
      vignette: 0.35,
      grain: 0.03,
      camera: {
        fov: 32,
        elevation: 24,
        azimuth: 32,
        lookAtY: 0
      }
    },
    house: {
      wall: '#00f0ff',
      roof: '#0284c7',
      mortar: '#00f0ff',
      trim: '#38bdf8',
      windowGlow: '#ffb35c',
      smoke: '#94a3b8',
      wallGain: 0.35,
      roofGain: 0.30,
      baseGain: 0.20,
      trimGain: 0.42,
      mortarDarkness: 0.35,
      mortarWidth: 0.025,
      mortarGlow: 0.04,
      maxLuma: 0.54
    }
  },
  warm: {
    id: 'warm',
    name: 'Тёплый уют',
    description: 'Янтарь, терракота и тёплый тёмный камень',
    palette: ['#f59e0b', '#14100c', '#1c1917'],
    variables: {
      bg: '#14100c',
      bgGlow: 'rgba(245, 158, 11, 0.16)',
      surface: 'rgba(28, 25, 23, 0.72)',
      surfaceHover: 'rgba(41, 37, 36, 0.88)',
      border: 'rgba(245, 158, 11, 0.22)',
      borderHover: 'rgba(245, 158, 11, 0.55)',
      text: '#fafaf9',
      textMuted: '#a8a29e',
      accent: '#f59e0b',
      accent2: '#ea580c',
      glow: 'rgba(245, 158, 11, 0.35)',
      houseColor: '#f59e0b',
      radius: '1rem',
      footerBg: '#181411',
      footerText: '#a8a29e',
      footerLink: '#fbbf24',
      footerHeading: '#fafaf9'
    },
    scene3d: {
      bg: '#14100c',
      starColor: '#ffe2b8',
      dustColor: '#ffe2b8',
      sparkColor: '#5ee0d0',
      fogColor: '#14100c',
      blending: 'additive',
      particleAlpha: 0.65,
      bloomStrength: 0.30,
      vignette: 0.35,
      grain: 0.03,
      camera: {
        fov: 32,
        elevation: 24,
        azimuth: 32,
        lookAtY: 0
      }
    },
    house: {
      wall: '#f59e0b',
      roof: '#d97706',
      mortar: '#f59e0b',
      trim: '#fbbf24',
      windowGlow: '#fed7aa',
      smoke: '#a8a29e',
      wallGain: 0.35,
      roofGain: 0.30,
      baseGain: 0.20,
      trimGain: 0.42,
      mortarDarkness: 0.35,
      mortarWidth: 0.025,
      mortarGlow: 0.04,
      maxLuma: 0.54
    }
  },
  forest: {
    id: 'forest',
    name: 'Лес',
    description: 'Изумруд и хвоя на глубоком лесном фоне',
    palette: ['#10b981', '#06120d', '#062013'],
    variables: {
      bg: '#06120d',
      bgGlow: 'rgba(16, 185, 129, 0.16)',
      surface: 'rgba(6, 26, 16, 0.72)',
      surfaceHover: 'rgba(9, 38, 24, 0.88)',
      border: 'rgba(16, 185, 129, 0.22)',
      borderHover: 'rgba(16, 185, 129, 0.55)',
      text: '#f0fdf4',
      textMuted: '#86efac',
      accent: '#10b981',
      accent2: '#84cc16',
      glow: 'rgba(16, 185, 129, 0.35)',
      houseColor: '#10b981',
      radius: '1rem',
      footerBg: '#07170f',
      footerText: '#86efac',
      footerLink: '#34d399',
      footerHeading: '#f0fdf4'
    },
    scene3d: {
      bg: '#06120d',
      starColor: '#c8ffe0',
      dustColor: '#c8ffe0',
      sparkColor: '#ffd36b',
      fogColor: '#06120d',
      blending: 'additive',
      particleAlpha: 0.65,
      bloomStrength: 0.30,
      vignette: 0.35,
      grain: 0.03,
      camera: {
        fov: 32,
        elevation: 24,
        azimuth: 32,
        lookAtY: 0
      }
    },
    house: {
      wall: '#10b981',
      roof: '#059669',
      mortar: '#10b981',
      trim: '#34d399',
      windowGlow: '#fef08a',
      smoke: '#94a3b8',
      wallGain: 0.35,
      roofGain: 0.30,
      baseGain: 0.20,
      trimGain: 0.42,
      mortarDarkness: 0.35,
      mortarWidth: 0.025,
      mortarGlow: 0.04,
      maxLuma: 0.54
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Закат',
    description: 'Магический фиолет и неоновый розовый',
    palette: ['#c084fc', '#0d0817', '#180e2a'],
    variables: {
      bg: '#0d0817',
      bgGlow: 'rgba(236, 72, 153, 0.16)',
      surface: 'rgba(24, 14, 42, 0.72)',
      surfaceHover: 'rgba(36, 20, 64, 0.88)',
      border: 'rgba(192, 132, 252, 0.22)',
      borderHover: 'rgba(236, 72, 153, 0.55)',
      text: '#faf5ff',
      textMuted: '#c084fc',
      accent: '#c084fc',
      accent2: '#f43f5e',
      glow: 'rgba(236, 72, 153, 0.35)',
      houseColor: '#f43f5e',
      radius: '1rem',
      footerBg: '#130a21',
      footerText: '#d8b4fe',
      footerLink: '#f472b6',
      footerHeading: '#faf5ff'
    },
    scene3d: {
      bg: '#0d0817',
      starColor: '#e9d5ff',
      dustColor: '#e9d5ff',
      sparkColor: '#ffb86b',
      fogColor: '#0d0817',
      blending: 'additive',
      particleAlpha: 0.65,
      bloomStrength: 0.30,
      vignette: 0.35,
      grain: 0.03,
      camera: {
        fov: 32,
        elevation: 24,
        azimuth: 32,
        lookAtY: 0
      }
    },
    house: {
      wall: '#c084fc',
      roof: '#a855f7',
      mortar: '#c084fc',
      trim: '#f472b6',
      windowGlow: '#fed7aa',
      smoke: '#cbd5e1',
      wallGain: 0.35,
      roofGain: 0.30,
      baseGain: 0.20,
      trimGain: 0.42,
      mortarDarkness: 0.35,
      mortarWidth: 0.025,
      mortarGlow: 0.04,
      maxLuma: 0.54
    }
  },
  light: {
    id: 'light',
    name: 'Светлая',
    description: 'Чертёжный синий на архитектурном белом',
    palette: ['#0284c7', '#f4f7fb', '#ffffff'],
    variables: {
      bg: '#f4f7fb',
      bgGlow: 'rgba(2, 132, 199, 0.10)',
      surface: 'rgba(255, 255, 255, 0.85)',
      surfaceHover: 'rgba(255, 255, 255, 0.98)',
      border: 'rgba(148, 163, 184, 0.35)',
      borderHover: 'rgba(2, 132, 199, 0.65)',
      text: '#0f172a',
      textMuted: '#475569',
      accent: '#0284c7',
      accent2: '#059669',
      glow: 'rgba(2, 132, 199, 0.20)',
      houseColor: '#2c5282',
      radius: '1rem',
      footerBg: '#ffffff',
      footerText: '#475569',
      footerLink: '#0369a1',
      footerHeading: '#0f172a'
    },
    scene3d: {
      bg: '#f4f7fb',
      starColor: '#4a6fa5',
      dustColor: '#4a6fa5',
      sparkColor: '#e08a2e',
      fogColor: '#f4f7fb',
      blending: 'normal',
      particleAlpha: 0.25,
      bloomStrength: 0.0,
      vignette: 0.06,
      grain: 0.03,
      camera: {
        fov: 32,
        elevation: 24,
        azimuth: 32,
        lookAtY: 0
      }
    },
    house: {
      wall: '#2c5282',
      roof: '#1a365d',
      mortar: '#cbd5e1',
      trim: '#2b6cb0',
      windowGlow: '#dd6b20',
      smoke: '#64748b',
      wallGain: 0.85,
      roofGain: 0.72,
      baseGain: 0.55,
      trimGain: 0.90,
      mortarDarkness: 0.35,
      mortarWidth: 0.025,
      mortarGlow: 0.0,
      maxLuma: 0.75
    }
  }
};

export const DEFAULT_THEME = 'neon';

export function getThemeSceneConfig(themeId: string): ThemeScene3DConfig {
  const preset = THEME_PRESETS[themeId] || THEME_PRESETS[DEFAULT_THEME];
  return preset.scene3d;
}

export function getThemeHouseConfig(themeId: string): ThemeHouseConfig {
  const preset = THEME_PRESETS[themeId] || THEME_PRESETS[DEFAULT_THEME];
  return preset.house;
}
