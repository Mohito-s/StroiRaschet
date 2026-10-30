export interface SavedCalculation {
  id: string;
  title: string;
  calcSlug: string;
  calcName: string;
  summary: string;
  date: string;
  timestamp: number;
  url: string;
  details?: Record<string, string | number>;
}

const STORAGE_KEY = 'stroycalc_my_house_v1';

export function getSavedCalculations(): SavedCalculation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCalculation(calc: Omit<SavedCalculation, 'id' | 'timestamp' | 'date'>): SavedCalculation {
  const calculations = getSavedCalculations();
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const newCalc: SavedCalculation = {
    ...calc,
    id: 'calc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
    date: dateFormatted
  };

  // Keep last 15 calculations
  const updated = [newCalc, ...calculations.filter(c => c.title !== newCalc.title || c.calcSlug !== newCalc.calcSlug)].slice(0, 15);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Dispatch event so other components (e.g. RecentCalculations on homepage) update immediately
  window.dispatchEvent(new CustomEvent('my-house-updated', { detail: { count: updated.length } }));

  return newCalc;
}

export function deleteCalculation(id: string): void {
  const calculations = getSavedCalculations();
  const updated = calculations.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('my-house-updated', { detail: { count: updated.length } }));
}

export function clearAllCalculations(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('my-house-updated', { detail: { count: 0 } }));
}
