import type { CustomerAccountListFilters } from '@/lib/accounting/types';

export const CUSTOMER_ACCOUNT_PAGE_SIZE = 20;

export type CustomerAccountSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export function parseCustomerAccountListFilters(params: CustomerAccountSearchParams): CustomerAccountListFilters {
  const query = first(params.q).trim().slice(0, 120);
  const balanceParam = first(params.balance);
  const statusParam = first(params.status);
  const parsedPage = Number.parseInt(first(params.page), 10);

  return {
    query: query || undefined,
    balance: balanceParam === 'debtor' || balanceParam === 'creditor' ? balanceParam : undefined,
    overdue: first(params.overdue) === 'yes' || undefined,
    riskExceeded: first(params.risk) === 'exceeded' || undefined,
    status: statusParam === 'active' || statusParam === 'inactive' ? statusParam : undefined,
    page: Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    pageSize: CUSTOMER_ACCOUNT_PAGE_SIZE,
  };
}

export function buildCustomerAccountListHref(filters: CustomerAccountListFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.query) params.set('q', filters.query);
  if (filters.balance) params.set('balance', filters.balance);
  if (filters.overdue) params.set('overdue', 'yes');
  if (filters.riskExceeded) params.set('risk', 'exceeded');
  if (filters.status) params.set('status', filters.status);
  if (page > 1) params.set('page', String(page));

  const query = params.toString();
  return query ? `/admin/accounting?${query}` : '/admin/accounting';
}
