import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let dataSource: DataSource;

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return ok when DB is connected', async () => {
    const result = await service.check();
    expect(result.status).toBe('ok');
    expect(result.db).toBe('connected');
    expect(result.uptime).toBeDefined();
    expect(typeof result.uptime).toBe('number');
    expect(result.timestamp).toBeDefined();
  });

  it('should throw ServiceUnavailableException when DB is disconnected', async () => {
    Object.defineProperty(dataSource, 'isInitialized', { value: false });

    await expect(service.check()).rejects.toThrow(ServiceUnavailableException);
  });
});
