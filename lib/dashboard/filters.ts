export const DASHBOARD_PERIODS = ['7', '30', 'month'] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export type DashboardDateRange = {
  period: DashboardPeriod;
  days: number;
  fromDate: string;
  toDate: string;
  fromInclusive: string;
  toExclusive: string;
};

export function toIstanbulDateKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

export function parseDashboardPeriod(value: string | string[] | null | undefined): DashboardPeriod {
  const candidate = Array.isArray(value) ? value[0] : value;
  return DASHBOARD_PERIODS.includes(candidate as DashboardPeriod) ? candidate as DashboardPeriod : '7';
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function getDashboardDateRange(period: DashboardPeriod, now = new Date()): DashboardDateRange {
  const toDate = toIstanbulDateKey(now);
  const days = period === 'month' ? Number(toDate.slice(8, 10)) : Number(period);
  const fromDate = period === 'month' ? `${toDate.slice(0, 7)}-01` : addDays(toDate, -(days - 1));
  const nextDate = addDays(toDate, 1);
  return {
    period,
    days,
    fromDate,
    toDate,
    fromInclusive: `${fromDate}T00:00:00+03:00`,
    toExclusive: `${nextDate}T00:00:00+03:00`,
  };
}

export function getIstanbulTodayBounds(now = new Date()) {
  const range = getDashboardDateRange('7', now);
  return {
    fromInclusive: `${range.toDate}T00:00:00+03:00`,
    toExclusive: `${addDays(range.toDate, 1)}T00:00:00+03:00`,
  };
}
