'use server';

import { revalidateTag } from 'next/cache';
import { assertAdminCaller } from '@/lib/assert-admin-caller';

export async function revalidateTheme(): Promise<void> {
  await assertAdminCaller();
  revalidateTag('theme');
  revalidateTag('settings');
}
