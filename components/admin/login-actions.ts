'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/audit/queries';
import { invalidateSupabaseSession } from '@/lib/auth/session-invalidation';

export async function adminLoginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';

  // Rate Limiting: 5 attempts per 15 minutes per IP
  const rateLimitResult = checkRateLimit(`login_${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimitResult.success) {
    await writeAuditLog({
      action: 'login_failure',
      resourceType: 'auth',
      metadata: { reason: 'rate_limit_exceeded', email },
      ip
    });
    return { error: 'Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await writeAuditLog({
      action: 'login_failure',
      resourceType: 'auth',
      metadata: { reason: 'invalid_credentials', email },
      ip
    });
    return { error: getAuthErrorMessage(error.message) };
  }

  const adminSupabase = createAdminClient();
  const { data: adminUser, error: adminUserError } = await adminSupabase
    .from('admin_users')
    .select('user_id, is_active')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (adminUserError || !adminUser || adminUser.is_active === false) {
    await supabase.auth.signOut({ scope: 'global' });
    await writeAuditLog({
      actorUserId: data.user.id,
      action: 'login_failure',
      resourceType: 'auth',
      metadata: { reason: adminUser?.is_active === false ? 'inactive_admin' : 'not_admin', email },
      ip
    });
    return { error: adminUser?.is_active === false ? 'Kullanıcı hesabınız pasif durumda.' : 'Bu hesap yönetim paneline yetkili değil.' };
  }

  await writeAuditLog({
    actorUserId: data.user?.id,
    action: 'login_success',
    resourceType: 'auth',
    metadata: { email },
    ip
  });

  return { success: true };
}

function getAuthErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'E-posta adresi henüz doğrulanmadı.';
  }

  return 'Giriş yapılamadı. Lütfen tekrar deneyin.';
}

export async function adminLogoutAction() {
  const supabase = await createClient();
  const result = await invalidateSupabaseSession(supabase);

  if (!result.ok) {
    return { error: 'Çıkış işlemi tamamlanamadı.', success: false };
  }

  if (result.userId) {
    await writeAuditLog({ actorUserId: result.userId, action: 'logout', resourceType: 'auth' });
  }
  revalidatePath('/admin', 'layout');

  return { success: true };
}
