import Link from 'next/link';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Search,
  SlidersHorizontal,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import { requireAdminPermission } from '@/lib/auth/admin';
import { getCustomerAccountsPage } from '@/lib/accounting/queries';
import {
  buildCustomerAccountListHref,
  parseCustomerAccountListFilters,
  type CustomerAccountSearchParams,
} from '@/lib/accounting/list-filters';
import { formatCommercePrice } from '@/lib/commerce/format';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/table';

export const dynamic = 'force-dynamic';

type CurrentAccountsPageProps = {
  searchParams?: Promise<CustomerAccountSearchParams>;
};

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function getVisiblePages(currentPage: number, totalPages: number) {
  const windowSize = Math.min(5, totalPages);
  const start = Math.max(1, Math.min(currentPage - 2, totalPages - windowSize + 1));
  return Array.from({ length: windowSize }, (_, index) => start + index);
}

export default async function CurrentAccountsPage({ searchParams }: CurrentAccountsPageProps) {
  await requireAdminPermission('account.view');

  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const filters = parseCustomerAccountListFilters(resolvedSearchParams);
  const result = await getCustomerAccountsPage(filters);
  const activeFilterCount = [
    filters.query,
    filters.balance,
    filters.overdue,
    filters.riskExceeded,
    filters.status,
  ].filter(Boolean).length;
  const visiblePages = getVisiblePages(result.page, result.totalPages);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <section className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-6 shadow-sm shadow-[#cbd5e1]/10 md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-600">Ön Muhasebe</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Cari Hesaplar</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
              Müşterilerin borç, alacak, vade ve risk durumlarını tek ekrandan takip edin.
            </p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <span className="font-semibold">{result.total.toLocaleString('tr-TR')}</span> cari hesap listeleniyor
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">Toplam Cari Alacak</p>
              <CircleDollarSign className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{formatCommercePrice(result.metrics.totalReceivable)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">Müşteri Alacağı</p>
              <WalletCards className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{formatCommercePrice(result.metrics.totalCustomerCredit)}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-red-700">Vadesi Geçmiş</p>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-red-700">{formatCommercePrice(result.metrics.totalOverdue)}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-gray-500">Toplam Müşteri</p>
              <Users className="h-5 w-5 text-sky-500" />
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{result.metrics.customerCount.toLocaleString('tr-TR')}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <form className="grid gap-4 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-4 shadow-sm shadow-[#cbd5e1]/10 md:p-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(150px,0.7fr))]">
            <label className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="search"
                name="q"
                defaultValue={filters.query ?? ''}
                placeholder="Müşteri, cari kod, telefon veya e-posta ara"
                className="min-w-0 w-full bg-transparent text-gray-900 outline-none placeholder:text-gray-400"
              />
            </label>

            <select name="balance" defaultValue={filters.balance ?? ''} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-400">
              <option value="">Tüm bakiyeler</option>
              <option value="debtor">Borçlu</option>
              <option value="creditor">Alacaklı</option>
            </select>

            <select name="overdue" defaultValue={filters.overdue ? 'yes' : ''} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-400">
              <option value="">Tüm vadeler</option>
              <option value="yes">Vadesi geçmiş</option>
            </select>

            <select name="risk" defaultValue={filters.riskExceeded ? 'exceeded' : ''} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-400">
              <option value="">Tüm risk durumları</option>
              <option value="exceeded">Risk limiti aşılmış</option>
            </select>

            <select name="status" defaultValue={filters.status ?? ''} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-sky-400">
              <option value="">Tüm hesap durumları</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              {activeFilterCount > 0 ? `${activeFilterCount} filtre aktif` : 'Tüm cari hesaplar gösteriliyor'}
            </p>
            <div className="flex flex-wrap gap-2">
              {activeFilterCount > 0 ? (
                <Link href="/admin/accounting" className="inline-flex h-10 items-center gap-2 rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50">
                  <X className="h-4 w-4" />
                  Temizle
                </Link>
              ) : null}
              <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-sky-600">
                <SlidersHorizontal className="h-4 w-4" />
                Filtrele
              </button>
            </div>
          </div>
        </form>

        <Table className="min-w-[1560px]">
          <TableHeader>
            <TableRow>
              <TableHead>Müşteri</TableHead>
              <TableHead>Cari Kodu</TableHead>
              <TableHead className="text-right">Toplam Borç</TableHead>
              <TableHead className="text-right">Toplam Alacak</TableHead>
              <TableHead className="text-right">Güncel Bakiye</TableHead>
              <TableHead className="text-right">Vadesi Geçmiş</TableHead>
              <TableHead className="text-right">Risk Limiti</TableHead>
              <TableHead className="text-right">Kullanılabilir Limit</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Son Hareket</TableHead>
              <TableHead className="text-right">Aksiyon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((item) => {
              const balanceLabel = item.balance > 0 ? 'Borçlu' : item.balance < 0 ? 'Alacaklı' : 'Dengede';
              const balanceClass = item.balance > 0 ? 'text-red-600' : item.balance < 0 ? 'text-emerald-600' : 'text-gray-600';

              return (
                <TableRow key={item.customerId}>
                  <TableCell>
                    <p className="font-semibold text-gray-900">{item.customerName}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.email || 'E-posta yok'}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{item.phone || 'Telefon yok'}</p>
                  </TableCell>
                  <TableCell>
                    <span className="rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-semibold text-gray-700">{item.accountCode}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium text-gray-700">{formatCommercePrice(item.totalDebit)}</TableCell>
                  <TableCell className="text-right font-medium text-gray-700">{formatCommercePrice(item.totalCredit)}</TableCell>
                  <TableCell className={`text-right font-semibold ${balanceClass}`}>
                    {formatCommercePrice(Math.abs(item.balance))}
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-wide">{balanceLabel}</p>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${item.overdueBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    {formatCommercePrice(item.overdueBalance)}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">{formatCommercePrice(item.riskLimit)}</TableCell>
                  <TableCell className={`text-right font-semibold ${item.availableLimit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCommercePrice(item.availableLimit)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                        {item.isActive ? 'Aktif' : 'Pasif'}
                      </span>
                      {!item.accountId ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Hesap bekliyor</span>
                      ) : item.riskExceeded ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-700">Risk limiti aşıldı</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {item.lastTransactionAt ? dateFormatter.format(new Date(item.lastTransactionAt)) : 'Henüz hareket yok'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/accounting/${encodeURIComponent(item.customerId)}`} className="inline-flex h-9 items-center justify-center rounded-full border border-gray-200 px-4 text-xs font-semibold text-gray-700 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700">
                      Detay
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
            {result.items.length === 0 ? (
              <TableEmpty colSpan={11}>Filtrelerle eşleşen cari hesap bulunamadı.</TableEmpty>
            ) : null}
          </TableBody>
        </Table>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Sayfa <span className="font-semibold text-gray-900">{result.page}</span> / {result.totalPages}
          </p>
          <nav aria-label="Cari hesap sayfaları" className="flex flex-wrap items-center gap-1.5">
            <Link
              href={buildCustomerAccountListHref(filters, Math.max(1, result.page - 1))}
              aria-disabled={result.page <= 1}
              className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium ${result.page <= 1 ? 'pointer-events-none border-gray-100 text-gray-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              <ChevronLeft className="h-4 w-4" /> Önceki
            </Link>
            {visiblePages.map((page) => (
              <Link
                key={page}
                href={buildCustomerAccountListHref(filters, page)}
                aria-current={page === result.page ? 'page' : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold ${page === result.page ? 'bg-sky-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {page}
              </Link>
            ))}
            <Link
              href={buildCustomerAccountListHref(filters, Math.min(result.totalPages, result.page + 1))}
              aria-disabled={result.page >= result.totalPages}
              className={`inline-flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-medium ${result.page >= result.totalPages ? 'pointer-events-none border-gray-100 text-gray-300' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Sonraki <ChevronRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </section>
    </div>
  );
}
