'use client';

import { cn } from '@/lib/utils';
import { NAV_ICON_BUTTON } from '@/lib/navStyles';

type NavIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

/** Icon / ghost navigation button with instant press feedback. */
export function NavIconButton({ className, type = 'button', ...props }: NavIconButtonProps) {
  return (
    <button
      type={type}
      className={cn(NAV_ICON_BUTTON, className)}
      {...props}
    />
  );
}
