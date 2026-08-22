import { escapeCsvCell } from '@/lib/accounting/statement-export';
import type { AdminDashboardMetrics } from '@/lib/catalog/types';
import type { DashboardAccountingMetrics, OrderTrendPoint } from '@/lib/dashboard/queries';

export function buildDashboardCsv(input: {
  metrics: AdminDashboardMetrics;
  accounting: DashboardAccountingMetrics;
  orderTrend: OrderTrendPoint[];
}) {
  const rows: Array<Array<string | number>> = [
    ['Metrik', 'Değer'],
    ['Toplam ürün', input.metrics.totalProducts],
    ['Yayındaki ürün', input.metrics.publishedProducts],
    ['Toplam müşteri', input.metrics.totalCustomers],
    ['Aktif müşteri', input.metrics.activeCustomers],
    ['Toplam sipariş', input.metrics.totalOrders],
    ['Bugünkü sipariş', input.metrics.todayOrders],
    ['Bekleyen sipariş', input.metrics.pendingOrders],
    ['Toplam cari alacak', input.accounting.totalReceivable],
    ['Bugün vadesi gelen', input.accounting.dueToday],
    ['Vadesi geçmiş toplam', input.accounting.overdueTotal],
    ['Bugün tahsil edilen', input.accounting.todayCollected],
    ['Kritik stok sayısı', input.accounting.criticalStockCount],
    ['Toplam stok değeri', input.accounting.totalStockValue],
    [],
    ['Tarih', 'Sipariş sayısı', 'Toplam tutar'],
    ...input.orderTrend.map((point) => [point.label, point.count, point.total]),
  ];
  return `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n')}`;
}
