import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';
import { getAdminSupabaseConfig } from '@/lib/supabase/config';

export function createAdminClient(): SupabaseClient<Database> {
  const { serviceRoleKey, url } = getAdminSupabaseConfig();
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
