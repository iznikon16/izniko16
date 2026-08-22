import Link from 'next/link';
import { CalendarDays, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { requireAdminPermission } from '@/lib/auth/admin';
import { getAdminReturns } from '@/lib/returns/queries';
import { RETURN_NEXT_STATUSES, RETURN_STATUS_LABELS, type ReturnStatus } from '@/lib/returns/types';
import { confirmExternalRefundAction, retryReturnRefundAction, transitionReturnRequestAction } from '@/lib/returns/actions';
import { formatCommercePrice } from '@/lib/commerce/format';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export const dynamic = 'force-dynamic';
const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
type PageProps = { searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }> };

export default async function AdminReturnsPage({ searchParams }: PageProps) {
  await requireAdminPermission('return.view');
  const raw = await searchParams;
  const query = (raw.q || '').trim().toLocaleLowerCase('tr');
  const statusFilter = raw.status || '';
  const from = raw.from || '';
  const to = raw.to || '';
  const allReturns = await getAdminReturns();
  const returns = allReturns.filter((request) => {
    const searchable = [request.return_number, request.order?.order_number, request.customer?.full_name, request.customer?.email].join(' ').toLocaleLowerCase('tr');
    const created = request.created_at.slice(0, 10);
    return (!query || searchable.includes(query)) && (!statusFilter || request.status === statusFilter) && (!from || created >= from) && (!to || created <= to);
  });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5">
      <header className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600"><RotateCcw className="h-6 w-6" /></span><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">Operasyon</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">İade ve geri ödeme</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Ürün kabulü, stok iadesi, sağlayıcı geri ödemesi ve cari telafi kayıtlarını tek akıştan yönetin.</p></div></div>
        <Link href="/admin/orders" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-medium text-white shadow-sm hover:bg-sky-700"><Plus className="h-4 w-4" />Yeni İade Talebi</Link>
      </header>

      <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(240px,1fr)_220px_180px_180px_auto_auto] lg:items-end">
        <label className="grid gap-1.5 text-xs font-medium text-slate-600"><span>Arama</span><span className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input name="q" defaultValue={raw.q} placeholder="Talep, sipariş veya müşteri ara" className="pl-10" /></span></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">Durum<Select name="status" defaultValue={statusFilter}><option value="">Tümü</option>{Object.entries(RETURN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">Başlangıç<Input type="date" name="from" defaultValue={from} /></label>
        <label className="grid gap-1.5 text-xs font-medium text-slate-600">Bitiş<Input type="date" name="to" defaultValue={to} /></label>
        <Button type="submit" className="rounded-xl font-medium"><Filter className="h-4 w-4" />Filtrele</Button>
        <Link href="/admin/returns" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:border-sky-300 hover:text-sky-700"><X className="h-4 w-4" />Temizle</Link>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[140px_180px_180px_minmax(200px,1fr)_150px_180px] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 lg:grid"><span>Durum</span><span>Talep No</span><span>Sipariş</span><span>Müşteri</span><span>Tutar</span><span>Tarih</span></div>
        {returns.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center"><span className="grid h-24 w-24 place-items-center rounded-full bg-sky-50 text-sky-500"><RotateCcw className="h-10 w-10" /></span><h2 className="mt-5 text-lg font-semibold text-slate-800">İade talebi bulunmuyor.</h2><p className="mt-2 text-sm text-slate-500">Yeni bir iade kaydı oluştuğunda burada görüntülenecektir.</p></div>
        ) : (
          <div className="divide-y divide-slate-200">{returns.map((request) => {
            const status = request.status as ReturnStatus;
            const next = RETURN_NEXT_STATUSES[status] ?? [];
            return <article key={request.id} className="p-5"><div className="grid gap-3 lg:grid-cols-[140px_180px_180px_minmax(200px,1fr)_150px_180px] lg:items-center"><span className="w-fit rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">{RETURN_STATUS_LABELS[status]}</span><p className="text-sm font-medium text-slate-800">{request.return_number}</p><p className="text-sm text-slate-600">{request.order?.order_number}</p><p className="text-sm text-slate-600">{request.customer?.full_name || request.customer?.email || 'Müşteri'}</p><p className="text-sm font-medium text-slate-800">{formatCommercePrice(request.total_refund_amount)}</p><p className="text-sm text-slate-500">{dateFormatter.format(new Date(request.created_at))}</p></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">{request.items.map((item) => <p key={item.id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">{item.orderItem?.product_title ?? 'Ürün'} × {item.quantity} · {formatCommercePrice(item.refund_amount)}{item.restocked_at ? ' · stoğa alındı' : ''}</p>)}</div>
              {next.length > 0 ? <ToastActionForm action={transitionReturnRequestAction} successMessage="İade durumu güncellendi." errorMessage="İade durumu güncellenemedi." confirmation={{ title: 'İade durumu değiştirilsin mi?', description: 'Stok ve finansal hareketler seçilen aşamaya göre idempotent olarak işlenecek.', confirmLabel: 'Durumu Güncelle' }} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[220px_minmax(0,1fr)_auto]"><input type="hidden" name="return_id" value={request.id} /><div className="grid gap-1.5"><Label>Yeni durum</Label><Select name="status">{next.map((value) => <option key={value} value={value}>{RETURN_STATUS_LABELS[value]}</option>)}</Select></div><div className="grid gap-1.5"><Label>Yönetici notu</Label><Textarea name="admin_note" rows={2} defaultValue={request.admin_note} /></div><div className="flex items-end"><Button type="submit">Güncelle</Button></div></ToastActionForm> : null}
              {status === 'refund_pending' && request.refund ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="font-medium text-amber-950">Geri ödeme: {request.refund.provider} · {request.refund.status}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><ToastActionForm action={retryReturnRefundAction} successMessage="Sağlayıcı geri ödemesi işlendi veya işlem beklemede." errorMessage="Sağlayıcı geri ödemesi başarısız." className="flex items-end"><input type="hidden" name="refund_id" value={request.refund.id} /><Button type="submit" variant="outline">Sağlayıcıyı Yeniden Dene</Button></ToastActionForm><ToastActionForm action={confirmExternalRefundAction} successMessage="Harici geri ödeme teyit edildi." errorMessage="Geri ödeme teyit edilemedi." className="grid gap-2"><input type="hidden" name="refund_id" value={request.refund.id} /><Label>Sağlayıcı iade referansı</Label><div className="flex gap-2"><Input name="provider_reference" required /><Button type="submit">Manuel Teyit</Button></div></ToastActionForm></div></div> : null}
            </article>;
          })}</div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-500"><span>{returns.length} kayıt</span><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />Güncel kayıtlar</span></div>
      </section>
    </div>
  );
}
