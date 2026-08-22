'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminPermission } from '@/lib/auth/admin';
import { writeAuditLog } from '@/lib/audit/queries';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireSuperAdmin() {
  const session = await requireAdminPermission('audit.view');
  if (!session.adminUser.is_super_admin) throw new Error('Bu işlem yalnızca Super Admin tarafından yapılabilir.');
  return session;
}

export async function hideAuditLogAction(formData: FormData) {
  const session = await requireSuperAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Audit kaydı seçilmedi.');
  const supabase = createAdminClient();
  const { data: target, error: targetError } = await supabase.from('audit_logs').select('id, action, resource_type, resource_id, deleted_at').eq('id', id).maybeSingle();
  if (targetError || !target) throw new Error('Audit kaydı bulunamadı.');
  if (target.deleted_at) return { ok: true, message: 'Audit kaydı zaten gizlenmiş.' };
  const { error } = await supabase.from('audit_logs').update({
    deleted_at: new Date().toISOString(),
    deleted_by: session.user.id,
    deletion_reason: 'Super Admin tarafından panel görünümünden kaldırıldı.',
  }).eq('id', id).is('deleted_at', null);
  if (error) throw new Error('Audit kaydı gizlenemedi.');
  await writeAuditLog({
    actorUserId: session.user.id,
    action: 'audit_log_hidden',
    resourceType: 'audit_log',
    resourceId: id,
    oldValue: { deletedAt: null },
    newValue: { deletedAt: new Date().toISOString() },
    metadata: { targetAction: target.action, targetResourceType: target.resource_type, targetResourceId: target.resource_id },
  });
  revalidatePath('/admin/yonetim/audit');
  return { ok: true, message: 'Audit kaydı görünümden kaldırıldı; fiziksel kayıt korundu.' };
}

export async function restoreAuditLogAction(formData: FormData) {
  const session = await requireSuperAdmin();
  const id = String(formData.get('id') ?? '').trim();
  if (!id) throw new Error('Audit kaydı seçilmedi.');
  const supabase = createAdminClient();
  const { error } = await supabase.from('audit_logs').update({ deleted_at: null, deleted_by: null, deletion_reason: '' }).eq('id', id).not('deleted_at', 'is', null);
  if (error) throw new Error('Audit kaydı geri yüklenemedi.');
  await writeAuditLog({ actorUserId: session.user.id, action: 'audit_log_restored', resourceType: 'audit_log', resourceId: id });
  revalidatePath('/admin/yonetim/audit');
  return { ok: true, message: 'Audit kaydı geri yüklendi.' };
}

export async function permanentlyDeleteAuditLogsAction(formData: FormData) {
  const session = await requireSuperAdmin();
  const candidates = [String(formData.get('id') ?? ''), ...formData.getAll('ids').map(String)];
  const ids = [...new Set(candidates.map((id) => id.trim()).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))].slice(0, 100);
  if (!ids.length) throw new Error('Kalıcı olarak silinecek audit kaydı seçilmedi.');

  const supabase = createAdminClient();
  const { data: targets, error: targetError } = await supabase.from('audit_logs').select('id, action, resource_type').in('id', ids);
  if (targetError) throw new Error('Silinecek audit kayıtları alınamadı.');
  if (!targets?.length) return { ok: true, message: 'Seçilen kayıtlar daha önce silinmiş.' };

  const { error } = await supabase.from('audit_logs').delete().in('id', targets.map((target) => target.id));
  if (error) throw new Error('Audit kayıtları kalıcı olarak silinemedi.');

  await writeAuditLog({
    actorUserId: session.user.id,
    action: 'audit_logs_permanently_deleted',
    resourceType: 'audit_log',
    resourceId: targets.length === 1 ? targets[0].id : 'bulk',
    metadata: {
      deletedCount: targets.length,
      targets: targets.slice(0, 100).map((target) => ({ id: target.id, action: target.action, resourceType: target.resource_type })),
    },
  });
  revalidatePath('/admin');
  revalidatePath('/admin/yonetim/audit');
  return { ok: true, message: `${targets.length} audit kaydı kalıcı olarak silindi.` };
}
