import { afterEach, describe, expect, it, vi } from 'vitest';

const getAll = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => ({ getAll }) }));

import { assertAdminCaller } from '../assert-admin-caller';

function mockMe(ok: boolean, role?: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => ({ role }) }));
}

describe('assertAdminCaller', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('rejects when there is no session cookie', async () => {
    getAll.mockReturnValue([]);
    await expect(assertAdminCaller()).rejects.toThrow('Unauthorized');
  });

  it('rejects non-admin users', async () => {
    getAll.mockReturnValue([{ name: 'accessToken', value: 't' }]);
    mockMe(true, 'user');
    await expect(assertAdminCaller()).rejects.toThrow('Forbidden');
  });

  it('rejects when the backend refuses the session', async () => {
    getAll.mockReturnValue([{ name: 'accessToken', value: 't' }]);
    mockMe(false);
    await expect(assertAdminCaller()).rejects.toThrow('Unauthorized');
  });

  it('allows admins', async () => {
    getAll.mockReturnValue([{ name: 'accessToken', value: 't' }]);
    mockMe(true, 'admin');
    await expect(assertAdminCaller()).resolves.toBeUndefined();
  });
});
