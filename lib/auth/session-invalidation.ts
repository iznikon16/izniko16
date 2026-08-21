import 'server-only';

type AuthClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
    signOut: (options: { scope: 'global' }) => Promise<{ error: { message: string } | null }>;
  };
};

export async function invalidateSupabaseSession(client: AuthClient) {
  let user = null;
  try {
    const { data } = await client.auth.getUser();
    user = data.user;
  } catch {
    // Ignore error
  }
  const { error } = await client.auth.signOut({ scope: 'global' });
  return { ok: !error, userId: user?.id ?? null };
}
