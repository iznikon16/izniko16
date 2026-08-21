import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const destination = new URL('/sifre-yenile', request.url);

  if (!code) {
    destination.searchParams.set('hata', 'gecersiz');
    return NextResponse.redirect(destination);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) destination.searchParams.set('hata', 'gecersiz');

  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return response;
}
