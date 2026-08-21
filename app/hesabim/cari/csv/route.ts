import { getOwnCustomerStatement } from '@/lib/accounting/customer-portal';
import { buildStatementCsv } from '@/lib/accounting/statement-documents';
import { attachmentHeaders, createStatementFileName, parseStatementDateRange } from '@/lib/accounting/statement-export';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  let range;
  try { range = parseStatementDateRange(new URL(request.url).searchParams); }
  catch (error) { return new Response(error instanceof Error ? error.message : 'Geçersiz istek.', { status: 400 }); }

  const statement = await getOwnCustomerStatement(range.fromDate, range.toDate);
  const fileName = createStatementFileName(statement.customer?.full_name, range.fromDate, range.toDate, 'csv');
  return new Response(buildStatementCsv(statement), { headers: attachmentHeaders(fileName, 'text/csv; charset=utf-8') });
}
