'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect } from 'react';

function resetScrollToTop() {
  const html = document.documentElement;
  const body = document.body;
  const scrolling = document.scrollingElement;

  const previousHtmlBehavior = html.style.scrollBehavior;
  const previousBodyBehavior = body.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  body.style.scrollBehavior = 'auto';

  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  if (scrolling && scrolling !== html && scrolling !== body) {
    scrolling.scrollTop = 0;
    scrolling.scrollLeft = 0;
  }
  html.scrollTop = 0;
  html.scrollLeft = 0;
  body.scrollTop = 0;
  body.scrollLeft = 0;

  html.style.scrollBehavior = previousHtmlBehavior;
  body.style.scrollBehavior = previousBodyBehavior;
}

/** Instantly pin every route change to the header — shared layouts must not keep footer scroll. */
export function ScrollToTopOnRouteChange() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    resetScrollToTop();

    const frame = window.requestAnimationFrame(() => {
      resetScrollToTop();
    });
    const delayed = window.setTimeout(resetScrollToTop, 50);

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) resetScrollToTop();
    }

    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(delayed);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [pathname]);

  return null;
}
