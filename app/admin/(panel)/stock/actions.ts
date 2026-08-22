'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { applyManualStockChange } from '@/lib/stock/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { writeAuditLog } from '@/lib/audit/queries';

export async function manualStockInAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const quantity = Number(String(formData.get('quantity') ?? '').replace(',', '.'));
  const reference = String(formData.get('reference') ?? '').trim();

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Geçerli bir ürün ve pozitif stok miktarı girin.');
  }

  const result = await applyManualStockChange(productId, quantity, 'manual_in', reference, `stock-in:${randomUUID()}`, session.user.id);
  await writeAuditLog({ actorUserId: session.user.id, action: 'stock_change', resourceType: 'stock', resourceId: productId, oldValue: { quantity: result.previousQuantity }, newValue: { quantity: result.resultingQuantity }, metadata: { change: quantity, type: 'manual_in', reference } });
  revalidateStock();
}

export async function manualStockOutAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const quantity = Number(String(formData.get('quantity') ?? '').replace(',', '.'));
  const reference = String(formData.get('reference') ?? '').trim();

  if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Geçerli bir ürün ve pozitif stok miktarı girin.');
  }

  const result = await applyManualStockChange(productId, -quantity, 'manual_out', reference, `stock-out:${randomUUID()}`, session.user.id);
  await writeAuditLog({ actorUserId: session.user.id, action: 'stock_change', resourceType: 'stock', resourceId: productId, oldValue: { quantity: result.previousQuantity }, newValue: { quantity: result.resultingQuantity }, metadata: { change: -quantity, type: 'manual_out', reference } });
  revalidateStock();
}

export async function updateCriticalStockAction(formData: FormData): Promise<void> {
  const session = await requireAdminPermission('product.manageStock');
  const productId = String(formData.get('product_id') ?? '').trim();
  const critical = Number(String(formData.get('critical_stock') ?? '').replace(',', '.'));
  const level = Number.isFinite(critical) ? Math.max(0, critical) : 0;

  if (!productId) {
    throw new Error('Ürün zorunludur.');
  }

  const supabase = createAdminClient();
  const { data: previous, error: previousError } = await supabase.from('products').select('critical_stock').eq('id', productId).maybeSingle();
  if (previousError || !previous) throw new Error('Ürün bulunamadı.');
  const { error } = await supabase.from('products').update({ critical_stock: level }).eq('id', productId);
  if (error) throw new Error(error.message);
  await writeAuditLog({ actorUserId: session.user.id, action: 'stock_critical_level_updated', resourceType: 'stock', resourceId: productId, oldValue: { criticalStock: previous.critical_stock }, newValue: { criticalStock: level } });

  revalidateStock();
}

function revalidateStock() {
  revalidatePath('/admin');
  revalidatePath('/admin/stock');
  revalidatePath('/admin/stock/hareketler');
  revalidatePath('/admin/stock/kritik');
  revalidatePath('/admin/products');
}
