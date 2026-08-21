import {
  attachmentHeaders,
  createStatementFileName,
  escapeCsvCell,
  getStatementDateBounds,
  parseStatementExportParams,
  sanitizeSpreadsheetCell,
} from '@/lib/accounting/statement-export';
import { buildStatementCsv, buildStatementExcel, buildStatementPdf } from '@/lib/accounting/statement-documents';
import type { AccountStatement } from '@/lib/accounting/types';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const statement: AccountStatement = {
  customer: { user_id: CUSTOMER_ID, full_name: 'Işık Şirketi', email: 'isik@example.test', phone: '555' },
  accountCode: 'CARI-11111111', fromDate: '2026-08-01', toDate: '2026-08-20',
  openingBalance: 50, totalDebit: 100, totalCredit: 25, closingBalance: 125,
  lines: [{ id: 'tx-1', date: '2026-08-10T09:00:00Z', documentNo: '=FORMULA', description: 'Türkçe ödeme açıklaması', debit: 100, credit: 25, balanceAfter: 125, dueDate: '2026-08-15', type: 'PAYMENT', isReversal: false }],
};

describe('statement export safety', () => {
  it('accepts a valid customer and date range', () => {
    const url = new URL(`https://example.test/export?customer=${CUSTOMER_ID}&from=2026-08-01&to=2026-08-20`);
    expect(parseStatementExportParams(url)).toEqual({ customerId: CUSTOMER_ID, fromDate: '2026-08-01', toDate: '2026-08-20' });
  });

  it.each([
    ['invalid customer', `customer=nope&from=2026-08-01&to=2026-08-20`],
    ['invalid date', `customer=${CUSTOMER_ID}&from=2026-02-30&to=2026-08-20`],
    ['reversed range', `customer=${CUSTOMER_ID}&from=2026-08-21&to=2026-08-20`],
  ])('rejects %s', (_label, query) => {
    expect(() => parseStatementExportParams(new URL(`https://example.test/export?${query}`))).toThrow();
  });

  it('builds Istanbul-inclusive date boundaries', () => {
    const bounds = getStatementDateBounds('2026-08-01', '2026-08-20');
    expect(bounds.fromInclusive.toISOString()).toBe('2026-07-31T21:00:00.000Z');
    expect(bounds.toExclusive.toISOString()).toBe('2026-08-20T21:00:00.000Z');
  });

  it.each(['=HYPERLINK("bad")', '+1+1', '-2+3', '@SUM(A1:A2)'])(
    'neutralizes spreadsheet formulas: %s',
    (value) => expect(sanitizeSpreadsheetCell(value)).toBe(`'${value}`)
  );

  it('quotes CSV delimiters and preserves Turkish text', () => {
    expect(escapeCsvCell('Ödeme; açıklaması')).toBe('"Ödeme; açıklaması"');
  });

  it('creates a portable statement filename', () => {
    expect(createStatementFileName('İşık Şirketi', '2026-08-01', '2026-08-20', 'xlsx'))
      .toBe('cari-ekstre-isik-sirketi-2026-08-01-2026-08-20.xlsx');
  });

  it('returns no-store and RFC 5987 attachment headers', () => {
    const headers = attachmentHeaders('cari-ekstre.pdf', 'application/pdf');
    expect(headers['Cache-Control']).toContain('no-store');
    expect(headers['Content-Disposition']).toContain("filename*=UTF-8''");
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  it('builds a BOM-prefixed, formula-safe customer CSV', () => {
    const csv = buildStatementCsv(statement);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=FORMULA");
    expect(csv).toContain('Türkçe ödeme açıklaması');
  });

  it('builds a readable UTF-8 Excel workbook', async () => {
    const excel = await buildStatementExcel(statement);
    expect(Array.from(excel.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(excel.byteLength).toBeGreaterThan(1000);
  });

  it('builds a real PDF document with embedded font', async () => {
    const pdf = await buildStatementPdf(statement);
    expect(new TextDecoder().decode(pdf.slice(0, 4))).toBe('%PDF');
    expect(pdf.byteLength).toBeGreaterThan(1000);
  });
});
