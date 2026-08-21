import { summarizeTransactions } from '@/lib/accounting/queries';
import type { AccountTransactionRow, CustomerAccountRow } from '@/lib/catalog/types';

function transaction(overrides: Partial<AccountTransactionRow>): AccountTransactionRow {
  return {
    id: crypto.randomUUID(),
    customer_id: '11111111-1111-4111-8111-111111111111',
    type: 'ADJUSTMENT',
    debit: 0,
    credit: 0,
    amount: 0,
    balance_after: 0,
    order_id: null,
    payment_id: null,
    due_date: null,
    description: '',
    reference: '',
    actor_user_id: null,
    is_reversal: false,
    reversed_transaction_id: null,
    idempotency_key: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function account(overrides: Partial<CustomerAccountRow> = {}): CustomerAccountRow {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    customer_id: '11111111-1111-4111-8111-111111111111',
    risk_limit: 200,
    risk_policy: 'warn',
    risk_warning_threshold: 80,
    overdue_balance: 0,
    payment_term_days: 0,
    last_transaction_at: null,
    last_payment_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('central account summary formula', () => {
  it('calculates balance as total debit minus total credit', () => {
    const summary = summarizeTransactions([
      transaction({ type: 'ORDER', debit: 100, amount: 100 }),
      transaction({ type: 'PARTIAL_PAYMENT', credit: 30, amount: 30 }),
    ], account());

    expect(summary.totalDebit).toBe(100);
    expect(summary.totalCredit).toBe(30);
    expect(summary.balance).toBe(70);
    expect(summary.availableLimit).toBe(130);
  });

  it('keeps history while a reversal neutralizes the original movement', () => {
    const originalId = '33333333-3333-4333-8333-333333333333';
    const summary = summarizeTransactions([
      transaction({ id: originalId, type: 'ORDER', debit: 125.5, amount: 125.5 }),
      transaction({
        type: 'CANCELLATION',
        credit: 125.5,
        amount: 125.5,
        is_reversal: true,
        reversed_transaction_id: originalId,
      }),
    ], account());

    expect(summary.totalDebit).toBe(125.5);
    expect(summary.totalCredit).toBe(125.5);
    expect(summary.balance).toBe(0);
  });

  it('separates overdue debit and rounds monetary values', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const summary = summarizeTransactions([
      transaction({ debit: 10.555, amount: 10.555, due_date: yesterday }),
      transaction({ debit: 20, amount: 20, due_date: tomorrow }),
    ], account({ risk_limit: 25 }));

    expect(summary.balance).toBe(30.56);
    expect(summary.overdueBalance).toBe(10.56);
    expect(summary.availableLimit).toBe(-5.56);
  });
});
