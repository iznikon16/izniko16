import {
  buildAccountingReportCsv,
  buildAccountingReportExcel,
  createAccountingReportFileName,
  parseAccountingReportFilters,
  type AccountingReportResult,
} from '@/lib/reports/accounting';

const report: AccountingReportResult = {
  title: 'Tahsilat Raporu',
  description: 'Test raporu',
  columns: [
    { key: 'customer', label: 'Müşteri' },
    { key: 'reference', label: 'Referans' },
    { key: 'amount', label: 'Tutar', kind: 'money' },
  ],
  rows: [{ id: '1', values: { customer: 'Çağatay Güney', reference: '=HYPERLINK("bad")', amount: 1250.5 } }],
  totalAmount: 1250.5,
  truncated: false,
};

describe('accounting reports', () => {
  it('parses one shared filter model', () => {
    const params = new URLSearchParams('type=collections&q=%20%C3%87a%C4%9Fatay%20&from=2026-08-01&to=2026-08-22');
    expect(parseAccountingReportFilters(params)).toEqual({
      type: 'collections', query: 'Çağatay', fromDate: '2026-08-01', toDate: '2026-08-22',
    });
  });

  it.each([
    'type=due&from=2026-02-30&to=2026-08-22',
    'type=due&from=2026-08-23&to=2026-08-22',
  ])('rejects invalid date filters: %s', (query) => {
    expect(() => parseAccountingReportFilters(new URLSearchParams(query))).toThrow();
  });

  it('falls back to a known report type and limits search length', () => {
    const params = new URLSearchParams({ type: 'unknown', q: 'x'.repeat(120), from: '2026-08-01', to: '2026-08-22' });
    const filters = parseAccountingReportFilters(params);
    expect(filters.type).toBe('balances');
    expect(filters.query).toHaveLength(100);
  });

  it('creates a BOM-prefixed, formula-safe UTF-8 CSV', () => {
    const csv = buildAccountingReportCsv(report);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Çağatay Güney');
    expect(csv).toContain("'=HYPERLINK");
  });

  it('creates a valid Excel workbook', async () => {
    const filters = parseAccountingReportFilters(new URLSearchParams('type=collections&from=2026-08-01&to=2026-08-22'));
    const excel = await buildAccountingReportExcel(report, filters);
    expect(Array.from(excel.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(excel.byteLength).toBeGreaterThan(1000);
  });

  it('creates a portable filtered report filename', () => {
    const filters = parseAccountingReportFilters(new URLSearchParams('type=risk&from=2026-08-01&to=2026-08-22'));
    expect(createAccountingReportFileName(filters, 'xlsx')).toBe('finansal-rapor-risk-2026-08-01-2026-08-22.xlsx');
  });
});
