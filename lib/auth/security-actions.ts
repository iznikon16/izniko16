'use server';

import { revalidatePath } from 'next/cache';
import { writeAuditLog } from '@/lib/audit/queries';
import { createClient } from '@/lib/supabase/server';
import { getMfaStatus } from '@/lib/auth/mfa';

export type SecurityActionResult = { error?: string; message?: string; ok: boolean; signedOut?: boolean };

async function getAuthenticatedSecurityContext() {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, user: data.user };
}

export async function recordMfaEnrollmentAction(): Promise<SecurityActionResult> {
  const context = await getAuthenticatedSecurityContext();
  if (!context) return { error: 'Oturum doğrulanamadı.', ok: false };
  const status = await getMfaStatus(context.client);
  if (!status.enabled) return { error: 'Doğrulanmış Authenticator kaydı bulunamadı.', ok: false };
  await writeAuditLog({ actorUserId: context.user.id, action: 'mfa_enabled', resourceId: context.user.id, resourceType: 'auth', metadata: { factor_type: 'totp' } });
  revalidatePath('/hesabim/profil');
  revalidatePath('/admin/profil');
  return { message: 'İki aşamalı doğrulama etkinleştirildi.', ok: true };
}

export async function recordMfaRemovalAction(): Promise<SecurityActionResult> {
  const context = await getAuthenticatedSecurityContext();
  if (!context) return { error: 'Oturum doğrulanamadı.', ok: false };
  const status = await getMfaStatus(context.client);
  if (status.enabled) return { error: 'Authenticator kaydı hâlâ etkin görünüyor.', ok: false };
  await writeAuditLog({ actorUserId: context.user.id, action: 'mfa_disabled', resourceId: context.user.id, resourceType: 'auth', metadata: { factor_type: 'totp' } });
  revalidatePath('/hesabim/profil');
  revalidatePath('/admin/profil');
  return { message: 'İki aşamalı doğrulama devre dışı bırakıldı.', ok: true };
}

export async function recordMfaChallengeSuccessAction(): Promise<SecurityActionResult> {
  const context = await getAuthenticatedSecurityContext();
  if (!context) return { error: 'Oturum doğrulanamadı.', ok: false };
  const status = await getMfaStatus(context.client);
  if (status.currentLevel !== 'aal2') return { error: 'İki aşamalı doğrulama tamamlanmadı.', ok: false };
  await writeAuditLog({ actorUserId: context.user.id, action: 'mfa_challenge_success', resourceId: context.user.id, resourceType: 'auth' });
  return { ok: true };
}

export async function signOutOtherSessionsAction(): Promise<SecurityActionResult> {
  const context = await getAuthenticatedSecurityContext();
  if (!context) return { error: 'Oturum doğrulanamadı.', ok: false };
  const { error } = await context.client.auth.signOut({ scope: 'others' });
  if (error) return { error: 'Diğer oturumlar kapatılamadı.', ok: false };
  await writeAuditLog({ actorUserId: context.user.id, action: 'other_sessions_revoked', resourceId: context.user.id, resourceType: 'auth' });
  return { message: 'Diğer cihazlardaki oturumlar kapatıldı.', ok: true };
}

export async function signOutAllSessionsAction(): Promise<SecurityActionResult> {
  const context = await getAuthenticatedSecurityContext();
  if (!context) return { error: 'Oturum doğrulanamadı.', ok: false };
  await writeAuditLog({ actorUserId: context.user.id, action: 'all_sessions_revoked', resourceId: context.user.id, resourceType: 'auth' });
  const { error } = await context.client.auth.signOut({ scope: 'global' });
  if (error) return { error: 'Oturumlar kapatılamadı.', ok: false };
  revalidatePath('/', 'layout');
  return { message: 'Tüm oturumlar kapatıldı.', ok: true, signedOut: true };
}
