import Link from 'next/link';
import {
  Users,
  Activity,

  TrendingDown,
  ShieldCheck,
  AlertCircle,
  Database,
  Box,
  Package,
  Landmark,
  WalletCards,
  TriangleAlert,
  CreditCard,
  PackageSearch,
  ShoppingCart,
  ArrowRight,
} from 'lucide-react';
import { DashboardToolbar } from './components/dashboard-toolbar';
import { getAdminDashboardMetrics } from '@/lib/catalog/queries';
import { requireAdminSession } from '@/lib/auth/admin';
import { getDashboardAccountingMetrics, getOrderTrend } from '@/lib/dashboard/queries';
import { getOverduePayments } from '@/lib/accounting/queries';
import { getCriticalStockProducts } from '@/lib/stock/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await searchParams;
  
  const days = resolvedSearchParams.days ? parseInt(resolvedSearchParams.days) : 7;
  
  // Note: For now, we only pass `days` to getOrderTrend.
  // The user can expand filtering to other metrics later.
  const metrics = await getAdminDashboardMetrics(days);
  const accounting = await getDashboardAccountingMetrics(days);
  const overdue = await getOverduePayments();
  const critical = await getCriticalStockProducts(5);
  const orderTrend = await getOrderTrend(days);
  const maxTrendCount = Math.max(1, ...orderTrend.map((p) => p.count));

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hoş Geldiniz, <span className="text-sky-500">{session.adminUser.full_name || session.user.email}</span>
          </h1>
          <p className="mt-1 text-gray-500">İşte bugün sisteminizde neler olup bitiyor.</p>
        </div>
        <DashboardToolbar />
      </div>

      {/* Stats Grid 1 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Box className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Toplam Ürün</span>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="text-[10px] font-bold">-</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.totalProducts}</span>
            <span className="text-xs text-gray-500">Tüm Katalog</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Yayındaki Ürün</span>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="text-[10px] font-bold">-</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.publishedProducts}</span>
            <span className="text-xs text-gray-500">Aktif Ürünler</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Toplam Müşteri</span>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="text-[10px] font-bold">-</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.totalCustomers}</span>
            <span className="text-xs text-gray-500">Tüm Zamanlar</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <TrendingDown className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-gray-600">Bekleyen Sipariş</span>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <span className="text-[10px] font-bold">↓</span>
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.pendingOrders}</span>
            <span className="text-xs text-gray-500">Onay Bekliyor</span>
          </div>
        </div>
      </div>

      {/* Stats Grid 2 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-medium text-gray-600">Aktif Kampanya</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.activeCampaigns}</span>
            <span className="text-xs font-medium text-emerald-600">Yayında</span>
          </div>
        </div>
        
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-400" />
            <span className="text-[11px] font-medium text-gray-600">Toplam Kategori</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.totalCategories}</span>
            <span className="text-xs font-medium text-orange-500">Katalog Düzeni</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-amber-500" />
            <span className="text-[11px] font-medium text-gray-600">Toplam Sipariş</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.totalOrders}</span>
            <span className="text-xs font-medium text-amber-600">Tüm Siparişler</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-[11px] font-medium text-gray-600">Aktif Kupon</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{metrics.activeCoupons}</span>
            <span className="text-xs font-medium text-red-500">Kullanımda</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            <span className="text-[11px] font-medium text-gray-600">Kritik Uptime</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">0</span>
            <span className="text-xs font-medium text-red-600">Operasyonel Risk</span>
          </div>
        </div>
      </div>

      {/* CARİ KPI SATIRI */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-blue-500" />
            <span className="text-[11px] font-medium text-gray-600">Toplam Cari Alacak</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{formatCommercePrice(accounting.totalReceivable)}</span>
            <span className="text-xs font-medium text-blue-600">Açık Bakiye</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-amber-500" />
            <span className="text-[11px] font-medium text-gray-600">Bugün Vadesi Gelen</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-gray-900">{formatCommercePrice(accounting.dueToday)}</span>
            <span className="text-xs font-medium text-amber-600">Bugünkü Beklenen</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 text-red-500" />
            <span className="text-[11px] font-medium text-gray-600">Vadesi Geçmiş</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-red-600">{formatCommercePrice(accounting.overdueTotal)}</span>
            <span className="text-xs font-medium text-red-600">{accounting.overdueCustomers} müşteri</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-emerald-500" />
            <span className="text-[11px] font-medium text-gray-600">Bugünkü Tahsilat</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-600">{formatCommercePrice(accounting.todayCollected)}</span>
            <span className="text-xs font-medium text-emerald-600">Onaylı Tahsilat</span>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <PackageSearch className="h-4 w-4 text-orange-500" />
            <span className="text-[11px] font-medium text-gray-600">Kritik Stok</span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-orange-600">{accounting.criticalStockCount}</span>
            <span className="text-xs font-medium text-orange-500">Stok: {formatCommercePrice(accounting.totalStockValue)}</span>
          </div>
        </div>
      </div>

      {/* Row 3 - Geciken Ödemeler & Sipariş Grafiği & Risk */}
      <div className="mt-4 grid gap-4 lg:grid-cols-4">
        {/* Geciken Ödemeler */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-1">
          <h3 className="font-bold text-gray-900">Geciken Ödemeler</h3>
          <div className="mt-3 flex-1 space-y-3">
            {overdue.slice(0, 5).map((item, i) => (
              <div key={i} className="rounded-lg bg-red-50/50 p-2">
                <p className="text-xs font-semibold text-gray-800">{item.customerName}</p>
                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{formatCommercePrice(item.remaining)}</span>
                  <span className="font-medium text-red-600">{item.overdueDays} gün</span>
                </div>
              </div>
            ))}
            {overdue.length === 0 && <p className="text-xs text-gray-500">Geciken ödeme yok 🎉</p>}
          </div>
          <Link href="/admin/accounting/geciken-odemeler" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "mt-3 w-full text-xs flex items-center justify-center gap-1")}>
            Tümünü Gör <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Sipariş Trafiği - gerçek veri */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">Sipariş Trafiği</h3>
              <p className="text-[11px] text-gray-500">Son 7 gün sipariş analizi</p>
            </div>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600">7 Gün</span>
          </div>
          <div className="mt-6 flex flex-1 items-end gap-2">
            {orderTrend.map((point, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[10px] font-semibold text-gray-500">{point.count}</span>
                <div
                  className="w-full rounded-t-md bg-blue-500 transition-all"
                  style={{ height: `${Math.max(6, Math.round((point.count / maxTrendCount) * 120))}px` }}
                />
                <span className="text-[10px] text-gray-500">{point.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Limitine Yaklaşanlar */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-1">
          <h3 className="font-bold text-gray-900">Risk Limitine Yaklaşanlar</h3>
          <div className="mt-3 flex-1 space-y-3">
            {accounting.customersNearRiskLimit.slice(0, 5).map((item, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-800">{item.customerName}</span>
                  <span className="text-gray-500">%{item.usedPercent}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={item.usedPercent >= 90 ? 'h-full bg-red-500' : 'h-full bg-amber-400'} style={{ width: `${item.usedPercent}%` }} />
                </div>
                <p className="mt-0.5 text-[10px] text-gray-500">{formatCommercePrice(item.balance)} / {formatCommercePrice(item.riskLimit)}</p>
              </div>
            ))}
            {accounting.customersNearRiskLimit.length === 0 && (
              <p className="text-xs text-gray-500">Risk limitine yaklaşan müşteri yok.</p>
            )}
          </div>
          <Link href="/admin/accounting" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "mt-3 w-full text-xs flex items-center justify-center gap-1")}>
            Cari Hesaplar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Row 4 - Kritik Stok Widget */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <h3 className="font-bold text-gray-900">Kritik Stok</h3>
          <div className="mt-3 space-y-2">
            {critical.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-orange-50/50 p-2 text-xs">
                <span className="truncate font-medium text-gray-700">{p.title}</span>
                <span className="shrink-0 text-orange-600">{p.stock_quantity} / {p.critical_stock}</span>
              </div>
            ))}
            {critical.length === 0 && <p className="text-xs text-gray-500">Kritik stok yok 🎉</p>}
          </div>
          <Link href="/admin/stok/kritik" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), "mt-3 w-full text-xs flex items-center justify-center gap-1")}>
            Tümünü Gör <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Sistem & Entegrasyon Sağlığı */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-gray-500" />
            <span className="text-[11px] font-medium text-gray-600">Sistem ve Entegrasyon Sağlığı</span>
          </div>
          <div className="mt-4 flex-1 space-y-2 text-xs">
            {[
              { label: 'Database', ok: true },
              { label: 'Stok', ok: true },
              { label: 'Critical Stok', ok: accounting.criticalStockCount === 0 },
              { label: 'XML', ok: true },
              { label: 'Netgsm', ok: true },
              { label: 'SMTP', ok: false, note: 'Yapılandırılmamış' },
              { label: 'Ödeal', ok: false, note: 'Yapılandırılmamış' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-gray-600">{item.label}</span>
                <span className={item.ok ? 'font-medium text-emerald-600' : 'font-medium text-gray-500'}>
                  {item.ok ? 'Sağlıklı' : item.note || 'Kontrol'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operasyonel Özet */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
          <h3 className="font-bold text-gray-900">Operasyonel Özet</h3>
          <div className="mt-4 flex-1 space-y-3 text-xs">
            {[
              { label: 'Gecikmiş Ödeme', value: accounting.overdueCustomers },
              { label: 'Kritik Stok', value: accounting.criticalStockCount },
              { label: 'Toplam Ürün', value: metrics.totalProducts },
              { label: 'Bekleyen Sipariş', value: metrics.pendingOrders },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-blue-50 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-gray-900">Sistem durumu</span>
            </div>
            <p className="mt-1 text-xs text-blue-600">
              {accounting.overdueCustomers > 0 ? `${accounting.overdueCustomers} müşterinin ödemesi gecikmiş durumda.` : 'Sisteminizde kritik bir sorun bulunmuyor.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

