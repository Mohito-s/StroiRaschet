import { useState } from 'preact/hooks';
import { saveCalculation } from '../../lib/storage/myHouse';

export interface CalculationActionsProps {
  calcSlug: string;
  calcName: string;
  defaultTitle: string;
  summaryText: string;
  formattedShareUrl?: string;
  onCopySuccess?: () => void;
}

export function CalculationActions({
  calcSlug,
  calcName,
  defaultTitle,
  summaryText,
  formattedShareUrl,
  onCopySuccess
}: CalculationActionsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveTitle, setSaveTitle] = useState(defaultTitle);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleSave = () => {
    if (!saveTitle.trim()) return;

    saveCalculation({
      title: saveTitle.trim(),
      calcSlug,
      calcName,
      summary: summaryText,
      url: window.location.href
    });

    setSavedSuccess(true);
    setIsSaving(false);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleShareClick = () => {
    const url = formattedShareUrl || window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true);
      if (onCopySuccess) onCopySuccess();
      setTimeout(() => setCopiedShare(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div class="space-y-3 pt-3 border-t border-[var(--border)] max-w-full">
      <div class="flex flex-wrap items-center gap-2 max-w-full">
        {/* Save to "Мой дом" */}
        <button
          type="button"
          onClick={() => setIsSaving(!isSaving)}
          class="btn-primary text-xs py-2 px-3 min-h-[44px] flex items-center justify-center gap-2 cursor-pointer font-semibold flex-1 min-w-[130px] sm:flex-initial"
          title="Сохранить результат в локальную смету «Мой дом»"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
          <span class="truncate">{savedSuccess ? '✓ В «Мой дом»' : 'Сохранить в «Мой дом»'}</span>
        </button>

        {/* Share link with URL params */}
        <button
          type="button"
          onClick={handleShareClick}
          class="btn-secondary text-xs py-2 px-3 min-h-[44px] flex items-center justify-center gap-2 cursor-pointer font-medium flex-1 min-w-[130px] sm:flex-initial"
          title="Скопировать ссылку с текущими параметрами расчёта"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span class="truncate">{copiedShare ? '✓ Скопировано' : 'Поделиться'}</span>
        </button>

        {/* Print / Download PDF */}
        <button
          type="button"
          onClick={handlePrint}
          class="btn-secondary text-xs py-2 px-3 min-h-[44px] flex items-center justify-center gap-2 cursor-pointer font-medium flex-1 min-w-[130px] sm:flex-initial"
          title="Распечатать или сохранить как PDF"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect width="12" height="8" x="6" y="14"/>
          </svg>
          <span class="truncate">PDF / Печать</span>
        </button>
      </div>

      {/* Save prompt popup inline */}
      {isSaving && (
        <div class="p-3.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)] flex flex-col sm:flex-row items-center gap-2.5 animate-fade-in text-xs max-w-full">
          <span class="text-[var(--text-muted)] shrink-0 font-medium">Название сметы:</span>
          <input
            type="text"
            value={saveTitle}
            onInput={(e) => setSaveTitle((e.target as HTMLInputElement).value)}
            placeholder="Например: Фундамент гаража 8х10"
            class="flex-grow w-full sm:w-auto px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none min-h-[44px] text-base"
          />
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleSave}
              class="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--btn-text)] font-semibold hover:brightness-110 cursor-pointer"
            >
              Сохранить
            </button>
            <button
              type="button"
              onClick={() => setIsSaving(false)}
              class="px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
