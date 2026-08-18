'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCommercePrice } from '@/lib/commerce/format';

interface OrderTrendPoint {
  label: string;
  count: number;
  total: number;
}

interface AccountingTrendPoint {
  label: string;
  tahsilat: number;
  yeniBorc: number;
}

interface DashboardChartsProps {
  orderTrend: OrderTrendPoint[];
  accountingTrend: AccountingTrendPoint[];
  days: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = (props: any) => {
  const { active, payload, label, formatter } = props;
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-lg">
        <p className="mb-2 font-medium text-gray-900">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}:</span>
            <span className="font-semibold text-gray-900">
              {formatter ? formatter(Number(entry.value)) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

import { useRouter, useSearchParams } from 'next/navigation';

export function DashboardCharts({ orderTrend, accountingTrend }: Omit<DashboardChartsProps, 'days'>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDays = searchParams.get('days') || '7';

  const handleFilterChange = (val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val === '7') {
      params.delete('days');
    } else {
      params.set('days', val);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const formatYAxisPrice = (value: number) => {
    if (value >= 1000000) return `₺${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `₺${(value / 1000).toFixed(0)}k`;
    return `₺${value}`;
  };

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      {/* Sipariş Trafiği */}
      <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Sipariş Trafiği</h3>
            <p className="text-[11px] text-gray-500">{currentDays === '30' ? 'Aylık' : currentDays === '365' ? 'Yıllık' : 'Haftalık'} sipariş analizi</p>
          </div>
          <select 
            value={currentDays === '30' ? '30' : '7'}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none hover:bg-gray-50 cursor-pointer"
          >
            <option value="7">Haftalık</option>
            <option value="30">Aylık</option>
          </select>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={orderTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              <Line
                type="monotone"
                name="Sipariş Sayısı"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={orderTrend.length <= 7 ? { r: 4, fill: '#3b82f6', strokeWidth: 0 } : false}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tahsilat ve Cari Hareket */}
      <div className="flex flex-col rounded-[2rem] border border-[#cbd5e1]/60 bg-white p-5 shadow-sm shadow-[#cbd5e1]/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-gray-900">Tahsilat ve Cari Hareket</h3>
            <p className="text-[11px] text-gray-500">{currentDays === '30' ? 'Aylık' : currentDays === '365' ? 'Yıllık' : 'Haftalık'} tahsilat ve yeni borç trendi</p>
          </div>
          <select 
            value={currentDays === '30' ? '30' : '7'}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 outline-none hover:bg-gray-50 cursor-pointer"
          >
            <option value="7">Haftalık</option>
            <option value="30">Aylık</option>
          </select>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={accountingTrend} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                dy={10} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                tickFormatter={formatYAxisPrice}
              />
              <Tooltip content={<CustomTooltip formatter={(val: number) => formatCommercePrice(val)} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
              <Line
                type="monotone"
                name="Tahsilat (₺)"
                dataKey="tahsilat"
                stroke="#10b981"
                strokeWidth={2}
                dot={accountingTrend.length <= 7 ? { r: 4, fill: '#10b981', strokeWidth: 0 } : false}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
              />
              <Line
                type="monotone"
                name="Yeni Borç (₺)"
                dataKey="yeniBorc"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={accountingTrend.length <= 7 ? { r: 4, fill: '#3b82f6', strokeWidth: 0 } : false}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
