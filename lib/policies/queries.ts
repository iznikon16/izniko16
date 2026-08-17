import 'server-only';

import type { PolicyPageRow } from '@/lib/catalog/types';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const policySelect = 'id, slug, title, summary, content_html, seo_title, seo_description, sort_order, is_published, published_at, created_at, updated_at';

export async function getPublishedPolicyPages(): Promise<PolicyPageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy_pages')
    .select(policySelect)
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getPublishedPolicyPage(slug: string): Promise<PolicyPageRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('policy_pages')
    .select(policySelect)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function getAdminPolicyPages(): Promise<PolicyPageRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('policy_pages')
    .select(policySelect)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAdminPolicyPage(slug: string): Promise<PolicyPageRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('policy_pages').select(policySelect).eq('slug', slug).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}
