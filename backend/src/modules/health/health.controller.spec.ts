import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            check: jest.fn(),
            liveness: jest.fn(),
            readiness: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status when DB is connected', async () => {
    const result = { status: 'ok', db: 'connected', storage: 'skipped' as const, uptime: 123.456, timestamp: '2026-03-25T00:00:00.000Z' };
    jest.spyOn(service, 'check').mockResolvedValue(result);

    expect(await controller.check()).toEqual(result);
  });
});
