import { getAdminPermissionKeys, getAdminSession } from '@/lib/auth/admin';
import { normalizeAdminSearchQuery, searchAdminGlobal } from '@/lib/admin/global-search';
import { checkRateLimit } from '@/lib/security/rate-limit';

const JSON_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return Response.json({ error: 'Oturum gerekli.' }, { status: 401, headers: JSON_HEADERS });

  const rateLimit = checkRateLimit(`admin-global-search:${session.user.id}`, 60, 60_000);
  if (!rateLimit.success) {
    return Response.json({ error: 'Çok fazla arama yapıldı. Lütfen kısa süre sonra tekrar deneyin.' }, {
      status: 429,
      headers: { ...JSON_HEADERS, 'Retry-After': String(rateLimit.retryAfter ?? 1) },
    });
  }

  const query = normalizeAdminSearchQuery(new URL(request.url).searchParams.get('q'));
  if (query.length < 2) return Response.json({ query, results: [] }, { headers: JSON_HEADERS });

  try {
    const permissions = await getAdminPermissionKeys(session);
    const response = await searchAdminGlobal(query, permissions);
    return Response.json(response, { headers: JSON_HEADERS });
  } catch {
    return Response.json({ error: 'Arama şu anda tamamlanamadı.' }, { status: 500, headers: JSON_HEADERS });
  }
}
