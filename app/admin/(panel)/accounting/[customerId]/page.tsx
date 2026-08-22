import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  CalendarClock,
  FileText,
  Landmark,
  ListOrdered,
  ReceiptText,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { requireAdminPermission } from '@/lib/auth/admin';
import {
  getCustomerAccountDetail,
  getCustomerLedgerPage,
  getCustomerSmsLogs,
  getCustomerTransactionBreakdown,
} from '@/lib/accounting/queries';
import { ACCOUNT_TRANSACTION_LABELS, type DueReceivableStatus } from '@/lib/accounting/types';
import {
  ACCOUNT_TRANSACTION_TYPES,
  buildCustomerLedgerHref,
  parseCustomerLedgerFilters,
  type CustomerLedgerSearchParams,
} from '@/lib/accounting/ledger-filters';
import { formatCommercePrice } from '@/lib/commerce/format';
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormSubmitButton } from '@/components/ui/form-submit-button';
import { ConfirmActionForm } from '@/components/ui/confirm-action-form';
import { ToastActionForm } from '@/components/ui/toast-action-form';
import {
  adjustBalanceAction,
  sendPaymentReminderAction,
  updateCustomerRiskLimitAction,
  updateCustomerPaymentTermsAction,
  updateTransactionDueDateAction,
} from '@/app/admin/(panel)/accounting/actions';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const tabs = [
  { key: 'overview', label: 'Genel Bakış', icon: UserRound },
  { key: 'debit-credit', label: 'Borç / Alacak', icon: Landmark },
  { key: 'transactions', label: 'Cari Hareketler', icon: ListOrdered },
  { key: 'payments', label: 'Tahsilatlar', icon: ReceiptText },
  { key: 'due', label: 'Vade', icon: CalendarClock },
  { key: 'statement', label: 'Ekstre', icon: FileText },
  { key: 'risk', label: 'Risk', icon: ShieldAlert },
  { key: 'notifications', label: 'Bildirimler', icon: Bell },
] as const;

const dueStatusLabels: Record<DueReceivableStatus, string> = {
  OPEN: 'Açık',
  APPROACHING: 'Yaklaşıyor',
  DUE_TODAY: 'Bugün',
  OVERDUE: 'Gecikti',
  PARTIAL_PAID: 'Kısmi Ödendi',
  PAID: 'Ödendi',
};

const riskPolicyLabels = {
  warn: 'Yalnızca uyar',
  require_approval: 'Yönetici onayı iste',
  block: 'Siparişi engelle',
} as const;

type TabKey = (typeof tabs)[number]['key'];

type CustomerAccountDetailPageProps = {
  params: Promise<{ customerId: string }>;
  searchParams?: Promise<CustomerLedgerSearchParams>;
};

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
});

function parseTab(value: string | string[] | undefined): TabKey {
  const candidate = Array.isArray(value) ? value[0] : value;
  return tabs.some((tab) => tab.key === candidate) ? candidate as TabKey : 'overview';
}

function tabHref(customerId: string, tab: TabKey) {
  const base = `/admin/accounting/${encodeURIComponent(customerId)}`;
  return tab === 'overview' ? base : `${base}?tab=${tab}`;
}

function formatOptionalDate(value: string | null, includeTime = true) {
  if (!value) return 'Henüz kayıt yok';
  return includeTime ? dateTimeFormatter.format(new Date(value)) : dateFormatter.format(new Date(`${value}T00:00:00`));
}

function getVisiblePages(currentPage: number, totalPages: number) {
  const windowSize = Math.min(5, totalPages);
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
  return Array.from({ length: windowSize }, (_, index) => start + index);
}

export default async function CustomerAccountDetailPage({ params, searchParams }: CustomerAccountDetailPageProps) {
  await requireAdminPermission('account.view');

  const [{ customerId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams ?? Promise.resolve<CustomerLedgerSearchParams>({}),
  ]);
  if (!UUID_PATTERN.test(customerId)) notFound();

  const activeTab = parseTab(resolvedSearchParams.tab);
  const ledgerFilters = parseCustomerLedgerFilters(resolvedSearchParams);
  const [detail, ledgerPage, transactionBreakdown, smsLogs] = await Promise.all([
    getCustomerAccountDetail(customerId),
    activeTab === 'transactions' ? getCustomerLedgerPage(customerId, ledgerFilters) : Promise.resolve(null),
    activeTab === 'debit-credit' ? getCustomerTransactionBreakdown(customerId) : Promise.resolve([]),
    activeTab === 'notifications' ? getCustomerSmsLogs(customerId) : Promise.resolve([]),
  ]);
  if (!detail) notFound();

  const { summary } = detail;
  const balanceLabel = summary.balance > 0 ? 'Borçlu' : summary.balance < 0 ? 'Alacaklı' : 'Dengede';
  const firstUpcomingDue = detail.upcomingDueItems[0]?.dueDate ?? null;
  const ledgerVisiblePages = ledgerPage ? getVisiblePages(ledgerPage.page, ledgerPage.totalPages) : [];

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <Link href="/admin/accounting" className="inline-flex w-fit items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-sky-600">
        <ArrowLeft className="h-4 w-4" />
        Cari hesaplara dön
      </Link>

      <section className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <div className="border-b border-gray-100 p-6 md:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">{summary.accountCode}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${summary.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {summary.isActive ? 'Aktif hesap' : 'Pasif hesap'}
                </span>
                {summary.riskExceeded ? (
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-700">Risk limiti aşıldı</span>
                ) : null}
              </div>
              <h1 className="mt-4 truncate text-3xl font-semibold tracking-[-0.04em] text-gray-900">{summary.customerName}</h1>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
                <span>{summary.phone || 'Telefon bilgisi yok'}</span>
                <span>{summary.email || 'E-posta bilgisi yok'}</span>
              </div>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:min-w-[420px]">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Fiyat Listesi</p>
                <p className="mt-2 font-semibold text-gray-900">{detail.priceList?.name ?? 'Atanmamış'}</p>
                <p className="mt-1 text-xs text-gray-500">{detail.priceList?.code ?? 'Varsayılan fiyatlandırma'}</p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Bakiye Durumu</p>
                <p className="mt-2 font-semibold text-gray-900">{balanceLabel}</p>
                <p className="mt-1 text-xs text-gray-500">Son hareket: {formatOptionalDate(summary.lastTransactionAt)}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Güncel Bakiye', formatCommercePrice(Math.abs(summary.balance)), balanceLabel],
              ['Toplam Borç', formatCommercePrice(summary.totalDebit), 'Ledger toplamı'],
              ['Toplam Alacak', formatCommercePrice(summary.totalCredit), 'Ledger toplamı'],
              ['Vadesi Geçmiş', formatCommercePrice(summary.overdueBalance), summary.overdueBalance > 0 ? 'Gecikmiş ödeme var' : 'Gecikme yok'],
              ['Risk Limiti', formatCommercePrice(summary.riskLimit), summary.riskExceeded ? 'Limit aşıldı' : 'Limit içinde'],
              ['Kullanılabilir Limit', formatCommercePrice(summary.availableLimit), summary.availableLimit < 0 ? 'Limit aşımı' : 'Kullanılabilir'],
            ].map(([label, value, note]) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
                <p className="mt-2 text-lg font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-[11px] text-gray-500">{note}</p>
              </div>
            ))}
          </div>
        </div>

        <nav aria-label="Cari hesap detay sekmeleri" className="overflow-x-auto border-b border-gray-200 bg-gray-50 px-3 md:px-6">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={tabHref(customerId, tab.key)}
                  aria-current={selected ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 border-b-2 px-3 py-4 text-sm font-medium transition-colors ${selected ? 'border-sky-500 text-sky-700' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-800'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="p-5 md:p-8">
          {activeTab === 'overview' ? (
            <div className="grid gap-6">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Açık Sipariş Tutarı', formatCommercePrice(detail.openOrderAmount), 'Tamamlanmamış siparişler'],
                  ['Yaklaşan Ödeme', formatCommercePrice(detail.upcomingDueAmount), firstUpcomingDue ? formatOptionalDate(firstUpcomingDue, false) : 'Planlanmış vade yok'],
                  ['Son Tahsilat', formatOptionalDate(detail.lastPaymentAt), detail.lastPaymentAt ? 'En son ödeme kaydı' : 'Tahsilat bulunmuyor'],
                  ['Kullanılan Limit', formatCommercePrice(detail.usedLimit), 'Pozitif cari bakiye'],
                  ['Kullanılabilir Limit', formatCommercePrice(summary.availableLimit), summary.riskExceeded ? 'Risk limiti aşılmış' : 'Mevcut limit'],
                ].map(([label, value, note]) => (
                  <div key={label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-gray-500">{label}</p>
                    <p className="mt-2 text-lg font-semibold text-gray-900">{value}</p>
                    <p className="mt-1 text-[11px] text-gray-400">{note}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-3">
                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="font-semibold text-gray-900">Son Cari Hareketler</h2>
                  <div className="mt-4 grid gap-3">
                    {detail.recentTransactions.slice(0, 4).map((transaction) => (
                      <div key={transaction.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{transaction.description || transaction.reference || 'Cari hareket'}</p>
                          <p className="mt-1 text-xs text-gray-400">{formatOptionalDate(transaction.created_at)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-gray-700">{formatCommercePrice((Number(transaction.debit) || 0) || (Number(transaction.credit) || 0))}</p>
                      </div>
                    ))}
                    {detail.recentTransactions.length === 0 ? <p className="text-sm text-gray-400">Henüz cari hareket yok.</p> : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="font-semibold text-gray-900">Son Tahsilatlar</h2>
                  <div className="mt-4 grid gap-3">
                    {detail.recentPayments.slice(0, 4).map((payment) => (
                      <div key={payment.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{payment.reference_number || payment.payment_method || 'Tahsilat'}</p>
                          <p className="mt-1 text-xs text-gray-400">{formatOptionalDate(payment.paid_at)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-emerald-600">{formatCommercePrice(Number(payment.amount) || 0)}</p>
                      </div>
                    ))}
                    {detail.recentPayments.length === 0 ? <p className="text-sm text-gray-400">Henüz tahsilat yok.</p> : null}
                  </div>
                </section>

                <section className="rounded-2xl border border-gray-200 bg-white p-5">
                  <h2 className="font-semibold text-gray-900">Yaklaşan Vadeler</h2>
                  <div className="mt-4 grid gap-3">
                    {detail.upcomingDueItems.slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-800">{item.description || item.reference || 'Vadeli hareket'}</p>
                          <p className="mt-1 text-xs text-amber-600">{formatOptionalDate(item.dueDate, false)}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-gray-700">{formatCommercePrice(item.openAmount)}</p>
                      </div>
                    ))}
                    {detail.upcomingDueItems.length === 0 ? <p className="text-sm text-gray-400">Yaklaşan vade bulunmuyor.</p> : null}
                  </div>
                </section>
              </div>
            </div>
          ) : null}

          {activeTab === 'debit-credit' ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5"><p className="text-sm text-rose-700">Toplam Borç</p><p className="mt-2 text-2xl font-bold text-rose-700">{formatCommercePrice(summary.totalDebit)}</p></div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5"><p className="text-sm text-emerald-700">Toplam Alacak</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatCommercePrice(summary.totalCredit)}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5"><p className="text-sm text-gray-600">Güncel Bakiye</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(Math.abs(summary.balance))}</p><p className="mt-1 text-xs text-gray-500">{balanceLabel}</p></div>
              </div>
              <details className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-gray-800">Manuel borç/alacak düzeltmesi ekle</summary>
                <ToastActionForm action={adjustBalanceAction} successMessage="Cari hareket oluşturuldu." errorMessage="Cari hareket oluşturulamadı." confirmation={{ title: 'Manuel düzeltme oluşturulsun mu?', description: 'Bu finansal kayıt silinemez; yanlışlık halinde ters kayıt oluşturulmalıdır.', confirmLabel: 'Hareketi Oluştur' }} className="mt-4 grid gap-3 border-t border-gray-200 pt-4 lg:grid-cols-[180px_180px_minmax(240px,1fr)_auto]">
                  <input type="hidden" name="customer_id" value={customerId} />
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Tutar
                    <input type="number" name="amount" step="0.01" required placeholder="Borç + / Alacak -" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-sky-400" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Vade tarihi
                    <input type="date" name="due_date" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-sky-400" />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-gray-600">
                    Açıklama
                    <input type="text" name="description" required maxLength={240} placeholder="Düzeltmenin gerekçesi" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-sky-400" />
                  </label>
                  <div className="flex items-end">
                    <FormSubmitButton idleLabel="Hareket ekle" pendingLabel="Ekleniyor" />
                  </div>
                </ToastActionForm>
                <p className="mt-3 text-xs text-gray-500">Pozitif tutar borç, negatif tutar alacak oluşturur. Kayıt sonradan değiştirilemez veya silinemez.</p>
              </details>
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Hareket Türü</TableHead>
                    <TableHead className="text-right">Kayıt</TableHead>
                    <TableHead className="text-right">Toplam Borç</TableHead>
                    <TableHead className="text-right">Toplam Alacak</TableHead>
                    <TableHead className="text-right">Net Etki</TableHead>
                    <TableHead>Son Hareket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionBreakdown.map((item) => (
                    <TableRow key={item.type}>
                      <TableCell>
                        <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">
                          {ACCOUNT_TRANSACTION_LABELS[item.type] ?? item.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-gray-600">{item.transactionCount.toLocaleString('tr-TR')}</TableCell>
                      <TableCell className="text-right font-medium text-rose-600">{formatCommercePrice(item.totalDebit)}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{formatCommercePrice(item.totalCredit)}</TableCell>
                      <TableCell className={`text-right font-semibold ${item.netBalance > 0 ? 'text-rose-600' : item.netBalance < 0 ? 'text-emerald-600' : 'text-gray-600'}`}>
                        {formatCommercePrice(Math.abs(item.netBalance))}
                      </TableCell>
                      <TableCell className="text-gray-500">{formatOptionalDate(item.lastTransactionAt)}</TableCell>
                    </TableRow>
                  ))}
                  {transactionBreakdown.length === 0 ? <TableEmpty colSpan={6}>Henüz borç veya alacak hareketi bulunmuyor.</TableEmpty> : null}
                </TableBody>
              </Table>
              <p className="text-xs leading-relaxed text-gray-500">
                Bakiye, değiştirilebilir bir müşteri alanından değil immutable ledger üzerindeki toplam borç eksi toplam alacak formülünden üretilir.
              </p>
            </div>
          ) : null}

          {activeTab === 'transactions' ? (
            <div className="grid gap-4">
              <form method="get" className="grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 lg:grid-cols-[minmax(220px,1.4fr)_repeat(3,minmax(150px,0.7fr))_auto]">
                <input type="hidden" name="tab" value="transactions" />
                <input
                  type="search"
                  name="ledgerQuery"
                  defaultValue={ledgerFilters.query ?? ''}
                  placeholder="Referans, açıklama veya sipariş no ara"
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-sky-400"
                />
                <select name="ledgerType" defaultValue={ledgerFilters.type ?? ''} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-sky-400">
                  <option value="">Tüm hareket türleri</option>
                  {ACCOUNT_TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{ACCOUNT_TRANSACTION_LABELS[type] ?? type}</option>)}
                </select>
                <input type="date" name="ledgerFrom" defaultValue={ledgerFilters.fromDate ?? ''} aria-label="Başlangıç tarihi" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-sky-400" />
                <input type="date" name="ledgerTo" defaultValue={ledgerFilters.toDate ?? ''} aria-label="Bitiş tarihi" className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-sky-400" />
                <button type="submit" className="rounded-xl bg-[#0ea5e9] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#0284c7] hover:shadow-md">Filtrele</button>
              </form>

              <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-gray-500">
                <span>{ledgerPage?.total.toLocaleString('tr-TR') ?? 0} immutable hareket</span>
                {(ledgerFilters.query || ledgerFilters.type || ledgerFilters.fromDate || ledgerFilters.toDate) ? (
                  <Link href={tabHref(customerId, 'transactions')} className="font-medium text-sky-600 hover:text-sky-700">Filtreleri temizle</Link>
                ) : null}
              </div>

              <Table className="min-w-[1380px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem No</TableHead>
                    <TableHead>İşlem Türü</TableHead>
                    <TableHead>Referans</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Vade</TableHead>
                    <TableHead className="text-right">Borç</TableHead>
                    <TableHead className="text-right">Alacak</TableHead>
                    <TableHead className="text-right">Bakiye</TableHead>
                    <TableHead>İşlemi Yapan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ledgerPage?.items ?? []).map((transaction) => (
                    <TableRow key={transaction.id} className={transaction.isReversal ? 'bg-rose-50/40' : undefined}>
                      <TableCell className="text-gray-500">{formatOptionalDate(transaction.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-gray-600">{transaction.transactionNumber}</TableCell>
                      <TableCell>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${transaction.isReversal ? 'bg-rose-100 text-rose-700' : 'bg-sky-50 text-sky-700'}`}>
                          {ACCOUNT_TRANSACTION_LABELS[transaction.type] ?? transaction.type}{transaction.isReversal ? ' · Ters Kayıt' : ''}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs text-gray-600">{transaction.reference || '—'}</p>
                        {transaction.orderNumber ? <p className="mt-1 text-[11px] text-gray-400">{transaction.orderNumber}</p> : null}
                      </TableCell>
                      <TableCell className="max-w-[260px] text-gray-700">{transaction.description || '—'}</TableCell>
                      <TableCell className="text-gray-500">{formatOptionalDate(transaction.dueDate, false)}</TableCell>
                      <TableCell className="text-right font-medium text-rose-600">{transaction.debit > 0 ? formatCommercePrice(transaction.debit) : '—'}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">{transaction.credit > 0 ? formatCommercePrice(transaction.credit) : '—'}</TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">{formatCommercePrice(transaction.balanceAfter)}</TableCell>
                      <TableCell className="text-gray-600">{transaction.actorName}</TableCell>
                    </TableRow>
                  ))}
                  {!ledgerPage || ledgerPage.items.length === 0 ? <TableEmpty colSpan={10}>Filtrelerle eşleşen cari hareket bulunmuyor.</TableEmpty> : null}
                </TableBody>
              </Table>

              {ledgerPage ? (
                <nav aria-label="Cari hareket sayfaları" className="flex flex-wrap items-center justify-end gap-1.5">
                  {ledgerVisiblePages.map((page) => (
                    <Link
                      key={page}
                      href={buildCustomerLedgerHref(customerId, ledgerFilters, page)}
                      aria-current={page === ledgerPage.page ? 'page' : undefined}
                      className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold ${page === ledgerPage.page ? 'bg-sky-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    >
                      {page}
                    </Link>
                  ))}
                </nav>
              ) : null}
            </div>
          ) : null}

          {activeTab === 'payments' ? (
            <Table className="min-w-[760px]">
              <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Referans</TableHead><TableHead>Yöntem</TableHead><TableHead>Durum</TableHead><TableHead className="text-right">Tutar</TableHead></TableRow></TableHeader>
              <TableBody>
                {detail.recentPayments.map((payment) => (
                  <TableRow key={payment.id}><TableCell>{formatOptionalDate(payment.paid_at)}</TableCell><TableCell>{payment.reference_number || '—'}</TableCell><TableCell>{payment.payment_method || 'Manuel'}</TableCell><TableCell>{payment.status}</TableCell><TableCell className="text-right font-semibold text-emerald-600">{formatCommercePrice(Number(payment.amount) || 0)}</TableCell></TableRow>
                ))}
                {detail.recentPayments.length === 0 ? <TableEmpty colSpan={5}>Henüz tahsilat bulunmuyor.</TableEmpty> : null}
              </TableBody>
            </Table>
          ) : null}

          {activeTab === 'due' ? (
            <div className="grid gap-5">
              <ToastActionForm action={updateCustomerPaymentTermsAction} successMessage="Ödeme vadesi güncellendi." errorMessage="Ödeme vadesi güncellenemedi." className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-end">
                <input type="hidden" name="customer_id" value={customerId} />
                <label className="grid flex-1 gap-2 text-sm font-medium text-gray-700">
                  Müşteri ödeme vadesi
                  <input type="number" name="payment_term_days" min="0" max="365" step="1" defaultValue={detail.paymentTermDays} required className="rounded-xl border border-gray-200 bg-white px-3 py-2.5" />
                </label>
                <p className="flex-1 text-xs leading-5 text-gray-500">Yeni siparişlerin vadesi, sipariş tarihi + bu gün sayısı olarak oluşur. `0` aynı gün vade anlamına gelir.</p>
                <FormSubmitButton idleLabel="Vadeyi Kaydet" pendingLabel="Kaydediliyor…" />
              </ToastActionForm>

              <Table className="min-w-[1100px]">
                <TableHeader><TableRow><TableHead>Sipariş / Referans</TableHead><TableHead>Vade</TableHead><TableHead className="text-right">Borç</TableHead><TableHead className="text-right">Ödenen</TableHead><TableHead className="text-right">Kalan</TableHead><TableHead className="text-right">Gün</TableHead><TableHead>Durum</TableHead><TableHead>Vade Güncelle</TableHead></TableRow></TableHeader>
                <TableBody>
                  {detail.dueItems.map((item) => (
                    <TableRow key={item.transactionId}>
                      <TableCell><p className="font-medium text-gray-900">{item.orderNumber || item.reference || 'Cari hareket'}</p><p className="mt-1 text-xs text-gray-500">{item.description || '—'}</p></TableCell>
                      <TableCell className={item.overdueDays > 0 ? 'font-medium text-rose-700' : 'font-medium text-amber-700'}>{formatOptionalDate(item.dueDate, false)}</TableCell>
                      <TableCell className="text-right">{formatCommercePrice(item.total)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCommercePrice(item.collected)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCommercePrice(item.remaining)}</TableCell>
                      <TableCell className="text-right">{item.overdueDays > 0 ? `${item.overdueDays} gün gecikti` : item.remainingDays > 0 ? `${item.remainingDays} gün kaldı` : 'Bugün'}</TableCell>
                      <TableCell><span className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : item.overdueDays > 0 ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{dueStatusLabels[item.status]}</span></TableCell>
                      <TableCell>
                        <ToastActionForm action={updateTransactionDueDateAction} successMessage="Vade tarihi güncellendi." errorMessage="Vade tarihi güncellenemedi." className="flex items-center gap-2">
                          <input type="hidden" name="customer_id" value={customerId} />
                          <input type="hidden" name="transaction_id" value={item.transactionId} />
                          <input type="hidden" name="reason" value="Admin vade güncellemesi" />
                          <input type="date" name="due_date" defaultValue={item.dueDate ?? ''} required className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
                          <FormSubmitButton idleLabel="Kaydet" pendingLabel="…" className="h-8 px-3 text-xs" />
                        </ToastActionForm>
                      </TableCell>
                    </TableRow>
                  ))}
                  {detail.dueItems.length === 0 ? <TableEmpty colSpan={8}>Vadeli alacak bulunmuyor.</TableEmpty> : null}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {activeTab === 'statement' ? (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
              <h2 className="font-semibold text-gray-900">Cari Ekstre</h2>
              <p className="mt-2 text-sm text-gray-500">Tarih aralığı seçerek PDF veya CSV formatında güvenli cari ekstre oluşturun.</p>
              <Link href={`/admin/accounting/ekstreler?customer=${encodeURIComponent(customerId)}`} className="mt-5 inline-flex rounded-xl bg-[#0ea5e9] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#0284c7] hover:shadow-md">Ekstre oluştur</Link>
            </div>
          ) : null}

          {activeTab === 'risk' ? (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5"><p className="text-sm text-gray-500">Risk Limiti</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(summary.riskLimit)}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5"><p className="text-sm text-gray-500">Kullanılan Limit</p><p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(detail.usedLimit)}</p><p className="mt-1 text-xs text-gray-500">Cari: {formatCommercePrice(detail.ledgerExposure)} · Açık sipariş: {formatCommercePrice(detail.unpostedOrderExposure)}</p></div>
                <div className={`rounded-2xl border p-5 ${summary.riskExceeded ? 'border-rose-100 bg-rose-50' : 'border-emerald-100 bg-emerald-50'}`}><p className="text-sm text-gray-600">Kullanılabilir Limit</p><p className={`mt-2 text-2xl font-bold ${summary.riskExceeded ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCommercePrice(summary.availableLimit)}</p></div>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-sm text-gray-500">Kullanım Oranı</p><p className="mt-2 text-2xl font-bold text-gray-900">%{detail.riskUsagePercent.toLocaleString('tr-TR')}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200"><div className={`h-full rounded-full ${summary.riskExceeded ? 'bg-rose-500' : detail.riskUsagePercent >= detail.riskWarningThreshold ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, Math.max(0, detail.riskUsagePercent))}%` }} /></div>
                </div>
              </div>

              {summary.riskExceeded ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 font-semibold text-rose-700">Risk Limiti Aşıldı</div> : null}

              <ToastActionForm action={updateCustomerRiskLimitAction} successMessage="Risk limiti güncellendi." errorMessage="Risk limiti güncellenemedi." confirmation={{ title: 'Risk ayarları değiştirilsin mi?', description: 'Yeni limit ve politika sonraki sipariş risk kararlarını doğrudan etkiler.', confirmLabel: 'Risk Ayarlarını Kaydet' }} className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-5 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1fr)_minmax(180px,1fr)_auto] lg:items-end">
                <input type="hidden" name="customer_id" value={customerId} />
                <label className="grid gap-1 text-xs font-medium text-gray-600">Risk limiti<input type="number" name="risk_limit" min="0" step="0.01" defaultValue={summary.riskLimit} required className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
                <label className="grid gap-1 text-xs font-medium text-gray-600">Aşım politikası<select name="risk_policy" defaultValue={detail.riskPolicy} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm">{Object.entries(riskPolicyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="grid gap-1 text-xs font-medium text-gray-600">Uyarı eşiği (%)<input type="number" name="warning_threshold" min="1" max="100" step="1" defaultValue={detail.riskWarningThreshold} required className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm" /></label>
                <FormSubmitButton idleLabel="Risk ayarlarını kaydet" pendingLabel="Kaydediliyor" />
              </ToastActionForm>
              <p className="text-xs text-gray-500">Varsayılan politika yalnızca uyarır. Yönetici onayı politikası seçildiğinde limit aşan siparişler onay verilmeden cari borca dönüşemez; engelle politikası sipariş kaydını reddeder.</p>
            </div>
          ) : null}

          {activeTab === 'notifications' ? (
            <div className="grid gap-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">Ödeme bildirimleri</h2>
                  <p className="mt-1 text-sm text-gray-500">Şablon metni Netgsm ayarlarından alınır; aynı otomatik vade olayı yalnızca bir kez gönderilir.</p>
                </div>
                <ConfirmActionForm
                  action={sendPaymentReminderAction}
                  fields={{ customer_id: customerId }}
                  buttonLabel="Ödeme Hatırlatması Gönder"
                  title="Ödeme hatırlatması gönderilsin mi?"
                  description={`${summary.customerName} müşterisine güncel bakiye ve gecikmiş tutarı içeren SMS gönderilecek.`}
                  confirmLabel="SMS Gönder"
                  successMessage="Ödeme hatırlatması gönderildi."
                  errorMessage="Ödeme hatırlatması gönderilemedi."
                />
              </div>
              <Table className="min-w-[860px]">
                <TableHeader><TableRow><TableHead>Tarih</TableHead><TableHead>Olay</TableHead><TableHead>Şablon</TableHead><TableHead>İçerik</TableHead><TableHead>Durum</TableHead></TableRow></TableHeader>
                <TableBody>
                  {smsLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-gray-500">{formatOptionalDate(log.created_at)}</TableCell>
                      <TableCell className="font-medium text-gray-700">{log.event_type ?? 'Genel SMS'}</TableCell>
                      <TableCell className="font-mono text-xs text-gray-500">{log.template_key ?? '—'}</TableCell>
                      <TableCell className="max-w-[360px] text-gray-600">{log.body}</TableCell>
                      <TableCell><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${log.status === 'sent' ? 'bg-emerald-50 text-emerald-700' : log.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{log.status === 'sent' ? 'Gönderildi' : log.status === 'pending' ? 'İşleniyor' : 'Başarısız'}</span></TableCell>
                    </TableRow>
                  ))}
                  {smsLogs.length === 0 ? <TableEmpty colSpan={5}>Henüz ödeme bildirimi gönderilmedi.</TableEmpty> : null}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
