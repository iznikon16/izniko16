import Link from 'next/link';
import { ChevronDown, Inbox, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { deleteInquiryAction, saveInquiryAction } from '@/app/admin/(panel)/inquiries/actions';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { getAdminInquiries } from '@/lib/admin/inquiry-queries';
import type { AdminInquiryFilters, CustomerInquiryRow } from '@/lib/catalog/types';

type AdminInquiriesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const sourceLabels: Record<CustomerInquiryRow['source'], string> = {
  contact: 'İletişim',
  discovery: 'Şasi ile Parça Talebi',
  product_offer: 'Ürün Teklifi',
};

const statusLabels: Record<CustomerInquiryRow['status'], string> = {
  closed: 'Kapandı',
  in_progress: 'İşlemde',
  new: 'Yeni',
  spam: 'Spam',
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function parseFilters(searchParams: Record<string, string | string[] | undefined>): AdminInquiryFilters {
  const query = getSingleParam(searchParams.query).trim();
  const source = getSingleParam(searchParams.source).trim() as CustomerInquiryRow['source'] | '';
  const status = getSingleParam(searchParams.status).trim() as CustomerInquiryRow['status'] | '';

  return {
    query: query || undefined,
    source: source || undefined,
    status: status || undefined,
  };
}

function getStatusTone(status: CustomerInquiryRow['status']) {
  if (status === 'new') {
    return 'border-sky-200 bg-sky-50 text-sky-500';
  }

  if (status === 'in_progress') {
    return 'border-amber-200 bg-amber-50 text-amber-600';
  }

  if (status === 'closed') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  return 'border-gray-200 bg-gray-50 text-gray-500';
}

function InquiryRow({ inquiry }: { inquiry: CustomerInquiryRow }) {
  return (
    <details className="group border-t border-gray-100 first:border-t-0">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 outline-none transition-colors hover:bg-sky-50/50 xl:grid-cols-[120px_minmax(200px,1fr)_170px_160px_150px_34px] xl:items-center">
        <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${getStatusTone(inquiry.status)}`}>
          {statusLabels[inquiry.status]}
        </span>

        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-[-0.03em] text-gray-900">{inquiry.full_name || 'İsimsiz talep'}</h3>
          <p className="mt-1 truncate text-xs text-gray-500">{inquiry.subject || sourceLabels[inquiry.source]}</p>
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{inquiry.phone || 'Telefon yok'}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{inquiry.email || 'E-posta yok'}</p>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{sourceLabels[inquiry.source]}</p>
          <p className="mt-1 truncate text-xs text-gray-500">{inquiry.product_title || inquiry.location || 'Detay yok'}</p>
        </div>

        <p className="text-sm text-gray-500 xl:text-right">{dateFormatter.format(new Date(inquiry.created_at))}</p>
        <ChevronDown className="hidden h-4 w-4 text-gray-500 transition-transform group-open:rotate-180 xl:block" />
      </summary>

      <div className="border-t border-gray-100 bg-gray-50 p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-500">Mesaj</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-500">{inquiry.message || 'Mesaj girilmedi.'}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[18px] border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Konum</p>
                <p className="mt-2 text-sm text-gray-500">{inquiry.location || 'Belirtilmedi'}</p>
              </div>
              <div className="rounded-[18px] border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Ürün</p>
                <p className="mt-2 text-sm text-gray-500">{inquiry.product_title || 'Belirtilmedi'}</p>
              </div>
              <div className="rounded-[18px] border border-gray-100 bg-white p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Hizmet</p>
                <p className="mt-2 text-sm text-gray-500">{inquiry.services.length > 0 ? inquiry.services.join(', ') : 'Belirtilmedi'}</p>
              </div>
            </div>
          </div>

          <div className="grid content-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <ToastActionForm action={saveInquiryAction} successMessage="Talep bilgileri güncellendi." errorMessage="Talep bilgileri güncellenemedi." className="grid gap-3">
              <input type="hidden" name="id" value={inquiry.id} />
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Durum</span>
                <select name="status" defaultValue={inquiry.status} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Operasyon notu</span>
                <textarea name="admin_note" rows={4} defaultValue={inquiry.admin_note} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none" />
              </label>
              <button type="submit" className="rounded-xl bg-[#0ea5e9] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#0284c7] hover:shadow-md">
                Talebi Güncelle
              </button>
            </ToastActionForm>

            <form action={deleteInquiryAction}>
              <input type="hidden" name="id" value={inquiry.id} />
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100">
                <Trash2 className="h-4 w-4" />
                Sil
              </button>
            </form>
          </div>
        </div>
      </div>
    </details>
  );
}

export default async function AdminInquiriesPage({ searchParams }: AdminInquiriesPageProps) {
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseFilters(resolvedSearchParams);
  const inquiries = await getAdminInquiries(filters);
  const activeFilterCount = [filters.query, filters.source, filters.status].filter(Boolean).length;
  const activeFilterLabels = [
    filters.query ? `Arama: ${filters.query}` : null,
    filters.source ? `Kaynak: ${sourceLabels[filters.source]}` : null,
    filters.status ? `Durum: ${statusLabels[filters.status]}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto grid w-full max-w-[1440px] gap-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Talepler</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Form ve Teklif Merkezi</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              İletişim, parça talebi ve ürün teklif formları burada listelenir. SMTP aktifse bildirimler aynı anda gönderilir.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">Toplam</p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{inquiries.length} talep</p>
          </div>
        </div>

        <form className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:p-5 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))_auto]">
          <div className="contents">
            <label className="flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <Search className="h-4 w-4 text-gray-500" />
              <input name="query" defaultValue={filters.query ?? ''} placeholder="Ad, telefon, e-posta, konu veya ürün ara" className="w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-500" />
            </label>

            <select name="source" defaultValue={filters.source ?? ''} className="rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
              <option value="">Tüm kaynaklar</option>
              {Object.entries(sourceLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            <select name="status" defaultValue={filters.status ?? ''} className="rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none">
              <option value="">Tüm durumlar</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"><SlidersHorizontal className="h-4 w-4" />Filtrele</button>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3 xl:col-span-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {activeFilterLabels.map((label) => (
                <span key={label} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterCount > 0 ? (
                <Link href="/admin/inquiries" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900">
                  <X className="h-4 w-4" />
                  Temizle
                </Link>
              ) : null}
            </div>
          </div>
        </form>

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="hidden border-b border-gray-100 bg-gray-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 xl:grid xl:grid-cols-[120px_minmax(200px,1fr)_170px_160px_150px_34px]">
            <span>Durum</span>
            <span>Talep</span>
            <span>İletişim</span>
            <span>Kaynak</span>
            <span>Tarih</span>
            <span />
          </div>

          {inquiries.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-5 py-14 text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-slate-50 text-slate-500"><Inbox className="h-9 w-9" /></span>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">Bu filtrelerle talep bulunamadı.</h3>
              <p className="mt-2 max-w-xl text-sm text-slate-500">Arama kriterlerinizi veya filtrelerinizi yeniden düzenleyerek farklı sonuçlara ulaşabilirsiniz.</p>
              {activeFilterCount > 0 ? <Link href="/admin/inquiries" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-sky-300 hover:text-sky-700"><SlidersHorizontal className="h-4 w-4" />Filtreleri temizle</Link> : null}
            </div>
          ) : (
            inquiries.map((inquiry) => <InquiryRow key={inquiry.id} inquiry={inquiry} />)
          )}
        </div>
      </section>
    </div>
  );
}

