import { requireAdminPermission } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { GitEngine } from '@/lib/github/git-engine';

import { GitHubSyncClient } from './client';

export default async function GitHubSyncPage() {
  await requireAdminPermission('settings.view');
  const supabase = createAdminClient();

  const { data: config } = await supabase.from('github_sync_config' as never).select('*').limit(1).single();
  const { data: logs } = await supabase.from('github_sync_logs' as never).select('*').order('started_at', { ascending: false }).limit(5);

  let gitStatus: Record<string, unknown> | null = null;
  let lastCommit: Record<string, unknown> | null = null;
  try {
    gitStatus = await GitEngine.getStatus();
    lastCommit = await GitEngine.getLastCommit();
  } catch {
    console.warn('Git repository not found or not initialized. Run "git init".');
  }

  return (
    <div className="grid gap-6 pb-20">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-500">Yönetim</p>
        <h2 className="text-3xl font-semibold tracking-[-0.04em] text-gray-900">Yedekleme Merkezi</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-gray-500">
          Uygulama kaynak kodunu, konfigürasyonları ve statik dosyaları GitHub&apos;a yedekleyin. Veritabanı yedeği içermez.
        </p>
      </div>

      <GitHubSyncClient 
        config={config} 
        gitStatus={gitStatus} 
        lastCommit={lastCommit}
        logs={logs || []}
      />
    </div>
  );
}
