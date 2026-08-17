'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Calendar, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const FILTER_OPTIONS = [
  { label: 'Tüm Zamanlar', value: 'all' },
  { label: 'Bugün', value: '1' },
  { label: 'Son 7 Gün', value: '7' },
  { label: 'Son 30 Gün', value: '30' },
  { label: 'Bu Yıl', value: '365' },
];

export function DashboardToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  
  const currentDays = searchParams.get('days') || '7';
  const currentFilterLabel = FILTER_OPTIONS.find(opt => opt.value === currentDays)?.label || 'Son 7 Gün';
  
  const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleFilterChange = (days: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (days === '7') {
      params.delete('days'); // 7 is default
    } else {
      params.set('days', days);
    }
    router.push(`?${params.toString()}`);
  };

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportExcel = async () => {
    setIsExportMenuOpen(false);
    try {
      setIsExporting(true);
      
      const response = await fetch(`/api/export/dashboard?days=${currentDays}`);
      
      if (!response.ok) {
        throw new Error('Dışa aktarma başarısız oldu.');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-rapor-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Excel (CSV) Raporu başarıyla indirildi.');
    } catch (error: unknown) {
      toast.error('Hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportMenuOpen(false);
    try {
      setIsExporting(true);
      
      const response = await fetch(`/api/export/dashboard?days=${currentDays}`);
      
      if (!response.ok) {
        throw new Error('Veri alınamadı.');
      }
      
      const text = await response.text();
      // Remove BOM if exists for processing
      const cleanText = text.startsWith('\uFEFF') ? text.slice(1) : text;
      
      const rows = cleanText.split('\n').filter(line => line.trim().length > 0).map(line => line.split(','));
      
      const doc = new jsPDF();
      
      doc.addFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.setFont('Roboto');
      
      doc.setFontSize(18);
      doc.text('Dashboard Raporu', 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30);
      doc.text(`Filtre: ${currentFilterLabel}`, 14, 36);

      const yPos = 45;

      // Tablo
      autoTable(doc, {
        startY: yPos,
        head: [['Metrik', 'Değer']],
        body: rows.filter(r => r.length === 2 && r[0] !== 'METRIK_ADI' && r[0] !== 'TARIH'),
        theme: 'striped',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`dashboard-rapor-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Raporu başarıyla oluşturuldu.');
    } catch (error: unknown) {
      toast.error('Hata: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Button 
          variant="outline" 
          onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
          disabled={isExporting}
          className="gap-2 rounded-full font-semibold shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-all"
        >
          <Download className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
          {isExporting ? 'Aktarılıyor...' : 'Dışa Aktar'}
          <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
        </Button>
        
        {isExportMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
            <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5">
              <button
                onClick={handleExportPDF}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <FileText className="h-4 w-4" />
                PDF Olarak İndir
              </button>
              <button
                onClick={handleExportExcel}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel (CSV) İndir
              </button>
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
        <Button variant="ghost" className="h-8 gap-2 rounded-full px-3 text-sm font-medium hover:bg-gray-100 cursor-default pointer-events-none">
          <Calendar className="h-4 w-4 text-gray-500" />
          {today}
        </Button>
        
        <div className="h-4 w-[1px] bg-gray-200" />
        
        <div className="relative">
          <select
            value={currentDays}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="h-8 appearance-none bg-transparent gap-2 rounded-full px-3 text-sm font-medium hover:bg-gray-100 pr-8 cursor-pointer text-gray-700 focus:outline-none"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} className="text-gray-900 bg-white font-medium">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-2 h-4 w-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
