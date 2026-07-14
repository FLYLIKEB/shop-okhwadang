import { describe, expect, it } from 'vitest';
import {
  buildBackendApiUrl,
  buildConfiguredBackendApiUrl,
  getBackendOrigin,
  getConfiguredBackendOrigin,
  normalizeBackendOrigin,
} from '@/lib/backend-url';

describe('backend URL contract', () => {
  it('normalizes trailing slashes and a legacy /api suffix to the backend origin', () => {
    expect(normalizeBackendOrigin('https://backend.example/api/')).toBe('https://backend.example');
    expect(normalizeBackendOrigin('https://backend.example/')).toBe('https://backend.example');
  });

  it('builds backend API URLs from either the canonical origin or a legacy /api env value', () => {
    expect(buildBackendApiUrl('/health', '?full=1', 'https://backend.example')).toBe(
      'https://backend.example/api/health?full=1',
    );
    expect(buildBackendApiUrl('/health', '?full=1', 'https://backend.example/api/')).toBe(
      'https://backend.example/api/health?full=1',
    );
  });

  it('falls back to localhost only for non-required SSR callers', () => {
    expect(getBackendOrigin('')).toBe('http://localhost:3000');
    expect(getConfiguredBackendOrigin('')).toBeNull();
    expect(buildConfiguredBackendApiUrl('/health', '', '')).toBeNull();
  });
});
