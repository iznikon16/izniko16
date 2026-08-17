import { requireAdminSession } from '@/lib/auth/admin';
import { getXmlSyncRuns, getXmlSyncErrors } from '@/lib/xml/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import type { XmlSourceRow } from '@/lib/catalog/types';

export const dynamic = 'force-dynamic';

export default async function XmlTransfersPage() {
  await requireAdminSession();
  const supabase = createAdminClient();
  const runs = await getXmlSyncRuns(50);

  const sourceIds = [...new Set(runs.map((r) => r.xml_source_id).filter(Boolean))] as string[];
  const { data: sources } = sourceIds.length
    ? await supabase.from('xml_sources').select('id, name').in('id', sourceIds)
    : { data: [] as Pick<XmlSourceRow, 'id' | 'name'>[] };
  const sourcesById = new Map((sources ?? []).map((s) => [s.id, s.name]));

  // En son error run'ları için hata detayları
  const errorRun = runs.find((r) => r.status === 'error');
  let errors = [] as Awaited<ReturnType<typeof getXmlSyncErrors>>;
  if (errorRun) {
    errors = await getXmlSyncErrors(errorRun.id);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">XML Aktarımları</h1>
        <p className="mt-1 text-gray-500">Senkronizasyon çalışma geçmişi ve hata logları.</p>
      </div>

      {/* Tablo */}
      <div className="overflow-hidden rounded-[2rem] border border-[#cbd5e1]/60 bg-white shadow-sm shadow-[#cbd5e1]/10">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Kaynak</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Toplam</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Yeni</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Güncel</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Başlangıç</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Bitiş</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Hata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {runs.map((run) => (
              <tr key={run.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {run.xml_source_id ? sourcesById.get(run.xml_source_id) || run.xml_source_id : '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      run.status === 'success'
                        ? 'rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600'
                        : run.status === 'running'
                          ? 'rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600'
                          : 'rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-600'
                    }
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{run.total_products}</td>
                <td className="px-4 py-3 text-right text-emerald-600">+{run.created_products}</td>
                <td className="px-4 py-3 text-right text-blue-600">~{run.updated_products}</td>
                <td className="px-4 py-3 text-right text-gray-500">{new Date(run.started_at).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-gray-500">{run.finished_at ? new Date(run.finished_at).toLocaleTimeString('tr-TR') : '—'}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-red-500">{run.error_message || '—'}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">Henüz senkronizasyon çalıştırılmamış.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hata detayları */}
      {errors.length > 0 && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-red-700">Son Çalışma Hataları ({errors.length})</h2>
          <div className="space-y-2">
            {errors.slice(0, 20).map((err) => (
              <div key={err.id} className="rounded-lg bg-red-50 p-3 text-xs">
                <span className="font-mono font-semibold text-red-700">{err.sku || '(SKU yok)'}</span>
                <span className="ml-2 text-red-600">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
