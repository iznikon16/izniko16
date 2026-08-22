import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getVisiblePageNumbers } from '@/lib/pagination';

type PaginationProps = {
  page: number;
  pageCount: number;
  pageSize?: number;
  totalItems?: number;
  itemLabel?: string;
  searchParams?: Record<string, string | string[] | undefined>;
};

export function Pagination({ page, pageCount, pageSize = 25, totalItems, itemLabel = 'kayıt', searchParams = {} }: PaginationProps) {
  if (pageCount <= 1) return null;

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      const normalized = Array.isArray(value) ? value[0] : value;
      if (normalized && key !== 'page') params.set(key, normalized);
    });
    if (pageNumber > 1) params.set('page', String(pageNumber));
    const query = params.toString();
    return query ? `?${query}` : '?';
  };

  const visiblePages = getVisiblePageNumbers(page, pageCount);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = totalItems == null ? null : Math.min(page * pageSize, totalItems);
  const enabledClass = 'inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-sky-300 hover:text-sky-700';
  const disabledClass = 'inline-flex h-10 pointer-events-none items-center gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 text-sm font-semibold text-slate-300';

  return (
    <nav className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6" aria-label={`${itemLabel} sayfaları`}>
      <p className="text-sm text-slate-600">
        {totalItems == null || lastItem == null ? (
          <>Sayfa <span className="font-semibold text-slate-900">{page}</span> / {pageCount}</>
        ) : (
          <><span className="font-semibold text-slate-900">{firstItem}-{lastItem}</span> / {totalItems.toLocaleString('tr-TR')} {itemLabel}</>
        )}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {page <= 1 ? <span className={disabledClass}><ChevronLeft className="h-4 w-4" />Önceki</span> : <Link href={createPageUrl(page - 1)} className={enabledClass}><ChevronLeft className="h-4 w-4" />Önceki</Link>}
        {visiblePages.map((pageNumber, index) => (
          <span key={pageNumber} className="contents">
            {index > 0 && pageNumber - visiblePages[index - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}
            <Link href={createPageUrl(pageNumber)} aria-current={pageNumber === page ? 'page' : undefined} className={`grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-bold transition-colors ${pageNumber === page ? 'border-sky-500 bg-sky-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'}`}>{pageNumber}</Link>
          </span>
        ))}
        {page >= pageCount ? <span className={disabledClass}>Sonraki<ChevronRight className="h-4 w-4" /></span> : <Link href={createPageUrl(page + 1)} className={enabledClass}>Sonraki<ChevronRight className="h-4 w-4" /></Link>}
      </div>
    </nav>
  );
}
