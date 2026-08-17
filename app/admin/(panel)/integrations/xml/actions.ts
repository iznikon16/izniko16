'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateXmlUrl } from '@/lib/xml/queries';
import type { XmlTargetField } from '@/lib/catalog/types';

const VALID_TARGETS: XmlTargetField[] = ['name', 'sku', 'price', 'retail_price', 'stock', 'image', 'category', 'brand', 'description', 'barcode'];

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function getNumber(formData: FormData, key: string) {
  const value = getText(formData, key).replace(',', '.');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function revalidateXml() {
  revalidatePath('/admin');
  revalidatePath('/admin/entegrasyonlar/xml');
  revalidatePath('/admin/entegrasyonlar/xml/aktarimlar');
}

export async function saveXmlSourceAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const id = getText(formData, 'id');
  const name = getText(formData, 'name');
  const url = getText(formData, 'url');

  if (!name || !url) {
    throw new Error('XML kaynağı adı ve URL zorunludur.');
  }

  const safeUrl = validateXmlUrl(url);

  const payload = {
    name,
    url: safeUrl,
    is_active: formData.get('is_active') === 'on',
    schedule_minutes: getNumber(formData, 'schedule_minutes') || 60,
    price_markup: getNumber(formData, 'price_markup'),
  };

  const { data: source, error } = id
    ? await supabase.from('xml_sources').update(payload).eq('id', id).select('id').single()
    : await supabase.from('xml_sources').insert(payload).select('id').single();

  if (error) throw new Error(error.message);

  const sourceId = source.id as string;

  // Field mapping temizle ve yaz
  await supabase.from('xml_field_mappings').delete().eq('xml_source_id', sourceId);

  const mappings: { xml_source_id: string; source_field: string; target_field: string }[] = [];
  const rawMappings = formData.get('mappings');

  if (typeof rawMappings === 'string' && rawMappings.trim()) {
    try {
      const parsed = JSON.parse(rawMappings) as { source: string; target: string }[];
      for (const m of parsed) {
        if (m?.source?.trim() && VALID_TARGETS.includes(m.target as XmlTargetField)) {
          mappings.push({
            xml_source_id: sourceId,
            source_field: m.source.trim(),
            target_field: m.target as XmlTargetField,
          });
        }
      }
    } catch {
      throw new Error('Mapping verisi geçersiz JSON.');
    }
  }

  if (mappings.length > 0) {
    const { error: mappingError } = await supabase.from('xml_field_mappings').insert(mappings);
    if (mappingError) throw new Error(mappingError.message);
  }

  revalidateXml();
}

export async function deleteXmlSourceAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const supabase = createAdminClient();
  const id = getText(formData, 'id');
  if (!id) return;

  const { error } = await supabase.from('xml_sources').delete().eq('id', id);
  if (error) throw new Error(error.message);

  revalidateXml();
}

export async function runXmlSyncAction(formData: FormData): Promise<void> {
  await requireAdminSession();
  const id = getText(formData, 'id');
  if (!id) return;

  const { syncXmlSource } = await import('@/lib/xml/queries');
  await syncXmlSource(id);
  revalidateXml();
}
