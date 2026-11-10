'use server';

import { revalidateTag } from 'next/cache';
import { assertAdminCaller } from '@/lib/assert-admin-caller';

export async function revalidateNavigation(): Promise<void> {
  await assertAdminCaller();
  revalidateTag('cms');
  revalidateTag('settings');
}
