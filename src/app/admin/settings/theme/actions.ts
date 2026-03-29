'use server';

import { revalidateTag } from 'next/cache';

export async function revalidateTheme(): Promise<void> {
  revalidateTag('theme');
}
