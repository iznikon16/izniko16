import Link from 'next/link';
import { requireAdminSession } from '@/lib/auth/admin';
import { getAllCustomerAccounts } from '@/lib/accounting/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { updateCustomerRiskLimitAction } from '@/app/admin/(panel)/accounting/actions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableEmpty } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default async function CurrentAccountsPage() {
  await requireAdminSession();
  const accounts = await getAllCustomerAccounts();

  const totalReceivable = accounts.reduce((sum, item) => sum + Math.max(0, item.summary.balance), 0);
  const totalOverdue = accounts.reduce((sum, item) => sum + item.summary.overdueBalance, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Hesaplar</h1>
        <p className="mt-1 text-gray-500">Müşterilerin açık borç, risk limiti ve cari özetleri.</p>
      </div>

      {/* Özet KPI */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Toplam Cari Alacak</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatCommercePrice(totalReceivable)}</p>
        </div>
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Vadesi Geçmiş</p>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatCommercePrice(totalOverdue)}</p>
        </div>
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <p className="text-xs font-medium text-gray-500">Müşteri</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{accounts.length}</p>
        </div>
      </div>

      {/* Tablo */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Müşteri</TableHead>
            <TableHead className="text-right">Bakiye</TableHead>
            <TableHead className="text-right">Risk Limiti</TableHead>
            <TableHead className="text-right">Kullanım</TableHead>
            <TableHead className="text-right">Vadesi Geçmiş</TableHead>
            <TableHead className="text-right">Son Hareket</TableHead>
            <TableHead className="text-right">İşlem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
            {accounts.map(({ customer, summary }) => {
              const usedPercent = summary.riskLimit > 0 ? Math.min(100, Math.round((summary.balance / summary.riskLimit) * 100)) : (summary.balance > 0 ? 100 : 0);
              return (
                <TableRow key={customer.user_id}>
                  <TableCell>
                    <Link href={`/admin/customers?user=${customer.user_id}`} className="font-medium text-blue-600 hover:underline">
                      {customer.full_name || customer.email || '—'}
                    </Link>
                    <p className="text-xs text-gray-500">{customer.email}</p>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={summary.balance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}>
                      {formatCommercePrice(summary.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-gray-600">{formatCommercePrice(summary.riskLimit)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={usedPercent >= 90 ? 'h-full bg-red-500' : usedPercent >= 70 ? 'h-full bg-amber-400' : 'h-full bg-emerald-500'}
                          style={{ width: `${usedPercent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">%{usedPercent}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={summary.overdueBalance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}>
                      {formatCommercePrice(summary.overdueBalance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-gray-500">
                    {summary.lastTransactionAt ? new Date(summary.lastTransactionAt).toLocaleDateString('tr-TR') : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <form action={updateCustomerRiskLimitAction} className="flex items-center justify-end gap-2">
                      <input type="hidden" name="customer_id" value={customer.user_id} />
                      <Input
                        type="number"
                        name="risk_limit"
                        defaultValue={summary.riskLimit || ''}
                        className="w-24 h-8 px-2 py-1 text-xs"
                        placeholder="Limit"
                      />
                      <Button type="submit" size="sm">
                        Kaydet
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
            {accounts.length === 0 && (
              <TableEmpty colSpan={7}>Henüz müşteri bulunmuyor.</TableEmpty>
            )}
          </TableBody>
        </Table>
    </div>
  );
}
