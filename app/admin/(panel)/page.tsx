import Link from 'next/link';
import {
  Users,
  Activity,
  Box,
  ShoppingCart,
  Calendar,
  TriangleAlert,
  Clock,
  Wallet,
  Download,
  CalendarOff,
  ShieldAlert,
  ArrowRight,
  UserPlus,
  PackagePlus,
  RefreshCw,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import { DashboardToolbar } from './components/dashboard-toolbar';
import { DashboardCharts } from './components/dashboard-charts';
import { getAdminDashboardMetrics } from '@/lib/catalog/queries';
import { requireAdminSession } from '@/lib/auth/admin';
import { getDashboardAccountingMetrics, getOrderTrend, getRecentOrders, getAccountingTrend } from '@/lib/dashboard/queries';
import { getOverduePayments } from '@/lib/accounting/queries';
import { getCriticalStockProducts } from '@/lib/stock/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { cn } from '@/lib/utils';

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireAdminSession();
  const resolvedSearchParams = await searchParams;
  
  const days = resolvedSearchParams.days ? parseInt(resolvedSearchParams.days) : 7;
  
  const metrics = await getAdminDashboardMetrics(days);
  const accounting = await getDashboardAccountingMetrics();
  const overdue = await getOverduePayments();
  const critical = await getCriticalStockProducts(5);
  const orderTrend = await getOrderTrend(days);
  const accountingTrend = await getAccountingTrend(days);
  const recentOrders = await getRecentOrders(5);

  const todaysOrderCount = orderTrend.length > 0 ? orderTrend[orderTrend.length - 1].count : 0;
  
  // Calculate ops summary percentages safely
  const orderSuccessRate = metrics.totalOrders > 0 ? Math.round(((metrics.totalOrders - metrics.pendingOrders) / metrics.totalOrders) * 100) : 0;
  
  const totalInvolved = accounting.totalReceivable + accounting.todayCollected; 
  const collectionRate = totalInvolved > 0 ? Math.round((accounting.todayCollected / totalInvolved) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {/* Header Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Hoş Geldiniz, <span className="text-blue-600">{session.adminUser.full_name || session.user.email}</span>
          </h1>
          <p className="mt-1 text-gray-500">İşte bugün sisteminizde neler olup bitiyor.</p>
        </div>
        <DashboardToolbar />
      </div>

      {/* KPI Cards (3 Rows, 4 Columns) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* ROW 1 */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Toplam Ürün</span>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalProducts.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Tüm Katalog</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Yayındaki Ürün</span>
                <div className="text-2xl font-bold text-gray-900">{metrics.publishedProducts.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Aktif Ürünler</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Toplam Müşteri</span>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalCustomers.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Tüm Zamanlar</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Bekleyen Sipariş</span>
                <div className="text-2xl font-bold text-gray-900">{metrics.pendingOrders.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Onay Bekliyor</span>
          </div>
        </div>

        {/* ROW 2 */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Toplam Sipariş</span>
                <div className="text-2xl font-bold text-gray-900">{metrics.totalOrders.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Tüm Zamanlar</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Bugünkü Sipariş</span>
                <div className="text-2xl font-bold text-gray-900">{todaysOrderCount.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Bugün</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Kritik Stok</span>
                <div className="text-2xl font-bold text-gray-900">{accounting.criticalStockCount.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Kritik Limit Altı</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Geciken Ödemeler</span>
                <div className="text-2xl font-bold text-gray-900">{accounting.overdueCustomers.toLocaleString('tr-TR')}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Vadesi Geçmiş</span>
          </div>
        </div>

        {/* ROW 3 */}
        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Toplam Cari Alacak</span>
                <div className="text-xl font-bold text-gray-900">{formatCommercePrice(accounting.totalReceivable)}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Tüm Zamanlar</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Bugünkü Tahsilat</span>
                <div className="text-xl font-bold text-gray-900">{formatCommercePrice(accounting.todayCollected)}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Bugün</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <CalendarOff className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Vadesi Geçmiş Tutar</span>
                <div className="text-xl font-bold text-gray-900">{formatCommercePrice(accounting.overdueTotal)}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">Toplam</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-500">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-600">Risk Limitine Yaklaşanlar</span>
                <div className="text-2xl font-bold text-gray-900">{accounting.customersNearRiskLimit.length}</div>
              </div>
            </div>
            <span className="text-[10px] text-gray-400 self-end mb-1">%80+ Kullanım</span>
          </div>
        </div>
      </div>

      {/* Charts & Ops Summary */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts orderTrend={orderTrend} accountingTrend={accountingTrend} />
        </div>
        
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 mt-4 lg:mt-4">
          <h3 className="font-bold text-gray-900">Operasyonel Özet ({days} Gün)</h3>
          
          <div className="mt-4 grid grid-cols-2 gap-3 flex-1">
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] font-semibold text-gray-500">Sipariş Tamamlama Oranı</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-gray-900">%{orderSuccessRate}</span>
                <span className="text-[10px] text-gray-400">Başarılı</span>
              </div>
            </div>
            
            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] font-semibold text-gray-500">Tahsilat Oranı</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-gray-900">%{collectionRate}</span>
                <span className="text-[10px] text-gray-400">Hedefe Göre</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-red-500" />
                <span className="text-[10px] font-semibold text-gray-500">Gecikmiş Ödeme</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-red-600">{accounting.overdueCustomers}</span>
                <span className="text-[10px] text-gray-400">Vadesi Geçmiş</span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert className="h-4 w-4 text-orange-500" />
                <span className="text-[10px] font-semibold text-gray-500">Kritik Stok</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-xl font-bold text-orange-600">{accounting.criticalStockCount}</span>
                <span className="text-[10px] text-gray-400">Limit Altı</span>
              </div>
            </div>
          </div>

          <div className={cn("mt-4 rounded-xl p-4", accounting.overdueCustomers > 0 || accounting.criticalStockCount > 0 ? "bg-red-50" : "bg-blue-50")}>
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("h-4 w-4", accounting.overdueCustomers > 0 || accounting.criticalStockCount > 0 ? "text-red-500" : "text-blue-500")} />
              <span className="text-sm font-semibold text-gray-900">
                {accounting.overdueCustomers > 0 || accounting.criticalStockCount > 0 ? 'İlgilenilmesi gereken uyarılar var.' : 'Sisteminizde kritik bir sorun bulunmuyor.'}
              </span>
            </div>
            <p className={cn("mt-1 text-[11px]", accounting.overdueCustomers > 0 || accounting.criticalStockCount > 0 ? "text-red-600" : "text-blue-600")}>
              Tüm sistemler sorunsuz çalışıyor. Son kontrol: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {/* Son Siparişler */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-4">
          <h3 className="font-bold text-gray-900 mb-4">Son Siparişler</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 font-medium">Sipariş No</th>
                  <th className="pb-2 font-medium">Müşteri</th>
                  <th className="pb-2 font-medium">Tutar</th>
                  <th className="pb-2 font-medium">Ödeme</th>
                  <th className="pb-2 font-medium">Durum</th>
                  <th className="pb-2 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-blue-600">{order.order_number || order.id.slice(0, 8)}</td>
                    <td className="py-3 font-medium text-gray-800">{order.customerName}</td>
                    <td className="py-3 font-semibold text-gray-900">{formatCommercePrice(order.total)}</td>
                    <td className="py-3 text-gray-500">{order.paymentMethod}</td>
                    <td className="py-3">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        order.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'pending_payment' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {order.status === 'completed' ? 'Onaylandı' : order.status === 'pending_payment' ? 'Onay Bekliyor' : 'İşleniyor'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{new Date(order.created_at).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">Henüz sipariş yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link href="/admin/orders" className="mt-3 text-center text-[11px] font-medium text-gray-500 hover:text-blue-600 flex justify-center items-center gap-1">
            Tüm Siparişleri Görüntüle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Geciken Ödemeler */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-3">
          <h3 className="font-bold text-gray-900 mb-4">Geciken Ödemeler</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 font-medium">Müşteri</th>
                  <th className="pb-2 font-medium">Kalan Tutar</th>
                  <th className="pb-2 font-medium">Gecikme</th>
                </tr>
              </thead>
              <tbody>
                {overdue.slice(0, 5).map((item, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-gray-800">{item.customerName}</td>
                    <td className="py-3 font-semibold text-gray-900">{formatCommercePrice(item.remaining)}</td>
                    <td className="py-3 font-semibold text-red-500">{item.overdueDays} gün</td>
                  </tr>
                ))}
                {overdue.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">Geciken ödeme yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link href="/admin/accounting/geciken-odemeler" className="mt-3 text-center text-[11px] font-medium text-gray-500 hover:text-blue-600 flex justify-center items-center gap-1">
            Tümünü Görüntüle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Kritik Stok */}
        <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10 lg:col-span-3">
          <h3 className="font-bold text-gray-900 mb-4">Kritik Stoktaki Ürünler</h3>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="pb-2 font-medium">Ürün</th>
                  <th className="pb-2 font-medium text-center">Stok</th>
                  <th className="pb-2 font-medium text-center">Limit</th>
                </tr>
              </thead>
              <tbody>
                {critical.slice(0, 4).map((p) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 font-medium text-gray-800 truncate max-w-[120px]" title={p.title}>{p.title}</td>
                    <td className="py-3 text-center font-semibold text-gray-900">{p.stock_quantity}</td>
                    <td className="py-3 text-center text-gray-500">{p.critical_stock}</td>
                  </tr>
                ))}
                {critical.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">Kritik stok yok.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Link href="/admin/stok/kritik" className="mt-3 text-center text-[11px] font-medium text-gray-500 hover:text-blue-600 flex justify-center items-center gap-1">
            Tümünü Görüntüle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Sağlık & Hızlı İşlemler */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex-1 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
            <h3 className="font-bold text-gray-900 mb-3 text-[13px]">Entegrasyon Sağlığı</h3>
            <div className="space-y-3 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database</span>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sağlıklı
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">XML</span>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sağlıklı
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Netgsm</span>
                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sağlıklı
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">SMTP</span>
                <div className="flex items-center gap-1 text-orange-500 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Hata
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ödeal</span>
                <div className="flex items-center gap-1 text-orange-500 font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" /> Hata
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-4 shadow-sm shadow-[#cbd5e1]/10">
            <h3 className="font-bold text-gray-900 mb-3 text-[13px]">Hızlı İşlemler</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/admin/customers/new" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50 transition-colors text-blue-600">
                <UserPlus className="h-5 w-5" />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">Müşteri</span>
              </Link>
              <Link href="/admin/products/new" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50 transition-colors text-emerald-600">
                <PackagePlus className="h-5 w-5" />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">Ürün</span>
              </Link>
              <Link href="/admin/accounting" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50 transition-colors text-emerald-500">
                <Landmark className="h-5 w-5" />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">Tahsilat</span>
              </Link>
              <Link href="/admin/entegrasyonlar/xml/aktarimlar" className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-100 p-2.5 hover:bg-gray-50 transition-colors text-indigo-500">
                <RefreshCw className="h-5 w-5" />
                <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">XML</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
