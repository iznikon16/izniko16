import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.error('Logout error:', error);
  }

  const response = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3006'));

  // Clear all known supabase cookies
  const cookiesToClear = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase-auth-token'
  ];

  cookiesToClear.forEach(cookieName => {
    response.cookies.delete(cookieName);
  });

  return response;
}
