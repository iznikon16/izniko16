import { requireAdminPermission } from '@/lib/auth/admin';
import {
  accountingReportHeaders,
  buildAccountingReportExcel,
  createAccountingReportFileName,
  getAccountingReport,
  parseAccountingReportFilters,
} from '@/lib/reports/accounting';

export async function GET(request: Request) {
  await requireAdminPermission('report.export');
  let filters;
  try {
    filters = parseAccountingReportFilters(new URL(request.url).searchParams);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Geçersiz rapor filtresi.' }, { status: 400 });
  }
  try {
    const report = await getAccountingReport(filters);
    const fileName = createAccountingReportFileName(filters, 'xlsx');
    const body = await buildAccountingReportExcel(report, filters);
    return new Response(body, { headers: accountingReportHeaders(fileName, true) });
  } catch {
    return Response.json({ error: 'Rapor oluşturulamadı.' }, { status: 500 });
  }
}
