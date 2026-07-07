import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  HeadBucketCommand: jest.fn(),
}));

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: DataSource;

  beforeEach(async () => {
    mockS3Send.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useValue: {
            isInitialized: true,
            query: jest.fn().mockResolvedValue([{ 1: 1 }]),
          },
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    delete process.env.AWS_S3_BUCKET_NAME;
    delete process.env.AWS_REGION;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ok when DB is connected', async () => {
    const result = await service.readiness();
    expect(result.status).toBe('ok');
    expect(result.db).toEqual({ status: 'connected' });
    expect(result.storage).toBeDefined();
    expect(result.uptime).toBeDefined();
    expect(typeof result.uptime).toBe('number');
    expect(result.timestamp).toBeDefined();
  });

  it('should throw ServiceUnavailableException with diagnostic reason when DB is not initialized', async () => {
    Object.defineProperty(dataSource, 'isInitialized', { value: false });

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
    await service.check().catch((error: ServiceUnavailableException) => {
      expect(error.getResponse()).toMatchObject({
        status: 'error',
        db: { status: 'disconnected', reason: 'not_initialized' },
        storage: 'unknown',
      });
    });
  });

  it('should expose database driver error codes without leaking credentials', async () => {
    const dbError = Object.assign(new Error('connect ETIMEDOUT mysql://user:secret@db.example.com'), { code: 'ETIMEDOUT' });
    jest.spyOn(dataSource, 'query').mockRejectedValueOnce(dbError);

    await service.readiness().catch((error: ServiceUnavailableException) => {
      expect(error.getResponse()).toMatchObject({
        db: { status: 'disconnected', reason: 'ETIMEDOUT' },
      });
      expect(JSON.stringify(error.getResponse())).not.toContain('secret');
    });
  });

  it('should not report storage failures as database failures', async () => {
    process.env.AWS_S3_BUCKET_NAME = 'bucket';
    process.env.AWS_REGION = 'ap-northeast-2';
    process.env.AWS_ACCESS_KEY_ID = 'key';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret';
    mockS3Send.mockRejectedValueOnce(Object.assign(new Error('S3 unavailable'), { name: 'TimeoutError' }));

    const result = await service.readiness();

    expect(result.status).toBe('ok');
    expect(result.db).toEqual({ status: 'connected' });
    expect(result.storage).toBe('disconnected');
    expect(result.storageReason).toBeDefined();

  });
});
