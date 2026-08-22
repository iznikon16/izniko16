import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  TurkishLira,
  CreditCard,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { DashboardCharts } from './components/dashboard-charts';
import { DashboardToolbar } from './components/dashboard-toolbar';
import { getOverduePayments } from '@/lib/accounting/queries';
import { getAdminPermissionKeys, requireAdminSession } from '@/lib/auth/admin';
import { getAdminDashboardMetrics } from '@/lib/catalog/queries';
import { formatCommercePrice } from '@/lib/commerce/format';
import { getDashboardDateRange, parseDashboardPeriod } from '@/lib/dashboard/filters';
import {
  getAccountingTrend,
  getDashboardAccountingMetrics,
  getDashboardActivities,
  getDashboardIntegrationHealth,
  getOrderTrend,
  getRecentOrders,
} from '@/lib/dashboard/queries';
import { getCriticalStockProducts } from '@/lib/stock/queries';

const orderStatusLabels: Record<string, string> = {
  pending_payment: 'Ödeme bekliyor',
  pending: 'Bekliyor',
  confirmed: 'Onaylandı',
  processing: 'Hazırlanıyor',
  shipped: 'Kargoda',
  delivered: 'Teslim edildi',
  cancelled: 'İptal edildi',
};

const paymentStatusLabels: Record<string, string> = {
  pending: 'Ödeme bekliyor',
  paid: 'Ödendi',
  failed: 'Başarısız',
  refunded: 'İade edildi',
  partially_refunded: 'Kısmi iade',
};

function KpiCard({ icon: Icon, label, value, note, tone = 'blue' }: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
  };
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-950" title={value}>{value}</p>
          <p className="mt-1 text-[11px] text-slate-400">{note}</p>
        </div>
      </div>
    </article>
  );
}

function hasPermission(permissions: Set<string>, key: string) {
  return permissions.has('*') || permissions.has(key);
}

function Panel({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold text-slate-900">{title}</h2>
        {href && <Link href={href} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">Tümünü gör <ArrowRight className="h-3.5 w-3.5" /></Link>}
      </div>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ days?: string | string[] }> }) {
  const session = await requireAdminSession();
  const permissions = await getAdminPermissionKeys(session);
  const params = await searchParams;
  const period = parseDashboardPeriod(Array.isArray(params.days) ? params.days[0] : params.days);
  const range = getDashboardDateRange(period);
  const canViewSettings = hasPermission(permissions, 'settings.view');
  const canViewAudit = hasPermission(permissions, 'audit.view');

  const [metrics, accounting, overdue, critical, orderTrend, accountingTrend, recentOrders, health, activities] = await Promise.all([
    getAdminDashboardMetrics(),
    getDashboardAccountingMetrics(),
    getOverduePayments(),
    getCriticalStockProducts(5),
    getOrderTrend(range),
    getAccountingTrend(range),
    getRecentOrders(5),
    canViewSettings ? getDashboardIntegrationHealth() : Promise.resolve([]),
    canViewAudit ? getDashboardActivities(5) : Promise.resolve([]),
  ]);

  const selectedCollected = accountingTrend.reduce((sum, point) => sum + point.tahsilat, 0);
  const selectedDebt = accountingTrend.reduce((sum, point) => sum + point.yeniBorc, 0);
  const collectionRate = selectedDebt > 0 ? Math.min(100, Math.round((selectedCollected / selectedDebt) * 100)) : selectedCollected > 0 ? 100 : 0;
  const orderCompletionRate = metrics.totalOrders > 0
    ? Math.max(0, Math.round(((metrics.totalOrders - metrics.pendingOrders) / metrics.totalOrders) * 100))
    : 0;
  const quickActions = [
    { permission: 'customer.create', href: '/admin/customers', label: 'Müşteri ekle', icon: UserPlus },
    { permission: 'product.create', href: '/admin/products/new', label: 'Ürün ekle', icon: PackagePlus },
    { permission: 'order.view', href: '/admin/orders', label: 'Siparişler', icon: ShoppingCart },
    { permission: 'account.collectPayment', href: '/admin/accounting/tahsilatlar', label: 'Tahsilat gir', icon: TurkishLira },
    { permission: 'xml.sync', href: '/admin/integrations/xml', label: 'XML yönetimi', icon: RefreshCw },
  ].filter((action) => hasPermission(permissions, action.permission));

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Hoş geldiniz, {session.adminUser.full_name || session.user.email}</h1>
          <p className="mt-1 text-sm text-slate-500">İşletmenizin güncel operasyon ve finans özetini görüntüleyin.</p>
        </div>
        <DashboardToolbar period={period} canExport={hasPermission(permissions, 'report.export')} />
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard icon={Boxes} label="Toplam ürün" value={metrics.totalProducts.toLocaleString('tr-TR')} note={`${metrics.publishedProducts.toLocaleString('tr-TR')} yayında`} />
        <KpiCard icon={Users} label="Toplam müşteri" value={metrics.totalCustomers.toLocaleString('tr-TR')} note={`${metrics.activeCustomers.toLocaleString('tr-TR')} aktif`} tone="violet" />
        <KpiCard icon={ShoppingCart} label="Toplam sipariş" value={metrics.totalOrders.toLocaleString('tr-TR')} note={`${metrics.todayOrders.toLocaleString('tr-TR')} bugün`} tone="emerald" />
        <KpiCard icon={CalendarClock} label="Bekleyen sipariş" value={metrics.pendingOrders.toLocaleString('tr-TR')} note="İşlem bekleyen" tone="amber" />
        <KpiCard icon={AlertTriangle} label="Kritik stok" value={accounting.criticalStockCount.toLocaleString('tr-TR')} note="Kritik limitte veya altında" tone="rose" />
        <KpiCard icon={WalletCards} label="Stok değeri" value={formatCommercePrice(accounting.totalStockValue)} note="Güncel satış fiyatıyla" />
        <KpiCard icon={CreditCard} label="Toplam cari alacak" value={formatCommercePrice(accounting.totalReceivable)} note="Açık müşteri bakiyesi" tone="violet" />
        <KpiCard icon={CalendarClock} label="Bugün vadeli" value={formatCommercePrice(accounting.dueToday)} note="Bugün vadesi gelen" tone="amber" />
        <KpiCard icon={AlertTriangle} label="Vadesi geçmiş" value={formatCommercePrice(accounting.overdueTotal)} note={`${accounting.overdueCustomers} müşteri`} tone="rose" />
        <KpiCard icon={TurkishLira} label="Bugünkü tahsilat" value={formatCommercePrice(accounting.todayCollected)} note="İstanbul gün sınırı" tone="emerald" />
        <KpiCard icon={Activity} label="Sipariş sonuçlanma" value={`%${orderCompletionRate}`} note="Bekleyenler hariç" />
        <KpiCard icon={ReceiptText} label="Dönem tahsilat oranı" value={`%${collectionRate}`} note={`${range.days} günlük veri`} tone="emerald" />
      </section>

      <DashboardCharts orderTrend={orderTrend} accountingTrend={accountingTrend} period={period} />

      <section className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Son siparişler" href="/admin/orders">
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="grid gap-1 rounded-xl border border-slate-100 p-3 transition hover:border-blue-200 hover:bg-blue-50/40 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{order.order_number || order.id}</p><p className="truncate text-xs text-slate-500">{order.customerName}</p></div>
                <div className="sm:text-right"><p className="text-sm font-bold text-slate-900">{formatCommercePrice(Number(order.total))}</p><p className="text-[11px] text-slate-500">{orderStatusLabels[order.status] || order.status} · {paymentStatusLabels[order.payment_status] || order.payment_status}</p></div>
              </Link>
            ))}
            {!recentOrders.length && <p className="py-6 text-center text-sm text-slate-500">Henüz sipariş yok.</p>}
          </div>
        </Panel>

        <Panel title="Geciken ödemeler" href="/admin/accounting/geciken-odemeler">
          <div className="space-y-2">
            {overdue.slice(0, 5).map((item) => (
              <div key={item.transactionId} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50/70 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{item.customerName}</p><p className="text-xs text-rose-600">{item.overdueDays} gün gecikmiş</p></div>
                <span className="shrink-0 text-sm font-bold text-slate-900">{formatCommercePrice(item.remaining)}</span>
              </div>
            ))}
            {!overdue.length && <p className="py-6 text-center text-sm text-slate-500">Geciken ödeme yok.</p>}
          </div>
        </Panel>

        <Panel title="Kritik stok" href="/admin/stock">
          <div className="space-y-2">
            {critical.map((product) => (
              <Link key={product.id} href={`/admin/products/${product.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50/70 p-3 hover:bg-amber-50">
                <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{product.title}</p><p className="text-xs text-slate-500">{product.sku}</p></div>
                <span className="shrink-0 text-sm font-bold text-amber-700">{product.stock_quantity} adet</span>
              </Link>
            ))}
            {!critical.length && <p className="py-6 text-center text-sm text-slate-500">Kritik stok bulunmuyor.</p>}
          </div>
        </Panel>
      </section>

      <section className="grid items-start gap-4 xl:grid-cols-3">
        <Panel title="Risk limitine yaklaşanlar" href="/admin/accounting">
          <div className="space-y-3">
            {accounting.customersNearRiskLimit.map((customer) => (
              <Link key={customer.customerId} href={`/admin/accounting/${customer.customerId}`} className="block rounded-xl border border-slate-100 p-3 hover:border-amber-200">
                <div className="mb-2 flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-900">{customer.customerName}</span><span className="text-xs font-bold text-amber-700">%{customer.usedPercent}</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${customer.usedPercent}%` }} /></div>
                <p className="mt-2 text-[11px] text-slate-500">Bakiye {formatCommercePrice(customer.balance)} · Limit {formatCommercePrice(customer.riskLimit)}</p>
              </Link>
            ))}
            {!accounting.customersNearRiskLimit.length && <p className="py-6 text-center text-sm text-slate-500">Risk eşiğine yaklaşan müşteri yok.</p>}
          </div>
        </Panel>

        {canViewSettings && <Panel title="Entegrasyon durumu" href="/admin/integrations">
          <div className="space-y-2">
            {health.map((item) => {
              const healthy = item.status === 'success' || item.status === 'ready';
              return <Link key={item.key} href={item.href} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 hover:bg-slate-50"><div className="min-w-0"><p className="text-sm font-semibold text-slate-900">{item.label}</p><p className="truncate text-xs text-slate-500" title={item.message}>{item.message}</p></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${healthy ? 'bg-emerald-500' : item.status === 'failed' ? 'bg-rose-500' : 'bg-slate-300'}`} /></Link>;
            })}
          </div>
        </Panel>}

        {canViewAudit && <Panel title="Son aktiviteler" href="/admin/yonetim/audit">
          <div className="space-y-2">
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-slate-100 px-3 py-2.5"><p className="truncate text-sm font-semibold text-slate-900">{activity.label}</p><p className="mt-0.5 text-xs text-slate-500">{activity.resourceType} · {new Intl.DateTimeFormat('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' }).format(new Date(activity.createdAt))}</p></div>
            ))}
            {!activities.length && <p className="py-6 text-center text-sm text-slate-500">Aktivite kaydı yok.</p>}
          </div>
        </Panel>}
      </section>

      {!!quickActions.length && <Panel title="Hızlı işlemler">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {quickActions.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Icon className="h-4 w-4" />{label}</Link>)}
        </div>
      </Panel>}
    </main>
  );
}
