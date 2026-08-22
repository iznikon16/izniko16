import { requireAdminSession } from '@/lib/auth/admin';
import { getXmlSyncRuns, getXmlSyncErrors } from '@/lib/xml/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import type { XmlSourceRow } from '@/lib/catalog/types';
import { CircleAlert, CircleCheckBig, DatabaseZap, Inbox } from 'lucide-react';

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
  const successfulRuns = runs.filter((run) => run.status === 'success').length;
  const failedRuns = runs.filter((run) => run.status === 'error').length;

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Entegrasyon</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">XML Aktarımları</h1><p className="mt-2 text-sm text-slate-500">Senkronizasyon çalışma geçmişini ve hata kayıtlarını takip edin.</p></header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Toplam Çalışma', value: runs.length, icon: DatabaseZap, tone: 'bg-sky-50 text-sky-500' },
          { label: 'Başarılı', value: successfulRuns, icon: CircleCheckBig, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Hatalı', value: failedRuns, icon: CircleAlert, tone: 'bg-rose-50 text-rose-600' },
        ].map((metric) => <article key={metric.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`grid size-12 place-items-center rounded-xl ${metric.tone}`}><metric.icon className="size-6" /></div><div><p className="text-sm text-slate-500">{metric.label}</p><p className="text-2xl font-semibold text-slate-950">{metric.value}</p></div></article>)}
      </section>

      {/* Tablo */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                          ? 'rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-500'
                          : 'rounded-full bg-rose-50 px-2 py-1 text-xs font-medium text-rose-600'
                    }
                  >
                    {run.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-600">{run.total_products}</td>
                <td className="px-4 py-3 text-right text-emerald-600">+{run.created_products}</td>
                <td className="px-4 py-3 text-right text-sky-500">~{run.updated_products}</td>
                <td className="px-4 py-3 text-right text-gray-500">{new Date(run.started_at).toLocaleString('tr-TR')}</td>
                <td className="px-4 py-3 text-right text-gray-500">{run.finished_at ? new Date(run.finished_at).toLocaleTimeString('tr-TR') : '—'}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-rose-500">{run.error_message || '—'}</td>
              </tr>
            ))}
            {runs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-20 text-center text-gray-500"><Inbox className="mx-auto mb-4 size-14 rounded-full bg-sky-50 p-3 text-sky-500" /><p className="font-medium text-slate-700">Henüz senkronizasyon çalıştırılmamış.</p></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Hata detayları */}
      {errors.length > 0 && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-semibold text-rose-700">Son Çalışma Hataları ({errors.length})</h2>
          <div className="space-y-2">
            {errors.slice(0, 20).map((err) => (
              <div key={err.id} className="rounded-lg bg-rose-50 p-3 text-xs">
                <span className="font-mono font-semibold text-rose-700">{err.sku || '(SKU yok)'}</span>
                <span className="ml-2 text-rose-600">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
