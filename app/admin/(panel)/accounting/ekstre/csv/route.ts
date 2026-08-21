import { getAccountStatement } from '@/lib/accounting/queries';
import { buildStatementCsv } from '@/lib/accounting/statement-documents';
import { attachmentHeaders, createStatementFileName, parseStatementExportParams } from '@/lib/accounting/statement-export';
import { requireAdminPermission } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await requireAdminPermission('account.exportStatement');
  let params;
  try { params = parseStatementExportParams(new URL(request.url)); }
  catch (error) { return new Response(error instanceof Error ? error.message : 'Geçersiz istek.', { status: 400 }); }

  const statement = await getAccountStatement(params.customerId, params.fromDate, params.toDate);
  const fileName = createStatementFileName(statement.customer?.full_name, params.fromDate, params.toDate, 'csv');
  return new Response(buildStatementCsv(statement), { headers: attachmentHeaders(fileName, 'text/csv; charset=utf-8') });
}
