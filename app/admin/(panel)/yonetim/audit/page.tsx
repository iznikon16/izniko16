import Link from 'next/link';
import { ChevronLeft, ChevronRight, Filter, History, RotateCcw, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { hideAuditLogAction, permanentlyDeleteAuditLogsAction, restoreAuditLogAction } from './actions';
import { AuditSelectAll } from './audit-select-all';
import { requireAdminPermission } from '@/lib/auth/admin';
import { getAuditActionLabel, getAuditFilterOptions, getAuditResourceLabel, queryAuditLogs } from '@/lib/audit/queries';
import { Button } from '@/components/ui/button';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { getRoleLabel } from '@/lib/auth/roles';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function safeDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function stringify(value: unknown) {
  if (!value || typeof value !== 'object' || !Object.keys(value).length) return '';
  return JSON.stringify(value, null, 2);
}

function buildPageUrl(raw: Record<string, string | string[] | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const key of ['q', 'action', 'resource', 'from', 'to', 'state']) {
    const value = first(raw[key]);
    if (value) params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/yonetim/audit?${query}` : '/admin/yonetim/audit';
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  const session = await requireAdminPermission('audit.view');
  const raw = await searchParams;
  const isSuperAdmin = session.adminUser.is_super_admin;
  const stateParam = first(raw.state);
  const state: 'active' | 'deleted' | 'all' = isSuperAdmin && ['deleted', 'all'].includes(stateParam) ? stateParam as 'deleted' | 'all' : 'active';
  const filters = {
    query: first(raw.q).slice(0, 100),
    action: first(raw.action).slice(0, 160),
    resourceType: first(raw.resource).slice(0, 120),
    from: safeDate(first(raw.from)),
    to: safeDate(first(raw.to)),
    state,
    page: Math.max(1, Number.parseInt(first(raw.page), 10) || 1),
    pageSize: 25,
  };
  const [result, options] = await Promise.all([queryAuditLogs(filters), getAuditFilterOptions()]);
  const visiblePages = Array.from({ length: result.pageCount }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === result.pageCount || Math.abs(page - result.page) <= 2);

  return (
    <main className="mx-auto max-w-[1500px] space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">Yönetim ve Güvenlik</p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
            <span className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-600"><History className="size-5" /></span>
            Audit Log
          </h1>
          <p className="mt-2 text-sm text-slate-500">Cari, tahsilat, sipariş, stok, kullanıcı ve entegrasyon işlemlerinin değiştirilemez denetim izi.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <div><p className="text-xs font-semibold text-slate-900">{result.count.toLocaleString('tr-TR')} kayıt</p><p className="text-[11px] text-slate-500">Sayfa {result.page} / {result.pageCount}</p></div>
        </div>
      </header>

      <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(180px,1fr)_150px_150px_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Ara
          <span className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={filters.query} maxLength={100} placeholder="İşlem, kaynak veya ID" className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /></span>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">İşlem
          <select name="action" defaultValue={filters.action} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"><option value="">Tüm işlemler</option>{options.actions.map((action) => <option key={action} value={action}>{getAuditActionLabel(action)}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Kaynak
          <select name="resource" defaultValue={filters.resourceType} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"><option value="">Tüm kaynaklar</option>{options.resourceTypes.map((resource) => <option key={resource} value={resource}>{getAuditResourceLabel(resource)}</option>)}</select>
        </label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Başlangıç<input type="date" name="from" defaultValue={filters.from} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400" /></label>
        <label className="grid gap-1.5 text-xs font-semibold text-slate-600">Bitiş<input type="date" name="to" defaultValue={filters.to} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-400" /></label>
        <Button type="submit" className="h-11 gap-2 rounded-xl"><Filter className="h-4 w-4" />Filtrele</Button>
        {isSuperAdmin && result.retentionAvailable && <label className="grid gap-1.5 text-xs font-semibold text-slate-600 lg:col-start-3">Kayıt durumu
          <select name="state" defaultValue={state} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400"><option value="active">Aktif kayıtlar</option><option value="deleted">Gizlenen kayıtlar</option><option value="all">Tümü</option></select>
        </label>}
      </form>

      {isSuperAdmin && result.rows.length > 0 && <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <AuditSelectAll formId="bulk-audit-delete" total={result.rows.length} />
        <ToastActionForm id="bulk-audit-delete" action={permanentlyDeleteAuditLogsAction} confirmation={{ title: 'Seçili audit kayıtlarını kalıcı sil', description: 'Bu işlem geri alınamaz. Seçtiğiniz audit kayıtları veritabanından fiziksel olarak silinecektir.', confirmLabel: 'Kalıcı Sil', destructive: true }}>
          <Button type="submit" variant="destructive" size="sm" className="gap-2"><Trash2 className="h-4 w-4" />Seçili Kayıtları Kalıcı Sil</Button>
        </ToastActionForm>
      </div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(220px,1.2fr)_180px_minmax(190px,1fr)_170px_180px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-500 lg:grid">
          <span>İşlem</span><span>Kaynak</span><span>Kullanıcı</span><span>Tarih</span><span className="text-right">İşlem</span>
        </div>
        <div className="divide-y divide-slate-100">
          {result.rows.map((log) => {
            const oldValue = stringify(log.old_value);
            const newValue = stringify(log.new_value);
            const metadata = stringify(log.metadata);
            return (
              <article key={log.id} className={`px-4 py-4 sm:px-5 ${log.deleted_at ? 'bg-slate-50 opacity-75' : 'hover:bg-sky-50/30'}`}>
                <div className="grid gap-3 lg:grid-cols-[minmax(220px,1.2fr)_180px_minmax(190px,1fr)_170px_180px] lg:items-center lg:gap-4">
                  <div className="min-w-0"><div className="flex items-center gap-2"><input aria-label={`${getAuditActionLabel(log.action)} kaydını seç`} type="checkbox" name="ids" value={log.id} form="bulk-audit-delete" className="h-4 w-4 shrink-0 rounded border-slate-300 accent-sky-500" /><span className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">{getAuditActionLabel(log.action)}</span></div><p className="mt-1 truncate pl-6 font-mono text-[11px] text-slate-400" title={log.id}>{log.id}</p></div>
                  <div className="min-w-0"><p className="text-sm font-semibold text-slate-800">{getAuditResourceLabel(log.resource_type)}</p><p className="truncate font-mono text-[11px] text-slate-500" title={log.resource_id}>{log.resource_id || '—'}</p></div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{log.actorName}</p><p className="truncate text-xs text-slate-500">{log.actorEmail || (log.actorRole === 'system' ? 'Sistem' : getRoleLabel(log.actorRole))}</p></div>
                  <div><p className="text-sm text-slate-700">{new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(new Date(log.created_at))}</p><p className="mt-1 text-[11px] text-slate-400">{log.ip_address || 'IP kaydı yok'}</p></div>
                  <div className="flex justify-end">
                    {isSuperAdmin && result.retentionAvailable && !log.deleted_at ? <ToastActionForm action={hideAuditLogAction} successMessage="Audit kaydı görünümden kaldırıldı." confirmation={{ title: 'Audit kaydını gizle', description: 'Kayıt fiziksel olarak silinmeyecek ve Super Admin tarafından geri yüklenebilecek.', confirmLabel: 'Gizle', destructive: true }}><input type="hidden" name="id" value={log.id} /><Button type="submit" variant="destructive" size="sm" className="gap-1.5"><Trash2 className="h-3.5 w-3.5" />Sil</Button></ToastActionForm> : null}
                    {isSuperAdmin && result.retentionAvailable && log.deleted_at ? <ToastActionForm action={restoreAuditLogAction} successMessage="Audit kaydı geri yüklendi."><input type="hidden" name="id" value={log.id} /><Button type="submit" variant="outline" size="sm" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" />Geri al</Button></ToastActionForm> : null}
                    {isSuperAdmin && <ToastActionForm action={permanentlyDeleteAuditLogsAction} confirmation={{ title: 'Audit kaydını kalıcı sil', description: 'Bu işlem geri alınamaz ve kayıt veritabanından fiziksel olarak silinir.', confirmLabel: 'Kalıcı Sil', destructive: true }}><input type="hidden" name="id" value={log.id} /><Button type="submit" variant="destructive" size="sm" className="ml-2 gap-1.5"><Trash2 className="h-3.5 w-3.5" />Kalıcı Sil</Button></ToastActionForm>}
                  </div>
                </div>
                {(oldValue || newValue || metadata) && <details className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70"><summary className="cursor-pointer list-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-sky-700">Eski / yeni değer ve teknik detaylar</summary><div className="grid gap-3 border-t border-slate-100 p-3 xl:grid-cols-3">{oldValue && <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-rose-600">Eski değer</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-[11px] text-slate-700">{oldValue}</pre></div>}{newValue && <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">Yeni değer</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-[11px] text-slate-700">{newValue}</pre></div>}{metadata && <div><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-sky-600">Metadata</p><pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-white p-3 text-[11px] text-slate-700">{metadata}</pre></div>}</div></details>}
              </article>
            );
          })}
          {!result.rows.length && <div className="px-5 py-16 text-center"><History className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Bu filtrelerle eşleşen audit kaydı yok.</p><p className="mt-1 text-sm text-slate-500">Filtreleri temizleyerek tekrar deneyin.</p></div>}
        </div>
      </section>

      {result.pageCount > 1 && <nav aria-label="Audit sayfaları" className="flex flex-wrap items-center justify-center gap-2">
        <Link aria-disabled={result.page === 1} tabIndex={result.page === 1 ? -1 : undefined} href={buildPageUrl(raw, Math.max(1, result.page - 1))} className={`inline-flex h-10 items-center gap-1 rounded-xl border px-3 text-sm font-semibold ${result.page === 1 ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'}`}><ChevronLeft className="h-4 w-4" />Önceki</Link>
        {visiblePages.map((page, index) => <span key={page} className="contents">{index > 0 && page - visiblePages[index - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}<Link href={buildPageUrl(raw, page)} aria-current={page === result.page ? 'page' : undefined} className={`grid h-10 min-w-10 place-items-center rounded-xl border px-3 text-sm font-bold ${page === result.page ? 'border-sky-500 bg-sky-500 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'}`}>{page}</Link></span>)}
        <Link aria-disabled={result.page === result.pageCount} tabIndex={result.page === result.pageCount ? -1 : undefined} href={buildPageUrl(raw, Math.min(result.pageCount, result.page + 1))} className={`inline-flex h-10 items-center gap-1 rounded-xl border px-3 text-sm font-semibold ${result.page === result.pageCount ? 'pointer-events-none border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700'}`}>Sonraki<ChevronRight className="h-4 w-4" /></Link>
      </nav>}
    </main>
  );
}
