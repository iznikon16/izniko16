import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase admin environment variables are not configured. Returning dummy mock client.');
    const dummyClient = new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'auth') {
          return {
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
            signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
            signOut: () => Promise.resolve({ error: null }),
          };
        }

        if (prop === 'storage') {
          return {
            from: () => ({
              getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
              upload: () => Promise.resolve({ data: null, error: null }),
              remove: () => Promise.resolve({ data: null, error: null }),
            }),
          };
        }

        const queryHandler = () => {
          const queryBuilder = new Proxy({} as any, {
            get(innerTarget, innerProp) {
              if (innerProp === 'then') {
                return (resolve: any) => resolve({ data: [], error: null });
              }
              return () => queryBuilder;
            },
          });
          return queryBuilder;
        };

        return queryHandler;
      },
    });
    return dummyClient as unknown as SupabaseClient<Database>;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
