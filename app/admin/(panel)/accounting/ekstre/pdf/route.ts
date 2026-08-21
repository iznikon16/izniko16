import { getAccountStatement } from '@/lib/accounting/queries';
import { buildStatementPdf } from '@/lib/accounting/statement-documents';
import { attachmentHeaders, createStatementFileName, parseStatementExportParams } from '@/lib/accounting/statement-export';
import { requireAdminPermission } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  await requireAdminPermission('account.exportStatement');
  let params;
  try { params = parseStatementExportParams(new URL(request.url)); }
  catch (error) { return new Response(error instanceof Error ? error.message : 'Geçersiz istek.', { status: 400 }); }

  const statement = await getAccountStatement(params.customerId, params.fromDate, params.toDate);
  const fileName = createStatementFileName(statement.customer?.full_name, params.fromDate, params.toDate, 'pdf');
  return new Response(await buildStatementPdf(statement), { headers: attachmentHeaders(fileName, 'application/pdf') });
}
