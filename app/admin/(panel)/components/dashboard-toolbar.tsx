'use client';

import { useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { DashboardPeriod } from '@/lib/dashboard/filters';

const options: Array<{ value: DashboardPeriod; label: string }> = [
  { value: '7', label: 'Son 7 gün' },
  { value: '30', label: 'Son 30 gün' },
  { value: 'month', label: 'Bu ay' },
];

export function DashboardToolbar({ period, canExport }: { period: DashboardPeriod; canExport: boolean }) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const today = new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul',
  }).format(new Date());

  function changePeriod(value: DashboardPeriod) {
    router.push(value === '7' ? '/admin' : `/admin?days=${value}`);
  }

  async function exportCsv() {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/export/dashboard?days=${period}`);
      if (!response.ok) throw new Error('Rapor indirilemedi.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-raporu-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Dashboard raporu indirildi.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Rapor indirilemedi.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canExport && (
        <Button variant="outline" className="gap-2 rounded-xl" disabled={isExporting} onClick={exportCsv}>
          <Download className="h-4 w-4" />
          {isExporting ? 'Hazırlanıyor…' : 'CSV indir'}
        </Button>
      )}
      <div className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
        <CalendarDays className="h-4 w-4 text-slate-500" />
        <span className="hidden text-sm text-slate-600 sm:inline">{today}</span>
        <select
          aria-label="Dashboard dönemi"
          value={period}
          onChange={(event) => changePeriod(event.target.value as DashboardPeriod)}
          className="h-9 bg-transparent text-sm font-semibold text-slate-700 outline-none"
        >
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    </div>
  );
}
