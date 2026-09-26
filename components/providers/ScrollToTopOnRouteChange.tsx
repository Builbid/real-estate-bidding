'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';

const STORAGE_KEY = 'builbid:scroll-positions';

function locationKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function readPositions(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePosition(key: string, y: number) {
  try {
    const positions = readPositions();
    positions[key] = y;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Private mode or a full sessionStorage quota should not block navigation.
  }
}

function applyScroll(top: number) {
  const html = document.documentElement;
  const body = document.body;
  const previousHtmlBehavior = html.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';

  window.scrollTo({ top, left: 0, behavior: 'instant' });
  html.scrollTop = top;
  html.scrollLeft = 0;
  body.scrollTop = top;
  body.scrollLeft = 0;

  html.style.scrollBehavior = previousHtmlBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

/**
 * New pages open at the top. Browser Back and router.back() return to the
 * exact scroll position saved for that URL.
 */
export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const key = locationKey(pathname, search);
  const keyRef = useRef(key);
  const pendingPop = useRef(false);
  const restoring = useRef(false);

  keyRef.current = key;

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    let frame = 0;

    function persistCurrent() {
      if (restoring.current) return;
      writePosition(keyRef.current, window.scrollY);
    }

    function onScroll() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(persistCurrent);
    }

    function restoreSaved() {
      const saved = readPositions()[window.location.pathname + window.location.search] ?? 0;
      restoring.current = true;
      applyScroll(saved);
      window.requestAnimationFrame(() => applyScroll(saved));
      window.setTimeout(() => applyScroll(saved), 0);
      window.setTimeout(() => applyScroll(saved), 50);
      window.setTimeout(() => {
        applyScroll(saved);
        restoring.current = false;
      }, 180);
    }

    function onPopState() {
      pendingPop.current = true;
      restoreSaved();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('click', persistCurrent, true);
    window.addEventListener('popstate', onPopState);
    window.addEventListener('pagehide', persistCurrent);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('click', persistCurrent, true);
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('pagehide', persistCurrent);
    };
  }, []);

  useLayoutEffect(() => {
    if (pendingPop.current) {
      pendingPop.current = false;
      const saved = readPositions()[key] ?? 0;
      restoring.current = true;
      applyScroll(saved);
      const frame = window.requestAnimationFrame(() => applyScroll(saved));
      const soon = window.setTimeout(() => applyScroll(saved), 0);
      const later = window.setTimeout(() => applyScroll(saved), 50);
      const done = window.setTimeout(() => {
        applyScroll(saved);
        restoring.current = false;
      }, 180);
      return () => {
        window.cancelAnimationFrame(frame);
        window.clearTimeout(soon);
        window.clearTimeout(later);
        window.clearTimeout(done);
      };
    }

    applyScroll(0);
    const frame = window.requestAnimationFrame(() => applyScroll(0));
    const delayed = window.setTimeout(() => applyScroll(0), 50);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
    };
  }, [key]);

  return null;
}
