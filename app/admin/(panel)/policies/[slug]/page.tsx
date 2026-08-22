import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, Save, ShieldCheck } from 'lucide-react';
import { savePolicyPageAction } from '@/app/admin/(panel)/policies/actions';
import { RichTextEditor } from '@/components/admin/rich-text-editor';
import { getAdminPolicyPage } from '@/lib/policies/queries';

export const dynamic = 'force-dynamic';

type AdminPolicyEditPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function AdminPolicyEditPage({ params, searchParams }: AdminPolicyEditPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = (searchParams ? await searchParams : {}) ?? {};
  const saved = getSingleParam(resolvedSearchParams.saved);
  const policy = await getAdminPolicyPage(slug);

  if (!policy) {
    notFound();
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <Link href="/admin/policies" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 transition-colors hover:text-gray-900">
              <ArrowLeft className="h-4 w-4" />
              Politikalara dön
            </Link>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.28em] text-blue-600">{policy.slug}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-gray-900">{policy.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">Bu sayfada yapılan değişiklikler public politika sayfasına yansır.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/politikalar/${policy.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Yayında gör
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {saved ? (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Politika sayfası kaydedildi.
          </div>
        ) : null}

        <form action={savePolicyPageAction} className="mt-6 grid gap-4">
          <input type="hidden" name="slug" value={policy.slug} />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-600">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">İçerik</p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-gray-900">Sayfa metni</h3>
                  <p className="mt-1 text-sm leading-6 text-gray-500">Başlık ve içerik public sayfada doğrudan gösterilir.</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Başlık</span>
                  <input name="title" defaultValue={policy.title} required className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none" />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Özet</span>
                  <textarea name="summary" rows={3} defaultValue={policy.summary} className="rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none" />
                </label>

                <label className="grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">HTML içerik</span>
                  <RichTextEditor name="content_html" initialValue={policy.content_html} />
                </label>
              </div>
            </section>

            <aside className="grid content-start gap-4">
              <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">Yayın</p>
                <label className="mt-4 flex items-center gap-3 rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600">
                  <input name="is_published" type="checkbox" defaultChecked={policy.is_published} className="h-4 w-4 accent-brand-orange" />
                  Sayfayı yayında tut
                </label>
                <label className="mt-4 grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Sıralama</span>
                  <input name="sort_order" type="number" defaultValue={policy.sort_order} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none" />
                </label>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600">SEO</p>
                <label className="mt-4 grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">SEO başlık</span>
                  <input name="seo_title" defaultValue={policy.seo_title ?? ''} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none" />
                </label>
                <label className="mt-4 grid gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">SEO açıklama</span>
                  <textarea name="seo_description" rows={4} defaultValue={policy.seo_description ?? ''} className="rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none" />
                </label>
              </section>

              <button type="submit" className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_5px_12px_rgba(14,165,233,0.22)] transition-all hover:-translate-y-px hover:bg-sky-600 hover:shadow-[0_7px_16px_rgba(14,165,233,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2">
                <Save className="h-4 w-4" />
                Kaydet
              </button>
            </aside>
          </div>
        </form>
      </section>
    </div>
  );
}
