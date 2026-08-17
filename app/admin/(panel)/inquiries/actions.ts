'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function parseStatus(value: string) {
  if (value === 'in_progress' || value === 'closed' || value === 'spam') {
    return value;
  }

  return 'new';
}

export async function saveInquiryAction(formData: FormData) {
  await requireAdminSession();
  const supabase = createAdminClient();
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase
    .from('customer_inquiries')
    .update({
      admin_note: getText(formData, 'admin_note'),
      status: parseStatus(getText(formData, 'status')),
    })
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/inquiries');
}

export async function deleteInquiryAction(formData: FormData) {
  await requireAdminSession();
  const supabase = createAdminClient();
  const id = getText(formData, 'id');

  if (!id) {
    return;
  }

  const { error } = await supabase.from('customer_inquiries').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/admin/inquiries');
  redirect('/admin/inquiries');
}
