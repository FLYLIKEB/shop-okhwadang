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
    process.env = { ...ORIGINAL_ENV, ADMIN_LOG_PM2_LOG_DIR: tmpDir, ADMIN_LOG_PM2_APP_NAME: 'commerce' };
    service = new AdminLogsService();
  });

  afterEach(async () => {
    process.env = ORIGINAL_ENV;
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('reads recent normal PM2 out logs', async () => {
    await fs.writeFile(path.join(tmpDir, 'commerce-out.log'), Array.from({ length: 20 }, (_, i) => `out-${i + 1}`).join('\n'));

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
    await fs.writeFile(path.join(tmpDir, 'commerce-out.log'), Array.from({ length: 12 }, (_, i) => `line-${i + 1}`).join('\n'));

    const result = await service.getLogs('normal', 1);

    expect(result.lines).toBe(10);
    expect(result.lineCount).toBe(10);
  });

  it('returns a service-unavailable error when the log file is unavailable', async () => {
    await expect(service.getLogs('error', 10)).rejects.toThrow(ServiceUnavailableException);
  });
});
