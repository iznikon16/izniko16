import type { NextRequest } from 'next/server';

type AddressResource = { id: number; name: string; postalCode?: string; postalCodeStatus?: string };
type ApiEnvelope = { data?: AddressResource[] };

const API_BASE = 'https://api.turkiyeapi.dev/v2';

function positiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get('resource');
  const parentId = positiveInteger(request.nextUrl.searchParams.get('parentId'));
  let endpoint: string;

  if (resource === 'provinces') endpoint = `${API_BASE}/provinces?fields=id,name&limit=100&sort=name`;
  else if (resource === 'districts' && parentId) endpoint = `${API_BASE}/provinces/${parentId}/districts`;
  else if (resource === 'neighborhoods' && parentId) endpoint = `${API_BASE}/districts/${parentId}/neighborhoods?limit=1000`;
  else return Response.json({ error: 'Geçersiz adres veri isteği.' }, { status: 400 });

  try {
    const response = await fetch(endpoint, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Address API HTTP ${response.status}`);
    const payload = await response.json() as ApiEnvelope;
    const items = (payload.data ?? [])
      .filter((item) => Number.isSafeInteger(item.id) && typeof item.name === 'string' && item.name.trim())
      .map((item) => ({ id: item.id, name: item.name.trim(), postalCode: item.postalCode ?? '' }));

    if (resource === 'provinces') {
      items.sort((left, right) => left.name === 'İstanbul' ? -1 : right.name === 'İstanbul' ? 1 : left.name.localeCompare(right.name, 'tr'));
    } else {
      items.sort((left, right) => left.name.localeCompare(right.name, 'tr'));
    }

    return Response.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } });
  } catch (error) {
    console.error('Address data fetch failed:', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Güncel adres verileri alınamadı.' }, { status: 502 });
  }
}
