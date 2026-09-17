/** Shared new-project form surfaces — clean white cards, blue selection, open spacing. */
export const FORM_SECTION_CARD = 'space-y-4';

export const FORM_BADGE =
  'inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide bg-blue-600 text-white';

export const FORM_CONTINUE_BTN =
  '!bg-blue-600 !from-blue-600 !to-blue-600 text-white shadow-none hover:!bg-blue-700 hover:!from-blue-700 hover:!to-blue-700';

export const FORM_NESTED_PANEL = 'space-y-4';

export const FORM_CHECKBOX =
  'mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600';

export const FORM_TEXTAREA =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 focus-visible:border-blue-600 dark:border-slate-200 dark:bg-white dark:text-slate-900';

export const FORM_PROGRESS_DONE = 'bg-blue-600 text-white';
export const FORM_PROGRESS_CURRENT =
  'border-2 border-blue-600 text-blue-600 bg-white';
export const FORM_PROGRESS_IDLE =
  'border border-slate-200 bg-white text-slate-400';
export const FORM_PROGRESS_LINE = 'h-px flex-1 bg-slate-200 mx-1 min-w-[8px]';

export const FORM_SHELL_CARD =
  'border border-slate-200 rounded-2xl bg-white shadow-none dark:bg-white dark:border-slate-200 dark:shadow-none dark:ring-0';

export const FORM_REVIEW_ROW =
  'grid grid-cols-12 gap-4 items-start py-4 border-b border-slate-100 last:border-b-0';

export const FORM_REVIEW_LABEL =
  'col-span-5 sm:col-span-4 text-slate-700 font-medium text-sm min-w-0';
export const FORM_REVIEW_VALUE =
  'col-span-7 sm:col-span-8 text-slate-900 font-semibold text-sm text-right whitespace-pre-line break-words min-w-0';

export const FORM_REVIEW_HIGHLIGHT =
  'border-0 bg-transparent rounded-none px-0';

export const FORM_OPTION_UNSELECTED =
  'border-2 border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-200 dark:bg-white dark:text-slate-700';

export const FORM_OPTION_SELECTED =
  'border-2 border-blue-600 bg-blue-50/30 text-slate-900 font-semibold dark:border-blue-600 dark:bg-blue-50/30 dark:text-slate-900';

/** @deprecated Use FORM_OPTION_SELECTED */
export const FORM_SELECTED_CARD = FORM_OPTION_SELECTED;

/** @deprecated Use FORM_OPTION_UNSELECTED */
export const FORM_OPTION_IDLE = FORM_OPTION_UNSELECTED;

export const FORM_NOTE =
  'mt-1.5 w-full text-left text-[11px] font-medium leading-snug text-slate-600';
