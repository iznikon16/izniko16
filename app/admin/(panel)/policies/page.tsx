import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, FileText, ShieldCheck } from 'lucide-react';
import { getAdminPolicyPages } from '@/lib/policies/queries';

export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
});

export default async function AdminPoliciesPage() {
  const policies = await getAdminPolicyPages();
  const publishedCount = policies.filter((policy) => policy.is_published).length;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">Yasal Sayfalar</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">Politika ve sözleşmeler</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
              KVKK, gizlilik, çerez, mesafeli satış, ön bilgilendirme, iade ve teslimat metinlerini buradan düzenleyebilirsiniz.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Toplam</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{policies.length}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Yayında</p>
              <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900">{publishedCount}</p>
            </div>
          </div>
        </div>

        {policies.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white/[0.025] px-5 py-14 text-center">
            <ShieldCheck className="mx-auto h-9 w-9 text-gray-500" />
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-gray-900">Politika kaydı bulunamadı.</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-gray-500">Migration çalıştırıldığında varsayılan politika kayıtları otomatik oluşur.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-3">
            {policies.map((policy) => (
              <Link
                key={policy.id}
                href={`/admin/policies/${policy.slug}`}
                className="group grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-5 transition-colors hover:border-gray-300 hover:bg-white/[0.055] lg:grid-cols-[minmax(0,1fr)_170px_120px]"
              >
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-600">{policy.slug}</span>
                    <span className="mt-1 block text-xl font-semibold tracking-[-0.04em] text-gray-900">{policy.title}</span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-6 text-gray-500">{policy.summary}</span>
                  </span>
                </div>

                <span className="flex items-center gap-2 text-sm text-gray-500 lg:justify-end">
                  Son güncelleme {dateFormatter.format(new Date(policy.updated_at))}
                </span>

                <span className="flex items-center justify-between gap-3 lg:justify-end">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${policy.is_published ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                    {policy.is_published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {policy.is_published ? 'Yayında' : 'Kapalı'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-500 transition-transform group-hover:translate-x-1 group-hover:text-gray-900" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
