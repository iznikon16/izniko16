import { getVisiblePageNumbers, parsePageParam } from '@/lib/pagination';
import { buildManualStockChangeArgs } from '@/lib/stock/queries';

describe('admin pagination helpers', () => {
  it('normalizes invalid page values', () => {
    expect(parsePageParam(undefined)).toBe(1);
    expect(parsePageParam('-3')).toBe(1);
    expect(parsePageParam('abc')).toBe(1);
    expect(parsePageParam(['4', '9'])).toBe(4);
  });

  it('keeps first, last and nearby page numbers visible', () => {
    expect(getVisiblePageNumbers(6, 12)).toEqual([1, 5, 6, 7, 12]);
    expect(getVisiblePageNumbers(1, 12)).toEqual([1, 2, 3, 12]);
    expect(getVisiblePageNumbers(12, 12)).toEqual([1, 10, 11, 12]);
  });

  it('always sends the nullable order argument to the stock RPC', () => {
    expect(buildManualStockChangeArgs({
      actorUserId: '00000000-0000-0000-0000-000000000001',
      idempotencyKey: 'stock-in:test',
      productId: '00000000-0000-0000-0000-000000000002',
      quantityChange: 3,
      reference: 'test',
      type: 'manual_in',
    })).toMatchObject({
      p_actor_user_id: '00000000-0000-0000-0000-000000000001',
      p_order_id: null,
      p_quantity_change: 3,
    });
  });
});
