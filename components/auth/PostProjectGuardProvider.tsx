'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { ContractorPostProjectBlockedDialog } from '@/components/auth/ContractorPostProjectBlockedDialog';
import { decidePostProjectAccess } from '@/lib/auth/roles';
import { isNewProjectHref } from '@/lib/dashboard/paths';
import { useClientAuthHint } from '@/lib/auth/useClientAuthHint';
import { useProfile } from '@/lib/hooks/useProfile';

interface PostProjectGuardContextValue {
  openBlockedDialog: () => void;
  requestPostProject: (href: string) => boolean;
}

const PostProjectGuardContext = createContext<PostProjectGuardContextValue | null>(null);

export function usePostProjectGuard(): PostProjectGuardContextValue {
  const ctx = useContext(PostProjectGuardContext);
  if (!ctx) {
    throw new Error('usePostProjectGuard must be used within PostProjectGuardProvider');
  }
  return ctx;
}

export function useOptionalPostProjectGuard(): PostProjectGuardContextValue | null {
  return useContext(PostProjectGuardContext);
}

export function PostProjectGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hint = useClientAuthHint();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);

  const role = profile?.role ?? hint.role;
  const isAuthenticated = Boolean(profile) || hint.isAuthenticated;

  const requestPostProject = useCallback(
    (href: string) => {
      const decision = decidePostProjectAccess(isAuthenticated, role);
      if (decision === 'blocked') {
        setOpen(true);
        return false;
      }
      if (decision === 'login') {
        router.push(`/login?next=${encodeURIComponent(href)}`);
        return false;
      }
      return true;
    },
    [isAuthenticated, role, router],
  );

  const openBlockedDialog = useCallback(() => setOpen(true), []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement | null)?.closest('a[href]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href || !isNewProjectHref(href, window.location.origin)) return;

      const decision = decidePostProjectAccess(isAuthenticated, role);
      if (decision !== 'blocked') return;

      event.preventDefault();
      event.stopPropagation();
      setOpen(true);
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [isAuthenticated, role]);

  const value = useMemo(
    () => ({ openBlockedDialog, requestPostProject }),
    [openBlockedDialog, requestPostProject],
  );

  return (
    <PostProjectGuardContext.Provider value={value}>
      {children}
      <ContractorPostProjectBlockedDialog open={open} onOpenChange={setOpen} />
    </PostProjectGuardContext.Provider>
  );
}
