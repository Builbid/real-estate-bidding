import Link from 'next/link';
import { cn } from '@/lib/utils';
import { NAV_PRESSABLE } from '@/lib/navStyles';

type NavLinkProps = React.ComponentProps<typeof Link>;

/** Internal route link with prefetch and consistent press feedback. */
export function NavLink({ className, prefetch = true, ...props }: NavLinkProps) {
  return (
    <Link
      prefetch={prefetch}
      className={cn(NAV_PRESSABLE, className)}
      {...props}
    />
  );
}
