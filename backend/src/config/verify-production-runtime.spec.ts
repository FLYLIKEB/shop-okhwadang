import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  assertBuildArtifact,
  formatDiagnostics,
  getDatabaseDiagnostics,
  getSslOptions,
  maskDatabaseUrl,
} from './production-runtime-preflight';

describe('verify-production-runtime', () => {
  it('fails clearly when the backend build artifact is missing', () => {
    expect(() => assertBuildArtifact('/tmp/okhwadang/missing/dist/main.js')).toThrow(
      'build artifact missing: /tmp/okhwadang/missing/dist/main.js',
    );
  });

  it('reports non-secret database diagnostics without credentials', () => {
    const diagnostics = getDatabaseDiagnostics({
      DATABASE_URL: 'mysql://app_user:super-secret@db.example.com:3306/commerce',
      DB_SSL_ENABLED: 'true',
      DB_SSL_CA_PATH: '/etc/mysql/ca.pem',
    });

    expect(diagnostics).toEqual({
      configured: true,
      host: 'db.example.com',
      port: '3306',
      database: 'commerce',
      sslEnabled: true,
      sslCaPath: '/etc/mysql/ca.pem',
    });
    expect(formatDiagnostics(diagnostics)).toContain('host=db.example.com');
    expect(formatDiagnostics(diagnostics)).not.toContain('super-secret');
    expect(maskDatabaseUrl('mysql://app_user:super-secret@db.example.com:3306/commerce')).toBe(
      'mysql://%5Buser%5D:%5Bredacted%5D@db.example.com:3306/commerce',
    );
  });

  it('requires the configured SSL CA file before attempting DB connection', () => {
    expect(() => getSslOptions({ DB_SSL_ENABLED: 'true', DB_SSL_CA_PATH: '/tmp/missing-ca.pem' })).toThrow(
      'DB_SSL_ENABLED=true but CA file does not exist: /tmp/missing-ca.pem',
    );
  });

  it('reads SSL CA content when DB SSL is enabled', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'okhwadang-ca-'));
    const caPath = path.join(dir, 'ca.pem');
    fs.writeFileSync(caPath, 'TEST CA');

    expect(getSslOptions({ DB_SSL_ENABLED: 'true', DB_SSL_CA_PATH: caPath })).toEqual({ ca: 'TEST CA' });
  });
});
