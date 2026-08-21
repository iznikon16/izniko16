import {
  buildCustomerLedgerHref,
  CUSTOMER_LEDGER_PAGE_SIZE,
  parseCustomerLedgerFilters,
} from '@/lib/accounting/ledger-filters';

describe('customer ledger filters', () => {
  it('normalizes type, date, query and page filters', () => {
    expect(parseCustomerLedgerFilters({
      ledgerQuery: '  sipariş 42 ',
      ledgerType: 'ORDER',
      ledgerFrom: '2026-08-01',
      ledgerTo: '2026-08-31',
      ledgerPage: '2',
    })).toEqual({
      query: 'sipariş 42',
      type: 'ORDER',
      fromDate: '2026-08-01',
      toDate: '2026-08-31',
      page: 2,
      pageSize: CUSTOMER_LEDGER_PAGE_SIZE,
    });
  });

  it('rejects unsupported types and invalid date ranges', () => {
    expect(parseCustomerLedgerFilters({
      ledgerType: 'DELETE',
      ledgerFrom: '2026-09-10',
      ledgerTo: '2026-09-01',
      ledgerPage: '0',
    })).toEqual({
      query: undefined,
      type: undefined,
      fromDate: '2026-09-10',
      toDate: undefined,
      page: 1,
      pageSize: CUSTOMER_LEDGER_PAGE_SIZE,
    });
  });

  it('preserves filters in pagination links', () => {
    const filters = parseCustomerLedgerFilters({ ledgerType: 'ADJUSTMENT', ledgerQuery: 'A&B' });
    expect(buildCustomerLedgerHref('customer-id', filters, 3)).toBe(
      '/admin/accounting/customer-id?tab=transactions&ledgerQuery=A%26B&ledgerType=ADJUSTMENT&ledgerPage=3',
    );
  });
});
