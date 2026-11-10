import { cookies } from 'next/headers';
import { buildBackendApiUrl } from '@/lib/backend-url';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/** Server Actions are public POST endpoints: verify the caller's session is an admin before acting. */
export async function assertAdminCaller(): Promise<void> {
  const cookieHeader = (await cookies()).getAll().map(({ name, value }) => `${name}=${value}`).join('; ');
  if (!cookieHeader) throw new Error('Unauthorized');

  const response = await fetch(buildBackendApiUrl('/auth/me'), {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Unauthorized');

  const user = (await response.json()) as { role?: string };
  if (!user.role || !ADMIN_ROLES.has(user.role)) throw new Error('Forbidden');
}
