/** Instant press feedback for navigation controls — works on mouse and touch. */
export const NAV_PRESSABLE =
  'transition-[background-color,opacity,color,transform] duration-150 ease-out active:opacity-70 active:scale-[0.97] touch-manipulation select-none';

export const NAV_ICON_BUTTON =
  'inline-flex items-center justify-center transition-[background-color,opacity,color,transform] duration-150 ease-out active:opacity-70 active:scale-[0.95] active:bg-accent/80 touch-manipulation select-none';

export const NAV_MENU_ITEM =
  'rounded-lg transition-[background-color,opacity,color] duration-150 ease-out active:opacity-70 active:bg-accent/90 touch-manipulation select-none';

export const NAV_BACK_LINK =
  'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 -ml-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50';

export const NAV_LOGO_LINK =
  'flex items-center gap-2.5 group cursor-pointer no-underline transition-[opacity,transform] duration-150 ease-out active:opacity-70 active:scale-[0.98] touch-manipulation select-none';
