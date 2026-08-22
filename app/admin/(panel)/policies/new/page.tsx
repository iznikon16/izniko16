import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { savePolicyPageAction } from '@/app/admin/(panel)/policies/actions';
import { RichTextEditor } from '@/components/admin/rich-text-editor';

export default function NewPolicyPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <Link href="/admin/policies" className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-800"><ArrowLeft className="size-4" /> Politikalara dön</Link>
      <header className="mt-5 border-b border-slate-200 pb-5"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500">Yasal Sayfalar</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Yeni Politika Oluştur</h1></header>
      <form action={savePolicyPageAction} className="mt-6 grid gap-5">
        <div className="grid gap-4 md:grid-cols-2"><Field label="Başlık"><input name="title" required className={inputClass} /></Field><Field label="URL anahtarı"><input name="slug" required placeholder="ornek-politika" className={inputClass} /></Field></div>
        <Field label="Özet"><textarea name="summary" rows={3} className={`${inputClass} min-h-24 py-3`} /></Field>
        <Field label="İçerik"><RichTextEditor name="content_html" initialValue="<p></p>" /></Field>
        <div className="grid gap-4 md:grid-cols-2"><Field label="SEO başlığı"><input name="seo_title" className={inputClass} /></Field><Field label="Sıra"><input name="sort_order" type="number" defaultValue={0} className={inputClass} /></Field></div>
        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_published" className="size-4 accent-sky-500" /> Yayında göster</label>
        <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-sky-500 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-600"><Save className="size-4" /> Politikayı Kaydet</button>
      </form>
    </section>
  );
}

const inputClass = 'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{children}</label>; }
