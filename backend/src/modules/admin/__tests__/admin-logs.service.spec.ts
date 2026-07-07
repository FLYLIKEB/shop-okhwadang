import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ServiceUnavailableException } from '@nestjs/common';
import { AdminLogsService } from '../admin-logs.service';

const ORIGINAL_ENV = process.env;

describe('AdminLogsService', () => {
  let tmpDir: string;
  let service: AdminLogsService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-logs-'));
    process.env = {
      ...ORIGINAL_ENV,
      ADMIN_LOG_PM2_LOG_DIR: tmpDir,
      ADMIN_LOG_PM2_APP_NAME: 'commerce',
    };
    service = new AdminLogsService();
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads recent normal PM2 out logs', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'commerce-out.log'),
      Array.from({ length: 20 }, (_, i) => `out-${i + 1}`).join('\n'),
    );

    const result = await service.getLogs('normal', 10);

    expect(result.type).toBe('normal');
    expect(result.source).toBe('pm2:commerce:out');
    expect(result.lineCount).toBe(10);
    expect(result.content.split('\n')[0]).toBe('out-11');
    expect(result.content.split('\n')[9]).toBe('out-20');
    expect(result.truncated).toBe(true);
  });

  it('reads recent error PM2 logs', async () => {
    await fs.writeFile(path.join(tmpDir, 'commerce-error.log'), 'first\nsecond\nthird\n');

    const result = await service.getLogs('error', 10);

    expect(result.type).toBe('error');
    expect(result.source).toBe('pm2:commerce:error');
    expect(result.content).toBe('first\nsecond\nthird');
    expect(result.lineCount).toBe(3);
    expect(result.updatedAt).toEqual(expect.any(String));
  });

  it('clamps requested lines to the supported range', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'commerce-out.log'),
      Array.from({ length: 12 }, (_, i) => `line-${i + 1}`).join('\n'),
    );

    const result = await service.getLogs('normal', 1);

    expect(result.lines).toBe(10);
    expect(result.lineCount).toBe(10);
  });

  it('filters logs by search text before applying the line limit', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'commerce-out.log'),
      [
        '{"ts":"2026-07-07T01:00:00.000Z","txId":"tx-keep","msg":"checkout ok"}',
        '{"ts":"2026-07-07T01:01:00.000Z","txId":"tx-skip","msg":"health"}',
        '{"ts":"2026-07-07T01:02:00.000Z","requestId":"req-keep","msg":"order failed"}',
      ].join('\n'),
    );

    const result = await service.getLogs('normal', 10, { search: 'keep' });

    expect(result.lineCount).toBe(2);
    expect(result.content).toContain('tx-keep');
    expect(result.content).toContain('req-keep');
    expect(result.content).not.toContain('tx-skip');
  });

  it('filters structured logs by timestamp range', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'commerce-error.log'),
      [
        '{"ts":"2026-07-07T00:59:59.000Z","msg":"before"}',
        '{"ts":"2026-07-07T01:00:00.000Z","msg":"inside"}',
        '{"ts":"2026-07-07T02:00:01.000Z","msg":"after"}',
      ].join('\n'),
    );

    const result = await service.getLogs('error', 10, {
      startAt: '2026-07-07T01:00:00.000Z',
      endAt: '2026-07-07T02:00:00.000Z',
    });

    expect(result.lineCount).toBe(1);
    expect(result.content).toContain('inside');
    expect(result.content).not.toContain('before');
    expect(result.content).not.toContain('after');
  });

  it('returns a service-unavailable error when the log file is unavailable', async () => {
    await expect(service.getLogs('error', 10)).rejects.toThrow(ServiceUnavailableException);
  });
});
