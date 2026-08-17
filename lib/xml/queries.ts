import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/lib/supabase/database.types';
import type { XmlFieldMappingRow, XmlSourceRow, XmlSyncRunRow, XmlTargetField } from '@/lib/catalog/types';
import { slugify } from '@/lib/catalog/utils';

/**
 * XML entegrasyonu. Çoklu kaynak, field mapping ve sync motoru içerir.
 * Güvenlik: XML'i başka tedarikçi XML'lerine karşı güvenli ayrıştırır (XXE korumalı),
 * SSRF'e karşı kaynak URL doğrulanır.
 */

export type XmlSourceWithMappings = XmlSourceRow & {
  mappings: XmlFieldMappingRow[];
};

const XXE_UNSAFE = ['<!doctype', '<!entity'];
const SSRF_BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal'];
const SSRF_BLOCKED_IPS = ['10.', '192.168.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];

export async function getXmlSources(): Promise<XmlSourceWithMappings[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('xml_sources')
    .select('*, xml_field_mappings(*)')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((source) => ({
    ...source,
    mappings: (Array.isArray(source.xml_field_mappings) ? source.xml_field_mappings : []) as XmlFieldMappingRow[],
  })) as XmlSourceWithMappings[];
}

export async function getXmlSource(id: string): Promise<XmlSourceWithMappings | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('xml_sources')
    .select('*, xml_field_mappings(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    ...data,
    mappings: (Array.isArray(data.xml_field_mappings) ? data.xml_field_mappings : []) as XmlFieldMappingRow[],
  } as XmlSourceWithMappings;
}

export async function getXmlSyncRuns(limit = 50): Promise<XmlSyncRunRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('xml_sync_runs').select('*').order('started_at', { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as XmlSyncRunRow[];
}

export async function getXmlSyncErrors(runId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('xml_sync_errors').select('*').eq('xml_sync_run_id', runId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export function validateXmlUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Geçerli bir XML URL girin.');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('XML kaynağı yalnızca http/https olabilir.');
  }
  const host = url.hostname.replace(/^www\./i, '').toLowerCase();
  if (SSRF_BLOCKED_HOSTS.includes(host)) {
    throw new Error('Bu URL adresine erişime izin verilmez.');
  }
  if (SSRF_BLOCKED_IPS.some((prefix) => host.startsWith(prefix))) {
    throw new Error('Özel/güvenli olmayan ağ adreslerine erişime izin verilmez.');
  }
  return url.toString();
}

export async function fetchAndParseXml(source: XmlSourceWithMappings): Promise<Record<string, unknown>[]> {
  const url = validateXmlUrl(source.url);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Izniko-XML-Sync/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`XML indirilemedi (HTTP ${response.status}).`);
  }

  const rawText = await response.text();

  // XXE koruması
  const lower = rawText.toLowerCase();
  if (XXE_UNSAFE.some((marker) => lower.includes(marker))) {
    throw new Error('XML içeriği güvenli değil (DOCTYPE/ENTITY tespit edildi).');
  }

  // Basit XML -> JSON dönüşümü. Döngüsel DTD veya entity içermemeli.
  return parseFlatXmlToRecords(rawText);
}

/**
 * Düz (flat) XML'i kayıt dizisine çevirir. TradeItem/Product/Item benzeri
 * tekrar eden elemanları bulur. Tedarikçiye özgü olmayan genel bir çözüm.
 */
function parseFlatXmlToRecords(xml: string): Record<string, unknown>[] {
  // <root> içindeki tekrarlanan blokları tespit etmek için regex tabanlı basit çözüm.
  // İlk element adını bul
  const rootMatch = xml.trim().match(/<([a-zA-Z_][\w:.-]*)/);
  if (!rootMatch) return [];

  const rootTag = rootMatch[1];
  const closeEscape = rootTag.includes(':') ? rootTag.replace(':', '\\:') : rootTag;
  const bodyMatch = xml.match(new RegExp(`<${closeEscape}[^>]*>([\\\s\\S]*?)<\\/${closeEscape}>`, 'i'));
  const body = bodyMatch?.[1] ?? xml;

  // Tekrarlayan blokları bul
  const blockPattern = /<([a-zA-Z_][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  const blocks: Array<{ tag: string; inner: string }> = [];
  let m: RegExpExecArray | null;
  const leafBlocks = new Map<string, number>();

  while ((m = blockPattern.exec(body)) !== null) {
    const tag = m[1];
    const inner = m[2];
    // Yalnızca alt element içeren (leaf olmayan) bloklar tekrar eden kayıt olabilir
    const hasChildren = /<[a-zA-Z_]/.test(inner);
    if (hasChildren) {
      blocks.push({ tag, inner });
      leafBlocks.set(tag, (leafBlocks.get(tag) ?? 0) + 1);
    }
  }

  // En çok tekrar eden blok = ürün kaydı
  let recordTag = '';
  let maxCount = 0;
  for (const [tag, count] of leafBlocks) {
    if (count > maxCount) {
      maxCount = count;
      recordTag = tag;
    }
  }

  if (!recordTag) {
    return [];
  }

  const recordPattern = new RegExp(`<${recordTag.replace(':', '\\:')}[^>]*>([\\\s\\S]*?)<\\/${recordTag.replace(':', '\\:')}>`, 'g');
  const records: Record<string, unknown>[] = [];
  let rm: RegExpExecArray | null;

  while ((rm = recordPattern.exec(body)) !== null) {
    records.push(parseLeafElements(rm[1]));
  }

  return records;
}

function parseLeafElements(inner: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const pattern = /<([a-zA-Z_][\w:.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;

  while ((m = pattern.exec(inner)) !== null) {
    const tag = m[1].split(':').pop() ?? m[1];
    const value = m[2].trim();
    // Alt element içermiyorsa leaf
    if (!/<[a-zA-Z_]/.test(value)) {
      result[tag] = value;
    }
  }

  return result;
}

/**
 * Synclenmiş kayıdı ürün alanlarına map eder ve database'e uygular.
 */
async function applyRecordToProduct(
  record: Record<string, unknown>,
  mappings: XmlFieldMappingRow[],
  markupPercent: number
): Promise<{ created: boolean }> {
  const supabase = createAdminClient();

  const get = (target: XmlTargetField) => {
    const mapping = mappings.find((m) => m.target_field === target);
    if (!mapping) return null;
    const value = String(record[mapping.source_field] ?? '').trim();
    return value || null;
  };

  const sku = get('sku');
  const name = get('name');
  const priceRaw = get('price');
  const retailRaw = get('retail_price');
  const stockRaw = get('stock');
  const image = get('image');
  const brandName = get('brand');

  if (!sku) return { created: false };

  const price = priceRaw ? Number(String(priceRaw).replace(',', '.')) : null;
  const markupPrice = price != null && !Number.isNaN(price) ? Math.round(price * (1 + markupPercent / 100) * 100) / 100 : null;
  const stockQuantity = stockRaw ? Math.max(0, Math.floor(Number(stockRaw) || 0)) : null;

  // Mevcut ürünü SKU ile bul
  const { data: existing } = await supabase.from('products').select('id').eq('sku', sku).maybeSingle();

  type DbProductUpdate = Database['public']['Tables']['products']['Update'];
  const payload: DbProductUpdate = {};

  if (name) payload.title = name;
  if (markupPrice != null && !Number.isNaN(markupPrice)) {
    payload.price = markupPrice;
    payload.price_mode = 'fixed';
  }
  if (stockQuantity != null) {
    payload.stock_quantity = stockQuantity;
    payload.stock_status = stockQuantity <= 0 ? 'out_of_stock' : 'in_stock';
  }
  if (image) payload.featured_image_path = image;
  if (brandName) {
    // Marka yoksa oluştur
    const slug = slugify(brandName);
    const { data: brand } = await supabase.from('brands').select('id').eq('slug', slug).maybeSingle();
    if (brand) {
      payload.brand_id = brand.id;
    } else {
      const { data: newBrand } = await supabase.from('brands').insert({ name: brandName, slug }).select('id').single();
      if (newBrand) payload.brand_id = newBrand.id;
    }
  }

  if (existing) {
    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('products').update(payload).eq('id', existing.id);
      if (error) throw new Error(error.message);
    }
    return { created: false };
  }

  type DbProductInsert = Database['public']['Tables']['products']['Insert'];
  const insertPayload: DbProductInsert = {
    sku,
    slug: slugify(name || sku) || `urun-${sku}`,
    title: name || sku,
    summary: String(get('description') ?? '').slice(0, 300) || '',
    body: get('description') ?? '',
    status: 'published',
    is_active: true,
    currency: 'TRY',
  };

  // Dinamik alanları ekle
  if (payload.title) insertPayload.title = payload.title as typeof insertPayload.title;
  if (payload.price != null) {
    insertPayload.price = payload.price;
    insertPayload.price_mode = 'fixed';
  }
  if (payload.stock_quantity != null) insertPayload.stock_quantity = payload.stock_quantity;
  if (payload.stock_status) insertPayload.stock_status = payload.stock_status;
  if (payload.featured_image_path) insertPayload.featured_image_path = payload.featured_image_path;
  if (payload.brand_id) insertPayload.brand_id = payload.brand_id;

  const { error: insertError, data: created } = await supabase
    .from('products')
    .insert(insertPayload)
    .select('id')
    .maybeSingle();

  if (insertError) {
    // Unique slug çakışmasında benzersiz ekle
    if (insertError.code === '23505') {
      const { error } = await supabase
        .from('products')
        .insert({ ...insertPayload, slug: `${insertPayload.slug}-${sku}` })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
    } else {
      throw new Error(insertError.message);
    }
  }

  return { created: true };
}

/**
 * Bir XML kaynağını senkronize eder. Idempotent sayılır (sync run kaydı).
 */
export async function syncXmlSource(sourceId: string): Promise<XmlSyncRunRow> {
  const supabase = createAdminClient();
  const source = await getXmlSource(sourceId);

  if (!source) {
    throw new Error('XML kaynağı bulunamadı.');
  }

  const { data: run, error: runError } = await supabase
    .from('xml_sync_runs')
    .insert({ xml_source_id: source.id, status: 'running' })
    .select()
    .single();
  if (runError) throw new Error(runError.message);

  const runId = run.id as string;

  await supabase.from('xml_sources').update({ last_status: 'running', last_run_at: new Date().toISOString() }).eq('id', source.id);

  let created = 0;
  let updated = 0;
  let total = 0;

  try {
    const records = await fetchAndParseXml(source);
    total = records.length;

    for (const record of records) {
      try {
        const result = await applyRecordToProduct(record, source.mappings, source.price_markup);
        if (result.created) created++;
        else updated++;
      } catch (err) {
        await supabase.from('xml_sync_errors').insert({
          xml_sync_run_id: runId,
          sku: String(record?.sku ?? ''),
          message: err instanceof Error ? err.message : 'Bilinmeyen hata',
          raw_data: JSON.stringify(record),
        });
        total--; // hatalı kayıt sayılmaz
      }
    }

    await supabase
      .from('xml_sync_runs')
      .update({ status: 'success', finished_at: new Date().toISOString(), total_products: total, created_products: created, updated_products: updated })
      .eq('id', runId);

    await supabase
      .from('xml_sources')
      .update({ last_status: 'success', last_message: `${total} ürün işlendi (${created} yeni, ${updated} güncel)`, last_run_at: new Date().toISOString() })
      .eq('id', source.id);

    return { ...(run as XmlSyncRunRow), total_products: total, created_products: created, updated_products: updated, status: 'success' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'XML sync hatası';
    await supabase.from('xml_sync_runs').update({ status: 'error', finished_at: new Date().toISOString(), error_message: message }).eq('id', runId);
    await supabase.from('xml_sources').update({ last_status: 'error', last_message: message, last_run_at: new Date().toISOString() }).eq('id', source.id);
    throw error;
  }
}
