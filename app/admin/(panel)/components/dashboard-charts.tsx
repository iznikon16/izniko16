'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCommercePrice } from '@/lib/commerce/format';
import type { DashboardPeriod } from '@/lib/dashboard/filters';

type TooltipEntry = { color?: string; name?: string; value?: number | string };

function ChartTooltip({ active, payload, label, moneyKeys = [] }: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  moneyKeys?: string[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
      <p className="mb-2 font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-900">
            {moneyKeys.includes(entry.name ?? '') ? formatCommercePrice(Number(entry.value)) : Number(entry.value).toLocaleString('tr-TR')}
          </span>
        </div>
      ))}
    </div>
  );
}

const periodLabels: Record<DashboardPeriod, string> = {
  '7': 'Son 7 gün',
  '30': 'Son 30 gün',
  month: 'Bu ay',
};

const compactPrice = (value: number) => new Intl.NumberFormat('tr-TR', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value);

export function DashboardCharts({ orderTrend, accountingTrend, period }: {
  orderTrend: Array<{ label: string; count: number; total: number }>;
  accountingTrend: Array<{ label: string; tahsilat: number; yeniBorc: number }>;
  period: DashboardPeriod;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-bold text-slate-900">Sipariş trafiği</h2>
        <p className="mb-5 text-xs text-slate-500">{periodLabels[period]} için sipariş adedi ve tutarı</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={orderTrend} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis yAxisId="count" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis yAxisId="money" orientation="right" axisLine={false} tickLine={false} tickFormatter={compactPrice} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<ChartTooltip moneyKeys={['Sipariş tutarı']} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="count" type="monotone" name="Sipariş adedi" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={orderTrend.length <= 7} />
              <Line yAxisId="money" type="monotone" name="Sipariş tutarı" dataKey="total" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-bold text-slate-900">Tahsilat ve cari hareket</h2>
        <p className="mb-5 text-xs text-slate-500">{periodLabels[period]} için tahsilat ve yeni borç trendi</p>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accountingTrend} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={compactPrice} tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip content={<ChartTooltip moneyKeys={['Tahsilat', 'Yeni borç']} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" name="Tahsilat" dataKey="tahsilat" stroke="#10b981" strokeWidth={2} dot={accountingTrend.length <= 7} />
              <Line type="monotone" name="Yeni borç" dataKey="yeniBorc" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
