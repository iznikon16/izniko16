'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle, PackageSearch, Search, ShoppingCart, TurkishLira, UserRound, X } from 'lucide-react';
import type { AdminSearchGroup, AdminSearchResponse, AdminSearchResult } from '@/lib/admin/global-search';

const GROUP_LABELS: Record<AdminSearchGroup, string> = {
  customers: 'Müşteriler', products: 'Ürünler', orders: 'Siparişler', accounting: 'Cari Hareketler',
};

const GROUP_ICONS = {
  customers: UserRound, products: PackageSearch, orders: ShoppingCart, accounting: TurkishLira,
} satisfies Record<AdminSearchGroup, typeof Search>;

export function GlobalSearch() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const grouped = useMemo(() => {
    return (Object.keys(GROUP_LABELS) as AdminSearchGroup[]).flatMap((group) => {
      const items = results.filter((result) => result.group === group);
      return items.length ? [{ group, items }] : [];
    });
  }, [results]);

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('search_failed');
        const payload = await response.json() as AdminSearchResponse;
        setResults(payload.results);
        setStatus('ready');
        setActiveIndex(payload.results.length ? 0 : -1);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResults([]);
        setStatus('error');
        setActiveIndex(-1);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  function navigate(result: AdminSearchResult) {
    setOpen(false);
    setQuery('');
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? results.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      navigate(results[activeIndex]);
    }
  }

  let resultIndex = -1;
  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          if (nextQuery.trim().length < 2) {
            setResults([]);
            setStatus('idle');
            setActiveIndex(-1);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Müşteri, ürün, sipariş veya cari ara..."
        className="h-10 w-56 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100 lg:w-64 xl:w-80"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && query.trim().length >= 2}
        aria-controls="admin-global-search-results"
        aria-activedescendant={activeIndex >= 0 ? `admin-search-result-${activeIndex}` : undefined}
      />
      {status === 'loading' ? <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-sky-500" /> : query ? (
        <button type="button" onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }} aria-label="Aramayı temizle" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="size-4" /></button>
      ) : null}

      {open && query.trim().length >= 2 ? (
        <div id="admin-global-search-results" role="listbox" className="absolute left-0 top-[calc(100%+10px)] z-50 max-h-[70vh] w-[min(560px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
          {status === 'loading' && results.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Aranıyor...</p> : null}
          {status === 'error' ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-4 text-sm text-red-700">Arama şu anda tamamlanamadı. Lütfen tekrar deneyin.</p> : null}
          {status === 'ready' && results.length === 0 ? <p className="px-4 py-8 text-center text-sm text-slate-500">Eşleşen kayıt bulunamadı.</p> : null}
          {grouped.map(({ group, items }) => (
            <section key={group} aria-label={GROUP_LABELS[group]} className="py-1">
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{GROUP_LABELS[group]}</p>
              {items.map((result) => {
                resultIndex += 1;
                const index = resultIndex;
                const Icon = GROUP_ICONS[result.group];
                return (
                  <button
                    id={`admin-search-result-${index}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    key={result.id}
                    type="button"
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => navigate(result)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${activeIndex === index ? 'bg-sky-50' : 'hover:bg-slate-50'}`}
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-sky-600 shadow-sm ring-1 ring-slate-200"><Icon className="size-4" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-900">{result.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{result.subtitle}</span></span>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{result.badge}</span>
                  </button>
                );
              })}
            </section>
          ))}
          {results.length ? <p className="border-t border-slate-100 px-3 pb-1 pt-2 text-[10px] text-slate-400">↑ ↓ ile seçin, Enter ile açın, Esc ile kapatın.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
