import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/database.types';

export const INTEGRATION_KEYS = ['paytr', 'iyzico', 'odeal', 'netgsm', 'smtp'] as const;
export type IntegrationKey = (typeof INTEGRATION_KEYS)[number];
export type IntegrationEnvironment = 'sandbox' | 'live';
export type IntegrationStatus = 'ready' | 'success' | 'failed' | 'not_configured';

export async function recordIntegrationCheck(input: {
  actorUserId: string;
  environment: IntegrationEnvironment;
  integrationKey: IntegrationKey;
  message: string;
  metadata?: Record<string, Json | boolean | number | string | null>;
  status: IntegrationStatus;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from('integration_health_checks').insert({
    actor_user_id: input.actorUserId,
    check_type: 'configuration',
    environment: input.environment,
    integration_key: input.integrationKey,
    message: input.message,
    metadata: (input.metadata ?? {}) as Json,
    status: input.status,
  });
  if (error) throw new Error(error.message);
}

export async function getLatestIntegrationChecks() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('integration_health_checks')
    .select('*')
    .order('checked_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const latest = new Map<IntegrationKey, NonNullable<typeof data>[number]>();
  for (const row of data ?? []) {
    const key = row.integration_key as IntegrationKey;
    if (INTEGRATION_KEYS.includes(key) && !latest.has(key)) latest.set(key, row);
  }
  return latest;
}
