import 'server-only';

import type { AdminInquiryFilters, CustomerInquiryRow } from '@/lib/catalog/types';
import { createAdminClient } from '@/lib/supabase/admin';

function normalizeSearchTerm(value?: string) {
  return value?.replace(/[%_,]/g, ' ').trim() ?? '';
}

export async function getAdminInquiries(filters?: AdminInquiryFilters): Promise<CustomerInquiryRow[]> {
  const supabase = createAdminClient();
  let query = supabase.from('customer_inquiries').select('*').order('created_at', { ascending: false });
  const searchTerm = normalizeSearchTerm(filters?.query);

  if (searchTerm) {
    query = query.or(`full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,subject.ilike.%${searchTerm}%,product_title.ilike.%${searchTerm}%`);
  }

  if (filters?.source) {
    query = query.eq('source', filters.source);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomerInquiryRow[];
}
