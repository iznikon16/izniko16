import {
  buildCustomerAccountListHref,
  CUSTOMER_ACCOUNT_PAGE_SIZE,
  parseCustomerAccountListFilters,
} from '@/lib/accounting/list-filters';

describe('customer account list filters', () => {
  it('normalizes supported server-side filters', () => {
    expect(parseCustomerAccountListFilters({
      q: '  İznik Bayi  ',
      balance: 'debtor',
      overdue: 'yes',
      risk: 'exceeded',
      status: 'inactive',
      page: '3',
    })).toEqual({
      query: 'İznik Bayi',
      balance: 'debtor',
      overdue: true,
      riskExceeded: true,
      status: 'inactive',
      page: 3,
      pageSize: CUSTOMER_ACCOUNT_PAGE_SIZE,
    });
  });

  it('falls back safely for unsupported values', () => {
    expect(parseCustomerAccountListFilters({
      balance: 'all',
      status: 'deleted',
      page: '-2',
    })).toEqual({
      query: undefined,
      balance: undefined,
      overdue: undefined,
      riskExceeded: undefined,
      status: undefined,
      page: 1,
      pageSize: CUSTOMER_ACCOUNT_PAGE_SIZE,
    });
  });

  it('preserves filters in pagination links', () => {
    const filters = parseCustomerAccountListFilters({ q: 'A&B', status: 'active' });
    expect(buildCustomerAccountListHref(filters, 2)).toBe('/admin/accounting?q=A%26B&status=active&page=2');
  });
});
