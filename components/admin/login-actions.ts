'use server';

import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { headers } from 'next/headers';
import { writeAuditLog } from '@/lib/audit/queries';

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
    return { error: 'Ã‡ok fazla giriÅŸ denemesi yapÄ±ldÄ±. LÃ¼tfen daha sonra tekrar deneyin.' };
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
  const normalizedMessage = message.toLocaleLowerCase('tr');

  if (normalizedMessage.includes('invalid login credentials')) {
    return 'E-posta veya ÅŸifre hatalÄ±.';
  }

  if (normalizedMessage.includes('email not confirmed')) {
    return 'E-posta adresi henÃ¼z doÄŸrulanmamÄ±ÅŸ.';
  }

  return message;
}

