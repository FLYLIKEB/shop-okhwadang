import * as fs from 'fs';
import * as path from 'path';
import * as mysql from 'mysql2/promise';

export const DEFAULT_ENTRYPOINT = path.resolve(__dirname, '..', 'main.js');

export interface DatabaseDiagnostics {
  configured: boolean;
  host: string;
  port: string;
  database: string;
  sslEnabled: boolean;
  sslCaPath: string | null;
}

export function maskDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.username) url.username = '[user]';
    if (url.password) url.password = '[redacted]';
    return url.toString();
  } catch {
    return '[invalid DATABASE_URL]';
  }
}

export function getDatabaseDiagnostics(env: NodeJS.ProcessEnv = process.env): DatabaseDiagnostics {
  const rawUrl = env.DATABASE_URL || env.LOCAL_DATABASE_URL || '';
  const diagnostics: DatabaseDiagnostics = {
    configured: Boolean(rawUrl),
    host: 'unknown',
    port: 'unknown',
    database: 'unknown',
    sslEnabled: env.DB_SSL_ENABLED === 'true',
    sslCaPath: env.DB_SSL_CA_PATH || null,
  };

  if (!rawUrl) return diagnostics;

  try {
    const url = new URL(rawUrl);
    diagnostics.host = url.hostname || 'unknown';
    diagnostics.port = url.port || '3306';
    diagnostics.database = url.pathname ? url.pathname.replace(/^\//, '') : 'unknown';
  } catch {
    diagnostics.host = 'invalid-url';
  }

  return diagnostics;
}

export function formatDiagnostics(diagnostics: DatabaseDiagnostics): string {
  return [
    `configured=${diagnostics.configured}`,
    `host=${diagnostics.host}`,
    `port=${diagnostics.port}`,
    `database=${diagnostics.database}`,
    `ssl=${diagnostics.sslEnabled}`,
    `ca=${diagnostics.sslCaPath || 'not-set'}`,
  ].join(' ');
}

export function assertBuildArtifact(entrypoint = DEFAULT_ENTRYPOINT): string {
  if (!fs.existsSync(entrypoint)) {
    throw new Error(`build artifact missing: ${entrypoint}`);
  }
  return entrypoint;
}

export function getSslOptions(env: NodeJS.ProcessEnv = process.env): { ca: string } | undefined {
  if (env.DB_SSL_ENABLED !== 'true') return undefined;

  const caPath = env.DB_SSL_CA_PATH;
  if (!caPath) {
    throw new Error('DB_SSL_ENABLED=true but DB_SSL_CA_PATH is not set');
  }
  if (!fs.existsSync(caPath)) {
    throw new Error(`DB_SSL_ENABLED=true but CA file does not exist: ${caPath}`);
  }

  return { ca: fs.readFileSync(caPath, 'utf8') };
}

export async function verifyDatabaseConnection(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const databaseUrl = env.DATABASE_URL || env.LOCAL_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  const connection = await mysql.createConnection({
    uri: databaseUrl,
    ssl: getSslOptions(env),
    connectTimeout: Number(env.DB_PREFLIGHT_TIMEOUT_MS ?? 5000),
  });

  try {
    await connection.query('SELECT 1');
  } finally {
    await connection.end();
  }
}
