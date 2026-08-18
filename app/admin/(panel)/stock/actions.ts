'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { applyManualStockChange } from '@/lib/stock/queries';
import { createAdminClient } from '@/lib/supabase/admin';

export async function manualStockInAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const quantity = Number(String(formData.get('quantity') ?? '').replace(',', '.'));
  const reference = String(formData.get('reference') ?? '').trim();

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Geçerli bir ürün ve pozitif stok miktarı girin.');
  }

  await applyManualStockChange(productId, quantity, 'manual_in', reference, `stock-in:${randomUUID()}`);
  revalidateStock();
}

export async function manualStockOutAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const quantity = Number(String(formData.get('quantity') ?? '').replace(',', '.'));
  const reference = String(formData.get('reference') ?? '').trim();

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Geçerli bir ürün ve pozitif stok miktarı girin.');
  }

  await applyManualStockChange(productId, -quantity, 'manual_out', reference, `stock-out:${randomUUID()}`);
  revalidateStock();
}

export async function updateCriticalStockAction(formData: FormData): Promise<void> {
  await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const critical = Number(String(formData.get('critical_stock') ?? '').replace(',', '.'));
  const level = Number.isFinite(critical) ? Math.max(0, critical) : 0;

  if (!productId) {
    throw new Error('Ürün zorunludur.');
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('products').update({ critical_stock: level }).eq('id', productId);
  if (error) throw new Error(error.message);

  revalidateStock();
}

function revalidateStock() {
  revalidatePath('/admin');
  revalidatePath('/admin/stok');
  revalidatePath('/admin/stok/hareketler');
  revalidatePath('/admin/stok/kritik');
  revalidatePath('/admin/products');
}
