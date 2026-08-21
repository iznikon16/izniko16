'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdminPermission } from '@/lib/auth/admin';
import { encryptToken, decryptToken, isLegacyEncryptedToken } from '@/lib/security/encryption';
import { GitEngine } from '@/lib/github/git-engine';
import { writeAuditLog } from '@/lib/audit/queries';

type GitHubSyncConfig = {
  id: string;
  encrypted_token: string;
};

function getTokenErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('ENCRYPTION_KEY') || message.includes('Encryption key')) {
    return 'Sunucu şifreleme anahtarı eksik veya geçersiz. Ortam değişkenlerini kontrol edin.';
  }
  return 'Kayıtlı GitHub tokenı okunamadı. Personal Access Token alanına tokenı yeniden girip ayarları kaydedin.';
}

async function readAndMigrateToken(
  // github_sync_config predates the generated Database type in this repository.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  config: GitHubSyncConfig,
) {
  let token: string;
  try {
    token = decryptToken(config.encrypted_token);
  } catch (error) {
    throw new Error(getTokenErrorMessage(error));
  }

  if (isLegacyEncryptedToken(config.encrypted_token)) {
    const { error } = await db
      .from('github_sync_config')
      .update({ encrypted_token: encryptToken(token) })
      .eq('id', config.id);
    if (error) throw new Error('GitHub tokenı yeni şifreleme formatına yükseltilemedi.');
  }

  return token;
}

export async function saveGitHubConfig(formData: FormData) {
  try {
    const { user } = await requireAdminPermission('settings.view');
    
    const owner = formData.get('owner') as string;
    const repository = formData.get('repository') as string;
    const branch = formData.get('branch') as string;
    const token = formData.get('token') as string; // Optional if only updating text

    if (!owner || !repository || !branch) {
      throw new Error('Gerekli alanları doldurun.');
    }

    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    
    // Check existing config
    const { data: existing, error: selectError } = await db.from('github_sync_config').select('id, encrypted_token').limit(1).maybeSingle();

    if (selectError) {
      throw new Error('Veritabanı hatası: ' + selectError.message);
    }

    let encryptedTokenToSave: string | undefined;
    if (token && token.trim() !== '') {
      encryptedTokenToSave = encryptToken(token.trim());
    } else if (existing?.encrypted_token) {
      try {
        encryptedTokenToSave = encryptToken(decryptToken(existing.encrypted_token));
      } catch (error) {
        throw new Error(getTokenErrorMessage(error));
      }
    }

    if (!encryptedTokenToSave) {
      throw new Error('Lütfen geçerli bir Access Token girin.');
    }

    if (existing) {
      const { error: updateError } = await db.from('github_sync_config').update({
        github_owner: owner,
        github_repository: repository,
        github_branch: branch,
        encrypted_token: encryptedTokenToSave,
      }).eq('id', existing.id);
      
      if (updateError) throw new Error('Güncelleme hatası: ' + updateError.message);
    } else {
      const { error: insertError } = await db.from('github_sync_config').insert({
        github_owner: owner,
        github_repository: repository,
        github_branch: branch,
        encrypted_token: encryptedTokenToSave,
      });

      if (insertError) throw new Error('Kayıt hatası: ' + insertError.message);
    }

    await writeAuditLog({
      actorUserId: user.id,
      action: 'github_settings_update',
      resourceType: 'github_sync_config',
      metadata: { owner, repository, branch }
    });

    revalidatePath('/admin/github-sync');
    return { success: true };
  } catch (error: unknown) {
    return { error: (error as Error).message };
  }
}

export async function testGitHubConnection() {
  try {
    const { user } = await requireAdminPermission('settings.view');
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    
    const { data: config, error } = await db.from('github_sync_config').select('*').limit(1).single();
    
    if (error || !config) {
      throw new Error('GitHub yapılandırması bulunamadı.');
    }

    const token = await readAndMigrateToken(db, config);
    const remoteUrl = `https://github.com/${config.github_owner}/${config.github_repository}.git`;

    await writeAuditLog({
      actorUserId: user.id,
      action: 'github_connection_test',
      resourceType: 'github_sync_config',
    });

    // Test fetch
    await GitEngine.fetch(remoteUrl, token);

    // Update last connection check
    await db.from('github_sync_config').update({ last_connection_check: new Date().toISOString() }).eq('id', config.id);
    
    revalidatePath('/admin/github-sync');
    return { success: true };
  } catch (error: unknown) {
    return { error: (error as Error).message };
  }
}

export async function pushToGitHub(commitMessage?: string) {
  try {
    const { user } = await requireAdminPermission('settings.view');
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const { data: config } = await db.from('github_sync_config').select('*').limit(1).single();
    
    if (!config) throw new Error('GitHub yapılandırması bulunamadı.');

    const token = await readAndMigrateToken(db, config);
    const remoteUrl = `https://github.com/${config.github_owner}/${config.github_repository}.git`;
    const message = commitMessage?.trim() || `Backup: ${new Date().toLocaleString('tr-TR')}`;

    // Status check
    const status = await GitEngine.getStatus();
    
    // Fetch to check ahead/behind
    await GitEngine.fetch(remoteUrl, token);
    const fetchStatus = await GitEngine.getStatus();

    if (fetchStatus.behind > 0) {
      throw new Error('GitHub üzerinde daha yeni değişiklikler bulunuyor. Önce güncelleme yapmanız gerekiyor.');
    }

    if (status.hasLocalChanges) {
      // Add and commit
      await GitEngine.addAndCommit(message);
    } else if (fetchStatus.ahead === 0) {
      // Nothing to push
      return { success: true, message: 'Yedeklenecek yeni bir değişiklik bulunmuyor.' };
    }

    // Push
    await GitEngine.push(remoteUrl, token, config.github_branch);

    await writeAuditLog({
      actorUserId: user.id,
      action: 'github_push',
      resourceType: 'github_sync_config',
      metadata: { branch: config.github_branch, message }
    });

    revalidatePath('/admin/github-sync');
    return { success: true, message: 'Yedekleme başarıyla tamamlandı.' };
  } catch (error: unknown) {
    return { error: (error as Error).message };
  }
}
