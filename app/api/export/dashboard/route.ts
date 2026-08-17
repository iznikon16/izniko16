import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/auth/admin';
import { getAdminDashboardMetrics } from '@/lib/catalog/queries';
import { getDashboardAccountingMetrics, getOrderTrend } from '@/lib/dashboard/queries';

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();
    
    const searchParams = req.nextUrl.searchParams;
    const daysParam = searchParams.get('days');
    const days = daysParam && daysParam !== 'all' ? parseInt(daysParam) : 7;
    
    const metrics = await getAdminDashboardMetrics(days);
    const accounting = await getDashboardAccountingMetrics(days);
    const orderTrend = await getOrderTrend(days);
    
    // Basit bir CSV yapısı - Excel'de TR karakter sorunu olmaması için UTF-8 BOM (\uFEFF) ekliyoruz
    let csvContent = '\uFEFFMETRIK_ADI,DEGER\n';
    csvContent += `Toplam Urun,${metrics.totalProducts}\n`;
    csvContent += `Yayindaki Urunler,${metrics.publishedProducts}\n`;
    csvContent += `Toplam Musteri,${metrics.totalCustomers}\n`;
    csvContent += `Toplam Siparis,${metrics.totalOrders}\n`;
    csvContent += `Bekleyen Siparis,${metrics.pendingOrders}\n`;
    csvContent += `\n`;
    
    csvContent += `TOPLAM_ALACAK,${accounting.totalReceivable}\n`;
    csvContent += `BUGUN_VADESI_GELEN,${accounting.dueToday}\n`;
    csvContent += `VADESI_GECMIS_TOPLAM,${accounting.overdueTotal}\n`;
    csvContent += `BUGUN_TAHSIL_EDILEN,${accounting.todayCollected}\n`;
    csvContent += `KRITIK_STOK_SAYISI,${accounting.criticalStockCount}\n`;
    csvContent += `\n`;

    csvContent += 'TARIH,SIPARIS_SAYISI,TOPLAM_TUTAR\n';
    orderTrend.forEach(trend => {
      csvContent += `${trend.label},${trend.count},${trend.total}\n`;
    });
    
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="dashboard_rapor_${new Date().toISOString().slice(0,10)}.csv"`,
      }
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
