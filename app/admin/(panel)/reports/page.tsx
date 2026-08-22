import Link from 'next/link';
import { BarChart3, Download, FileSpreadsheet, Search } from 'lucide-react';
import { requireAdminPermission } from '@/lib/auth/admin';
import { formatCommercePrice } from '@/lib/commerce/format';
import {
  ACCOUNTING_REPORT_TYPES,
  REPORT_TYPE_LABELS,
  getAccountingReport,
  parseAccountingReportFilters,
  type AccountingReportColumn,
} from '@/lib/reports/accounting';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatValue(value: string | number | null | undefined, column: AccountingReportColumn) {
  if (value === null || value === undefined || value === '') return '—';
  if (column.kind === 'money') return formatCommercePrice(Number(value));
  if (column.kind === 'date') {
    const date = new Date(String(value).length === 10 ? `${value}T12:00:00+03:00` : String(value));
    return Number.isNaN(date.valueOf()) ? String(value) : date.toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' });
  }
  return String(value);
}

export default async function ReportsPage({ searchParams }: PageProps) {
  await requireAdminPermission('report.view');
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ['type', 'q', 'from', 'to']) {
    const value = first(raw[key]);
    if (value) params.set(key, value);
  }
  let filterError = '';
  let filters;
  try {
    filters = parseAccountingReportFilters(params);
  } catch (error) {
    filterError = error instanceof Error ? error.message : 'Rapor filtreleri geçersiz.';
    filters = parseAccountingReportFilters(new URLSearchParams());
  }
  const report = await getAccountingReport(filters);
  const exportParams = new URLSearchParams({ type: filters.type, from: filters.fromDate, to: filters.toDate });
  if (filters.query) exportParams.set('q', filters.query);

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">Ön Muhasebe</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600"><BarChart3 className="size-5" /></span>
            Finansal Raporlar
          </h1>
          <p className="mt-2 text-sm text-slate-500">Cari, tahsilat, vade ve risk verilerini tek merkezden filtreleyip dışa aktarın.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/reports/csv?${exportParams}`} className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50">
            <Download className="size-4" /> CSV İndir
          </Link>
          <Link href={`/admin/reports/excel?${exportParams}`} className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600">
            <FileSpreadsheet className="size-4" /> Excel İndir
          </Link>
        </div>
      </header>

      <form method="get" className="grid gap-4 rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1.4fr)_170px_170px_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Rapor türü
          <select name="type" defaultValue={filters.type} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
            {ACCOUNTING_REPORT_TYPES.map((type) => <option key={type} value={type}>{REPORT_TYPE_LABELS[type]}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">
          Müşteri, e-posta veya referans
          <span className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={filters.query} maxLength={100} placeholder="Rapor içinde ara..." className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></span>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Başlangıç<input type="date" name="from" defaultValue={filters.fromDate} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Bitiş<input type="date" name="to" defaultValue={filters.toDate} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></label>
        <button className="h-11 rounded-full bg-sky-500 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600">Raporu Getir</button>
      </form>

      {filterError ? <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700">{filterError} Varsayılan dönem gösteriliyor.</p> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Rapor</p><p className="mt-2 font-semibold text-slate-900">{report.title}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Kayıt Sayısı</p><p className="mt-2 text-2xl font-bold text-slate-950">{report.rows.length.toLocaleString('tr-TR')}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Rapor Toplamı</p><p className="mt-2 text-2xl font-bold text-sky-700">{formatCommercePrice(report.totalAmount)}</p></div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-semibold text-slate-900">{report.title}</h2><p className="mt-1 text-xs text-slate-500">{report.description}</p></div>
        {report.truncated ? <p className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">Rapor ilk 5.000 kayıtla sınırlandırıldı. Daha dar bir filtre seçin.</p> : null}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr>{report.columns.map((column) => <th key={column.key} className={`whitespace-nowrap px-4 py-3 font-semibold text-slate-600 ${column.kind === 'money' || column.kind === 'number' ? 'text-right' : 'text-left'}`}>{column.label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {report.rows.map((row) => <tr key={row.id} className="hover:bg-slate-50/70">{report.columns.map((column) => <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-slate-700 ${column.kind === 'money' || column.kind === 'number' ? 'text-right font-medium' : 'text-left'}`}>{formatValue(row.values[column.key], column)}</td>)}</tr>)}
              {report.rows.length === 0 ? <tr><td colSpan={report.columns.length} className="px-5 py-16 text-center text-slate-500">Seçilen filtrelerle eşleşen rapor kaydı bulunamadı.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
