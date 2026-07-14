const DEFAULT_BACKEND_ORIGIN = 'http://localhost:3000';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripApiSuffix(value: string): string {
  return value.endsWith('/api') ? value.slice(0, -4) : value;
}

export function normalizeBackendOrigin(value: string): string {
  return stripApiSuffix(stripTrailingSlash(value.trim()));
}

export function getBackendOrigin(raw = process.env.BACKEND_URL): string {
  const configured = raw?.trim();
  return normalizeBackendOrigin(configured || DEFAULT_BACKEND_ORIGIN);
}

export function getConfiguredBackendOrigin(raw = process.env.BACKEND_URL): string | null {
  const configured = raw?.trim();
  return configured ? normalizeBackendOrigin(configured) : null;
}

export function buildBackendApiUrl(
  apiPath: string,
  search = '',
  raw = process.env.BACKEND_URL,
): string {
  const normalizedApiPath = apiPath.startsWith('/api')
    ? apiPath
    : `/api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  return `${getBackendOrigin(raw)}${normalizedApiPath}${search}`;
}

export function buildConfiguredBackendApiUrl(
  apiPath: string,
  search = '',
  raw = process.env.BACKEND_URL,
): string | null {
  const origin = getConfiguredBackendOrigin(raw);
  if (!origin) return null;

  const normalizedApiPath = apiPath.startsWith('/api')
    ? apiPath
    : `/api${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
  return `${origin}${normalizedApiPath}${search}`;
}
