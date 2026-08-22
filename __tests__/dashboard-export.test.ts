import { buildDashboardCsv } from '@/lib/dashboard/export';

describe('dashboard CSV export', () => {
  it('uses UTF-8 BOM, Turkish headings and semicolon separators', () => {
    const csv = buildDashboardCsv({
      metrics: {
        totalProducts: 2, publishedProducts: 1, onRequestProducts: 0, featuredProducts: 0,
        totalBrands: 0, totalCategories: 0, totalCustomers: 3, activeCustomers: 2,
        totalOrders: 4, todayOrders: 1, pendingOrders: 1, activeCoupons: 0,
        activeCampaigns: 0, activePaymentMethods: 1,
      },
      accounting: {
        totalReceivable: 100, dueToday: 20, overdueTotal: 10, todayCollected: 5,
        overdueCustomers: 1, criticalStockCount: 2, totalStockValue: 500,
        customersNearRiskLimit: [],
      },
      orderTrend: [{ label: '22 Ağu', count: 1, total: 50 }],
    });
    expect(csv.startsWith('\uFEFFMetrik;Değer')).toBe(true);
    expect(csv).toContain('Bugünkü sipariş;1');
    expect(csv).toContain('22 Ağu;1;50');
  });
});
