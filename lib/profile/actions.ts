'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/audit/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { AVATAR_ALLOWED_MIME_TYPES, AVATAR_BUCKET, AVATAR_MAX_BYTES, detectAvatarMime, getAvatarExtension } from '@/lib/profile/avatar';

export type ProfileMutationResult = { error?: string; message?: string; ok: boolean };

type ProfileTarget = {
  avatarPath: string | null;
  table: 'admin_users' | 'customer_profiles';
  userId: string;
};

async function getProfileTarget(): Promise<{ client: Awaited<ReturnType<typeof createClient>>; target: ProfileTarget } | null> {
  const client = await createClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user) return null;

  const admin = createAdminClient();
  const [adminResult, customerResult] = await Promise.all([
    admin.from('admin_users').select('user_id, avatar_path, role, is_active').eq('user_id', authData.user.id).maybeSingle(),
    admin.from('customer_profiles').select('user_id, avatar_path, is_blocked').eq('user_id', authData.user.id).maybeSingle(),
  ]);

  if (adminResult.data?.is_active && ['admin', 'staff'].includes(adminResult.data.role)) {
    return { client, target: { avatarPath: adminResult.data.avatar_path, table: 'admin_users', userId: authData.user.id } };
  }
  if (customerResult.data && !customerResult.data.is_blocked) {
    return { client, target: { avatarPath: customerResult.data.avatar_path, table: 'customer_profiles', userId: authData.user.id } };
  }
  return null;
}

function revalidateAvatarViews() {
  revalidatePath('/hesabim', 'layout');
  revalidatePath('/hesabim/profil');
  revalidatePath('/admin', 'layout');
  revalidatePath('/admin/profil');
  revalidatePath('/admin/yonetim/kullanicilar');
}

export async function uploadOwnAvatarAction(formData: FormData): Promise<ProfileMutationResult> {
  const context = await getProfileTarget();
  if (!context) return { error: 'Profil fotoğrafı yüklemek için aktif bir oturum gerekli.', ok: false };
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) return { error: 'Yüklenecek fotoğrafı seçin.', ok: false };
  if (file.size > AVATAR_MAX_BYTES) return { error: 'Profil fotoğrafı en fazla 5 MB olabilir.', ok: false };
  if (!AVATAR_ALLOWED_MIME_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_MIME_TYPES)[number])) {
    return { error: 'Yalnızca JPEG, PNG veya WEBP fotoğraf yükleyebilirsiniz.', ok: false };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const detectedMime = detectAvatarMime(bytes);
  if (!detectedMime || detectedMime !== file.type) return { error: 'Dosya içeriği geçerli bir profil fotoğrafı değil.', ok: false };
  const extension = getAvatarExtension(detectedMime);
  if (!extension) return { error: 'Fotoğraf formatı desteklenmiyor.', ok: false };

  const { client, target } = context;
  const storagePath = `${target.userId}/avatar-${randomUUID()}.${extension}`;
  const { error: uploadError } = await client.storage.from(AVATAR_BUCKET).upload(storagePath, bytes, {
    cacheControl: '31536000',
    contentType: detectedMime,
    upsert: false,
  });
  if (uploadError) return { error: 'Profil fotoğrafı Storage alanına yüklenemedi.', ok: false };

  const admin = createAdminClient();
  const { error: updateError } = await admin.from(target.table).update({ avatar_path: storagePath }).eq('user_id', target.userId);
  if (updateError) {
    await client.storage.from(AVATAR_BUCKET).remove([storagePath]);
    return { error: 'Profil fotoğrafı hesabınıza bağlanamadı.', ok: false };
  }

  let oldAvatarCleanupFailed = false;
  if (target.avatarPath && target.avatarPath.startsWith(`${target.userId}/`) && target.avatarPath !== storagePath) {
    const { error } = await client.storage.from(AVATAR_BUCKET).remove([target.avatarPath]);
    oldAvatarCleanupFailed = Boolean(error);
  }

  await writeAuditLog({
    actorUserId: target.userId,
    action: target.avatarPath ? 'profile_avatar_update' : 'profile_avatar_upload',
    resourceId: target.userId,
    resourceType: 'profile',
    oldValue: { avatar_configured: Boolean(target.avatarPath) },
    newValue: { avatar_configured: true },
    metadata: { old_avatar_cleanup_failed: oldAvatarCleanupFailed },
  });
  revalidateAvatarViews();
  return { message: target.avatarPath ? 'Profil fotoğrafınız güncellendi.' : 'Profil fotoğrafınız yüklendi.', ok: true };
}

export async function removeOwnAvatarAction(): Promise<ProfileMutationResult> {
  const context = await getProfileTarget();
  if (!context) return { error: 'Profil fotoğrafını kaldırmak için aktif bir oturum gerekli.', ok: false };
  const { client, target } = context;
  if (!target.avatarPath) return { message: 'Profil fotoğrafınız zaten kaldırılmış.', ok: true };
  if (!target.avatarPath.startsWith(`${target.userId}/`)) return { error: 'Profil fotoğrafı sahipliği doğrulanamadı.', ok: false };

  const admin = createAdminClient();
  const { error: updateError } = await admin.from(target.table).update({ avatar_path: null }).eq('user_id', target.userId);
  if (updateError) return { error: 'Profil fotoğrafı kaydı kaldırılamadı.', ok: false };

  const { error: removeError } = await client.storage.from(AVATAR_BUCKET).remove([target.avatarPath]);
  if (removeError) {
    await admin.from(target.table).update({ avatar_path: target.avatarPath }).eq('user_id', target.userId);
    return { error: 'Profil fotoğrafı Storage alanından kaldırılamadı.', ok: false };
  }

  await writeAuditLog({ actorUserId: target.userId, action: 'profile_avatar_remove', resourceId: target.userId, resourceType: 'profile', oldValue: { avatar_configured: true }, newValue: { avatar_configured: false } });
  revalidateAvatarViews();
  return { message: 'Profil fotoğrafınız kaldırıldı.', ok: true };
}
