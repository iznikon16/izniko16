import { getDashboardDateRange, getIstanbulTodayBounds, parseDashboardPeriod, toIstanbulDateKey } from '@/lib/dashboard/filters';

describe('dashboard filters', () => {
  const now = new Date('2026-08-22T21:30:00.000Z');

  it('uses Istanbul calendar day', () => {
    expect(toIstanbulDateKey(now)).toBe('2026-08-23');
    expect(getIstanbulTodayBounds(now)).toEqual({
      fromInclusive: '2026-08-23T00:00:00+03:00',
      toExclusive: '2026-08-24T00:00:00+03:00',
    });
  });

  it('accepts only supported periods', () => {
    expect(parseDashboardPeriod('30')).toBe('30');
    expect(parseDashboardPeriod('month')).toBe('month');
    expect(parseDashboardPeriod('all')).toBe('7');
  });

  it('builds inclusive monthly range', () => {
    expect(getDashboardDateRange('month', new Date('2026-08-22T09:00:00Z'))).toMatchObject({
      days: 22, fromDate: '2026-08-01', toDate: '2026-08-22',
      fromInclusive: '2026-08-01T00:00:00+03:00', toExclusive: '2026-08-23T00:00:00+03:00',
    });
  });
});
