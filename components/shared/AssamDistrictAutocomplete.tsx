'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  parseAssamDistrictSelection,
  searchAssamDistricts,
  type AssamDistrict,
} from '@/lib/assamDistricts';

export { parseAssamDistrictSelection };

interface AssamDistrictAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function AssamDistrictAutocomplete({
  value,
  onChange,
  label = 'District',
  placeholder = 'Select district',
  disabled = false,
  error,
}: AssamDistrictAutocompleteProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(() => searchAssamDistricts(query), [query]);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
        // Restore committed selection if user typed without selecting
        const parsed = parseAssamDistrictSelection(value);
        setQuery(parsed?.district ?? value);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [value]);

  function selectDistrict(district: AssamDistrict) {
    setQuery(district);
    onChange(district);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    // Clear form value until a list item is chosen
    if (!parseAssamDistrictSelection(next)) {
      onChange('');
    } else {
      onChange(next.trim());
    }
    setOpen(true);
    setActiveIndex(0);
  }

  function handleFocus() {
    setOpen(true);
    setActiveIndex(0);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(0);
      return;
    }

    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (event.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      event.preventDefault();
      selectDistrict(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      const parsed = parseAssamDistrictSelection(value);
      setQuery(parsed?.district ?? value);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">
      <label
        htmlFor={listboxId}
        className="text-xs font-semibold text-gray-800 dark:text-zinc-100 uppercase tracking-wider"
      >
        {label}
      </label>

      <div className="relative flex items-center">
        <div className="absolute left-3 text-muted-foreground text-sm pointer-events-none">
          <MapPin className="w-3.5 h-3.5" />
        </div>
        <input
          id={listboxId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${listboxId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-11 w-full rounded-lg border border-input bg-background pl-8 pr-9 py-2 text-base md:text-sm text-foreground placeholder:text-slate-600 dark:placeholder:text-slate-300',
            'ring-offset-background transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-card/60',
            error && 'border-red-500/70 focus:ring-red-500/40',
          )}
        />
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-3 h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
      )}

      {open && suggestions.length > 0 && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {suggestions.map((district, index) => (
            <li
              key={district}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex || value === district}
            >
              <button
                type="button"
                className={cn(
                  'flex w-full items-center px-3 py-2.5 text-left text-sm text-foreground transition-colors',
                  index === activeIndex
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'hover:bg-secondary/80',
                  value === district && index !== activeIndex && 'font-medium',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectDistrict(district)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {district}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && query.trim() && suggestions.length === 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
          No matching Assam district.
        </div>
      )}
    </div>
  );
}
