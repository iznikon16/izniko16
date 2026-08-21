import Link from 'next/link';
import { CalendarClock, Download, FileSpreadsheet, ReceiptText, WalletCards } from 'lucide-react';
import { getOwnCustomerAccountPortal } from '@/lib/accounting/customer-portal';
import { parseStatementDateRange } from '@/lib/accounting/statement-export';
import { ACCOUNT_TRANSACTION_LABELS } from '@/lib/accounting/types';
import { formatCommercePrice } from '@/lib/commerce/format';

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };
const date = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' });

function single(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || '' : value || ''; }

export default async function HesabimCariPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
  const defaultFrom = `${today.slice(0, 7)}-01`;
  const query = new URLSearchParams({ from: single(raw.from), to: single(raw.to) });
  let range;
  try { range = parseStatementDateRange(query, defaultFrom); }
  catch { range = { fromDate: defaultFrom, toDate: today }; }

  const portal = await getOwnCustomerAccountPortal(range.fromDate, range.toDate);
  const { statement } = portal;
  const exportQuery = `from=${encodeURIComponent(range.fromDate)}&to=${encodeURIComponent(range.toDate)}`;

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 p-6 text-white shadow-xl md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">{portal.accountCode}</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Cari Hesabım</h1>
            <p className="mt-2 text-sm text-slate-300">{portal.customer.name} · Güncel bakiyeniz, vadeleriniz ve hesap hareketleriniz.</p>
          </div>
          <div className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${portal.overdueBalance > 0 ? 'bg-red-500/20 text-red-200 ring-1 ring-red-400/30' : 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/30'}`}>
            {portal.overdueBalance > 0 ? 'Vadesi geçmiş borç bulunuyor' : 'Gecikmiş ödeme bulunmuyor'}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Güncel Bakiye', formatCommercePrice(portal.balance), portal.balance > 0 ? 'Borç bakiyesi' : portal.balance < 0 ? 'Alacak bakiyesi' : 'Hesap dengede'],
          ['Açık Borç', formatCommercePrice(portal.openDebt), 'Ödenmemiş cari bakiye'],
          ['Vadesi Geçmiş', formatCommercePrice(portal.overdueBalance), portal.overdueBalance > 0 ? 'Ödeme bekleniyor' : 'Gecikme yok'],
          ['Yaklaşan Vadeler', formatCommercePrice(portal.upcomingDueAmount), 'Henüz gecikmemiş açık tutar'],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-sky-600" /><div><h2 className="font-semibold text-slate-900">Kredi / Risk Limiti</h2><p className="text-xs text-slate-500">Sipariş ve cari borç toplamına göre merkezi hesaplanır.</p></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div><p className="text-xs text-slate-500">Risk Limiti</p><p className="mt-1 text-lg font-bold">{portal.riskLimit > 0 ? formatCommercePrice(portal.riskLimit) : 'Limitsiz'}</p></div>
            <div><p className="text-xs text-slate-500">Kullanılan</p><p className="mt-1 text-lg font-bold">{formatCommercePrice(portal.usedLimit)}</p></div>
            <div><p className="text-xs text-slate-500">Kullanılabilir</p><p className={`mt-1 text-lg font-bold ${portal.riskExceeded ? 'text-red-600' : 'text-emerald-600'}`}>{portal.riskLimit > 0 ? formatCommercePrice(portal.availableLimit) : 'Limitsiz'}</p></div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${portal.riskExceeded ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: `${portal.riskLimit > 0 ? Math.min(100, Math.max(0, portal.usagePercent)) : 0}%` }} /></div>
          <p className="mt-2 text-right text-xs font-semibold text-slate-500">Kullanım: %{portal.riskLimit > 0 ? portal.usagePercent.toLocaleString('tr-TR') : 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Hesap Özeti</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Toplam borç hareketi</dt><dd className="font-semibold">{formatCommercePrice(portal.totalDebit)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Toplam tahsilat/alacak</dt><dd className="font-semibold">{formatCommercePrice(portal.totalCredit)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Toplam sipariş</dt><dd className="font-semibold">{portal.orderCount}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Açık sipariş</dt><dd className="font-semibold">{portal.openOrderCount}</dd></div>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 p-5"><CalendarClock className="h-5 w-5 text-amber-600" /><div><h2 className="font-semibold text-slate-900">Yaklaşan ve Geciken Vadeler</h2><p className="text-xs text-slate-500">Açık borçlarınızın vade ve kalan tutarları.</p></div></div>
        <div className="overflow-x-auto"><table className="min-w-[820px] w-full text-sm"><thead className="bg-slate-50 text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Sipariş / Açıklama</th><th className="px-5 py-3">Vade</th><th className="px-5 py-3 text-right">İlk Tutar</th><th className="px-5 py-3 text-right">Ödenen</th><th className="px-5 py-3 text-right">Kalan</th><th className="px-5 py-3">Durum</th></tr></thead><tbody className="divide-y divide-slate-100">
          {portal.dueItems.map((item) => <tr key={item.transactionId}><td className="px-5 py-4"><p className="font-medium text-slate-800">{item.orderNumber || 'Cari hareket'}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p></td><td className="px-5 py-4">{date.format(new Date(`${item.dueDate}T12:00:00+03:00`))}</td><td className="px-5 py-4 text-right">{formatCommercePrice(item.originalAmount)}</td><td className="px-5 py-4 text-right text-emerald-600">{formatCommercePrice(item.paidAmount)}</td><td className="px-5 py-4 text-right font-semibold">{formatCommercePrice(item.remainingAmount)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.overdueDays > 0 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{item.overdueDays > 0 ? `${item.overdueDays} gün gecikti` : item.remainingDays === 0 ? 'Bugün' : `${item.remainingDays} gün kaldı`}</span></td></tr>)}
          {portal.dueItems.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Açık veya yaklaşan vade bulunmuyor.</td></tr> : null}
        </tbody></table></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center gap-3 border-b border-slate-100 p-5"><ReceiptText className="h-5 w-5 text-emerald-600" /><h2 className="font-semibold text-slate-900">Tahsilatlar</h2></div><div className="divide-y divide-slate-100">
          {portal.payments.slice(0, 10).map((payment) => <div key={payment.id} className="flex items-center justify-between gap-4 p-4"><div><p className="font-medium text-slate-800">{payment.method || 'Tahsilat'}</p><p className="mt-1 text-xs text-slate-500">{payment.reference || date.format(new Date(payment.paidAt))}</p></div><p className="font-bold text-emerald-600">{formatCommercePrice(payment.amount)}</p></div>)}
          {portal.payments.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Henüz tahsilat kaydı bulunmuyor.</p> : null}
        </div></div>
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold text-slate-900">Son Cari Hareketler</h2></div><div className="divide-y divide-slate-100">
          {portal.transactions.slice(0, 10).map((item) => <div key={item.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="truncate font-medium text-slate-800">{item.description || ACCOUNT_TRANSACTION_LABELS[item.type as keyof typeof ACCOUNT_TRANSACTION_LABELS] || item.type}</p><p className="mt-1 text-xs text-slate-500">{date.format(new Date(item.createdAt))} · {item.documentNo}</p></div><div className="text-right"><p className={`font-bold ${item.debit > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCommercePrice(item.debit || item.credit)}</p><p className="mt-1 text-xs text-slate-400">Bakiye {formatCommercePrice(item.balanceAfter)}</p></div></div>)}
          {portal.transactions.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">Henüz cari hareket bulunmuyor.</p> : null}
        </div></div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-semibold text-slate-900">Cari Ekstre</h2><p className="mt-1 text-xs text-slate-500">Tarih aralığına göre açılış, hareket ve kapanış bakiyesi.</p></div><form method="get" className="flex flex-wrap items-end gap-2"><label className="grid gap-1 text-xs text-slate-500">Başlangıç<input type="date" name="from" defaultValue={range.fromDate} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><label className="grid gap-1 text-xs text-slate-500">Bitiş<input type="date" name="to" defaultValue={range.toDate} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" /></label><button className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">Göster</button></form></div>
        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:grid-cols-4">{[['Açılış', statement.openingBalance], ['Borç', statement.totalDebit], ['Alacak', statement.totalCredit], ['Kapanış', statement.closingBalance]].map(([label, value]) => <div key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold text-slate-900">{formatCommercePrice(Number(value))}</p></div>)}</div>
        <div className="overflow-x-auto"><table className="min-w-[800px] w-full text-sm"><thead className="bg-white text-left text-xs text-slate-500"><tr><th className="px-5 py-3">Tarih</th><th className="px-5 py-3">İşlem No</th><th className="px-5 py-3">Açıklama</th><th className="px-5 py-3 text-right">Borç</th><th className="px-5 py-3 text-right">Alacak</th><th className="px-5 py-3 text-right">Bakiye</th></tr></thead><tbody className="divide-y divide-slate-100">{statement.lines.map((line) => <tr key={line.id}><td className="px-5 py-3">{date.format(new Date(line.date))}</td><td className="px-5 py-3 text-xs text-slate-500">{line.documentNo}</td><td className="px-5 py-3">{line.description}</td><td className="px-5 py-3 text-right text-red-600">{line.debit ? formatCommercePrice(line.debit) : '—'}</td><td className="px-5 py-3 text-right text-emerald-600">{line.credit ? formatCommercePrice(line.credit) : '—'}</td><td className="px-5 py-3 text-right font-semibold">{formatCommercePrice(line.balanceAfter)}</td></tr>)}{statement.lines.length === 0 ? <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-500">Bu tarih aralığında cari hareket bulunmuyor.</td></tr> : null}</tbody></table></div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-4"><Link href={`/hesabim/cari/pdf?${exportQuery}`} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white"><Download className="h-4 w-4" />PDF</Link><Link href={`/hesabim/cari/excel?${exportQuery}`} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"><FileSpreadsheet className="h-4 w-4" />Excel</Link><Link href={`/hesabim/cari/csv?${exportQuery}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">CSV</Link></div>
      </section>
    </div>
  );
}
