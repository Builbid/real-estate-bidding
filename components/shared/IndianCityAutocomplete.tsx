'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatIndianCity,
  searchIndianCities,
  type IndianCity,
} from '@/lib/indianCities';

interface IndianCityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function IndianCityAutocomplete({
  value,
  onChange,
  label = 'City',
  placeholder = 'Search city anywhere in India…',
  disabled = false,
  error,
}: IndianCityAutocompleteProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = searchIndianCities(query);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function selectCity(city: IndianCity) {
    const formatted = formatIndianCity(city);
    setQuery(formatted);
    onChange(formatted);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleInputChange(next: string) {
    setQuery(next);
    onChange('');
    setOpen(true);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }

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
      selectCity(suggestions[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative flex flex-col gap-1.5 w-full">
      <label
        htmlFor={listboxId}
        className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
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
          aria-expanded={open && suggestions.length > 0}
          aria-controls={`${listboxId}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex h-11 w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground',
            'ring-offset-background transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:bg-card/60',
            error && 'border-red-500/70 focus:ring-red-500/40',
          )}
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{error}</p>
      )}

      {open && query.trim() && suggestions.length > 0 && (
        <ul
          id={`${listboxId}-listbox`}
          role="listbox"
          className="absolute top-full z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-popover py-1 shadow-lg"
        >
          {suggestions.map((city, index) => {
            const labelText = formatIndianCity(city);
            return (
              <li key={labelText} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center px-3 py-2.5 text-left text-sm text-foreground transition-colors',
                    index === activeIndex
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'hover:bg-secondary/80',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCity(city)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {labelText}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && query.trim() && suggestions.length === 0 && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2.5 text-sm text-muted-foreground shadow-lg">
          No matching cities. Try a different spelling.
        </div>
      )}
    </div>
  );
}
