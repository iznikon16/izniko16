import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSafeCustomerRedirectPath } from '@/lib/auth/safe-redirect';
import {
  isProtectedAdminPath as matchesProtectedAdminPath,
  isProtectedCustomerPath as matchesProtectedCustomerPath,
} from '@/lib/auth/session-policy';

function copyResponseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
}

function getCustomerLoginUrl(request: NextRequest) {
  const loginUrl = new URL('/giris', request.url);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('next', getSafeCustomerRedirectPath(requestedPath));
  return loginUrl;
}

export async function updateSession(request: NextRequest) {
  const isProtectedAdminPath = matchesProtectedAdminPath(request.nextUrl.pathname);
  const isProtectedCustomerPath = matchesProtectedCustomerPath(request.nextUrl.pathname);
  let response = NextResponse.next({
    request,
  });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!supabaseUrl || !publishableKey) {
    console.warn('Supabase environment variables are not configured in updateSession. Skipping session update.');
    if (isProtectedAdminPath) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
    if (isProtectedCustomerPath) {
      return NextResponse.redirect(getCustomerLoginUrl(request));
    }
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.warn('Supabase auth error in middleware:', error instanceof Error ? error.message : error);
  }

  if (isProtectedAdminPath && !user) {
    const redirectResponse = NextResponse.redirect(new URL('/admin/login', request.url));
    copyResponseCookies(response, redirectResponse);
    redirectResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return redirectResponse;
  }

  if (isProtectedCustomerPath && !user) {
    const redirectResponse = NextResponse.redirect(getCustomerLoginUrl(request));
    copyResponseCookies(response, redirectResponse);
    redirectResponse.headers.set('Cache-Control', 'private, no-store, max-age=0');
    return redirectResponse;
  }

  if (
    isProtectedAdminPath ||
    isProtectedCustomerPath ||
    request.nextUrl.pathname === '/admin/login' ||
    request.nextUrl.pathname === '/giris'
  ) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }

  return response;
}
