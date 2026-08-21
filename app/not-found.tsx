import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900 px-4">
      <div className="text-center space-y-6 max-w-md w-full p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-6xl font-bold text-sky-600">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-800">Sayfa Bulunamadı</h2>
          <p className="text-gray-500 text-sm">
            Aradığınız sayfa silinmiş, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
          </p>
        </div>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-sky-600 text-white rounded-xl font-medium transition-all hover:bg-sky-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
