'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateNavigation(): Promise<void> {
  revalidateTag('cms');
  revalidateTag('settings');
}
