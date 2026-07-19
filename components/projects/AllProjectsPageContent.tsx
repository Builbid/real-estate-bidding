'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/shared/Navbar';
import { ShowcaseProjectCard } from '@/components/home/ShowcaseProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadActiveProjectsPage } from '@/app/actions/projects';
import type { ShowcaseProject } from '@/lib/projectShowcase';
import { NavLink } from '@/components/shared/NavLink';
import { NAV_BACK_LINK } from '@/lib/navStyles';
import { cn } from '@/lib/utils';

interface AllProjectsPageContentProps {
  initialProjects: ShowcaseProject[];
  initialTotal: number;
  initialHasMore: boolean;
  initialNextOffset: number;
  role: string | null;
}

export function AllProjectsPageContent({
  initialProjects,
  initialTotal,
  role,
}: AllProjectsPageContentProps) {
  const [projects, setProjects] = useState(initialProjects);
  const [total, setTotal] = useState(initialTotal);
  const [locationSearch, setLocationSearch] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const searchRequestId = useRef(0);

  const runSearch = useCallback((query: string) => {
    const requestId = ++searchRequestId.current;
    startTransition(async () => {
      const result = await loadActiveProjectsPage({
        offset: 0,
        search: query,
      });
      if (requestId !== searchRequestId.current) return;
      setProjects(result.projects);
      setTotal(result.total);
      setActiveSearch(query.trim());
    });
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const trimmed = locationSearch.trim();
      if (trimmed === activeSearch) return;
      runSearch(trimmed);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [locationSearch, activeSearch, runSearch]);

  const handleExpire = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== projectId));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 pb-16">
        <NavLink href="/" prefetch className={cn(NAV_BACK_LINK, 'mb-6')}>
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </NavLink>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              All Projects
            </h1>
            <span className="rounded-full border border-emerald-600/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/20 dark:text-emerald-400">
              {total} open
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Browse live construction auctions. Search by location or project name.
          </p>
        </header>

        <div className="mb-6 max-w-md">
          <Input
            type="search"
            value={locationSearch}
            onChange={(event) => setLocationSearch(event.target.value)}
            placeholder="Search by specific location"
            aria-label="Search by specific location"
            prefix={<Search className="h-4 w-4" />}
          />
        </div>

        {projects.length > 0 ? (
          <div
            className={cn(
              'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3',
              isPending && 'opacity-70 transition-opacity',
            )}
          >
            {projects.map((project) => (
              <ShowcaseProjectCard
                key={project.id}
                project={project}
                role={role}
                onExpire={handleExpire}
                hideWhenExpired={false}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <Sparkles className="h-6 w-6 text-emerald-500" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              {activeSearch ? 'No matching projects' : 'No Active Projects'}
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-muted-foreground">
              {activeSearch
                ? 'Try a different location or project name.'
                : 'Be the first to post a project. The live feed will appear here.'}
            </p>
            {!activeSearch && (
              <Button asChild>
                <Link href="/register?role=owner">Sign up as Project owner</Link>
              </Button>
            )}
          </div>
        )}
      </main>
    </>
  );
}
