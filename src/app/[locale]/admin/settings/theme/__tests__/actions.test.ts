import { expect, it, vi } from 'vitest';
import { revalidateTag } from 'next/cache';
import { revalidateTheme } from '../actions';

vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('@/lib/assert-admin-caller', () => ({ assertAdminCaller: vi.fn() }));

it('invalidates settings and theme tags used by the storefront layout', async () => {
  await revalidateTheme();
  expect(revalidateTag).toHaveBeenCalledWith('theme');
  expect(revalidateTag).toHaveBeenCalledWith('settings');
});
