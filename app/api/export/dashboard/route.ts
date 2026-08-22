import { NextRequest, NextResponse } from 'next/server';
import { attachmentHeaders } from '@/lib/accounting/statement-export';
import { getAdminPermissionKeys, getAdminSession } from '@/lib/auth/admin';
import { getAdminDashboardMetrics } from '@/lib/catalog/queries';
import { buildDashboardCsv } from '@/lib/dashboard/export';
import { getDashboardDateRange, parseDashboardPeriod } from '@/lib/dashboard/filters';
import { getDashboardAccountingMetrics, getOrderTrend } from '@/lib/dashboard/queries';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, {
      status: 401,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }
  const permissions = await getAdminPermissionKeys(session);
  if (!permissions.has('*') && !permissions.has('report.export')) {
    return NextResponse.json({ error: 'Bu raporu dışa aktarma yetkiniz yok.' }, {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }
  try {
    const period = parseDashboardPeriod(request.nextUrl.searchParams.get('days'));
    const range = getDashboardDateRange(period);
    const [metrics, accounting, orderTrend] = await Promise.all([
      getAdminDashboardMetrics(),
      getDashboardAccountingMetrics(),
      getOrderTrend(range),
    ]);
    const fileName = `dashboard-raporu-${range.toDate}.csv`;
    return new Response(buildDashboardCsv({ metrics, accounting, orderTrend }), {
      headers: attachmentHeaders(fileName, 'text/csv; charset=utf-8'),
    });
  } catch {
    return NextResponse.json({ error: 'Dashboard raporu oluşturulamadı.' }, {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store, max-age=0' },
    });
  }
}
