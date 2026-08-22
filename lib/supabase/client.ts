import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getPublicSupabaseConfig } from '@/lib/supabase/config';

export function createClient(): SupabaseClient<Database> {
  const { publishableKey, url } = getPublicSupabaseConfig();
  return createBrowserClient<Database>(url, publishableKey) as unknown as SupabaseClient<Database>;
}
