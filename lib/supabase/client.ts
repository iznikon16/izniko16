import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

export function createClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    console.warn('Supabase environment variables are not configured. Returning dummy mock client.');
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

  return createBrowserClient<Database>(supabaseUrl, publishableKey) as unknown as SupabaseClient<Database>;
}
