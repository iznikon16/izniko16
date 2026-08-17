'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/admin';
import { sanitizeProductHtml } from '@/lib/catalog/html';
import { createAdminClient } from '@/lib/supabase/admin';

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getInteger(formData: FormData, key: string, fallback: number) {
  const parsed = Number.parseInt(getText(formData, key), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function ensureAdmin() {
  await requireAdminSession();
  return createAdminClient();
}

export async function savePolicyPageAction(formData: FormData) {
  const supabase = await ensureAdmin();
  const slug = getText(formData, 'slug');
  const title = getText(formData, 'title');
  const contentHtml = sanitizeProductHtml(getText(formData, 'content_html'));
  const isPublished = formData.get('is_published') === 'on';

  if (!slug || !title || !contentHtml) {
    throw new Error('Slug, başlık ve içerik alanları zorunludur.');
  }

  const { error } = await supabase
    .from('policy_pages')
    .update({
      content_html: contentHtml,
      is_published: isPublished,
      published_at: isPublished ? new Date().toISOString() : null,
      seo_description: getText(formData, 'seo_description') || null,
      seo_title: getText(formData, 'seo_title') || null,
      sort_order: getInteger(formData, 'sort_order', 0),
      summary: getText(formData, 'summary'),
      title,
    })
    .eq('slug', slug);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/politikalar');
  revalidatePath(`/politikalar/${slug}`);
  revalidatePath('/admin/policies');
  revalidatePath(`/admin/policies/${slug}`);
  redirect(`/admin/policies/${slug}?saved=1`);
}
