import Link from 'next/link';
import { Eye, EyeOff, FilePlus2, FileText, RefreshCw, ShieldCheck } from 'lucide-react';
import { getAdminPolicyPages } from '@/lib/policies/queries';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' });

export default async function AdminPoliciesPage() {
  const policies = await getAdminPolicyPages();
  const publishedCount = policies.filter((policy) => policy.is_published).length;

  return (
    <section className="rounded-[2rem] border border-[#cbd5e1] bg-white/95 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-8">
      <header className="grid gap-6 border-b border-[#cbd5e1] pb-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0284c7]">Yasal Sayfalar</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Politika ve sözleşmeler</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">KVKK, gizlilik, çerez, mesafeli satış, ön bilgilendirme, iade ve teslimat metinlerini buradan düzenleyebilirsiniz.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Toplam" value={policies.length} />
          <Metric label="Yayında" value={publishedCount} />
          <Link href="/admin/policies/new" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0ea5e9] px-5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#0284c7] hover:shadow-md sm:col-span-2"><FilePlus2 className="size-5" /> Yeni Politika</Link>
        </div>
      </header>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[#cbd5e1]">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"><tr><th className="px-5 py-4">Politika</th><th className="px-5 py-4">Tür</th><th className="px-5 py-4">Son güncelleme</th><th className="px-5 py-4">Durum</th><th className="px-5 py-4 text-right">İşlemler</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            {policies.map((policy) => (
              <tr key={policy.id} className="bg-white">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-sky-50 text-sky-500"><FileText className="size-5" /></span><div><p className="font-medium text-slate-900">{policy.title}</p><p className="mt-1 text-xs text-slate-500">{policy.summary}</p></div></div></td>
                <td className="px-5 py-4 text-slate-600">{policy.slug}</td>
                <td className="px-5 py-4 text-slate-600">{dateFormatter.format(new Date(policy.updated_at))}</td>
                <td className="px-5 py-4"><span className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium ${policy.is_published ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{policy.is_published ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}{policy.is_published ? 'Yayında' : 'Kapalı'}</span></td>
                <td className="px-5 py-4 text-right"><Link href={`/admin/policies/${policy.slug}`} className="inline-flex rounded-lg border border-sky-400 bg-white px-4 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50">Düzenle</Link></td>
              </tr>
            ))}
            {policies.length === 0 ? <tr><td colSpan={5} className="px-5 py-24 text-center"><ShieldCheck className="mx-auto size-24 text-slate-300" /><h2 className="mt-5 text-2xl font-semibold text-slate-950">Politika kaydı bulunamadı.</h2><p className="mt-2 text-sm text-slate-500">Yeni bir politika oluşturabilir veya veritabanı durumunu yenileyebilirsiniz.</p><Link href="/admin/policies" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-sky-500 bg-white px-5 py-3 text-sm font-medium text-sky-600 hover:bg-sky-50"><RefreshCw className="size-4" /> Durumu Yenile</Link></td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-[#cbd5e1] bg-[#e8edf4] px-5 py-4"><p className="text-xs font-medium uppercase tracking-[0.1em] text-[#475569]">{label}</p><p className="mt-2 text-2xl font-semibold text-[#020617]">{value}</p></div>;
}
