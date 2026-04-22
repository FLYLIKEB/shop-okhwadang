import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { AuditLogService } from '../../modules/audit-logs/audit-log.service';
import { AuditAction } from '../../modules/audit-logs/entities/audit-log.entity';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockAuditLogService = {
    log: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        { provide: Reflector, useValue: mockReflector },
        { provide: AuditLogService, useValue: mockAuditLogService },
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
    auditLogService = module.get(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function createMockExecutionContext(user?: { id: number; role: string }, body?: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          body,
          params: { id: '123' },
          ip: '192.168.1.1',
          headers: { 'user-agent': 'Mozilla/5.0' },
          socket: { remoteAddress: '192.168.1.1' },
        }),
      }),
      getHandler: () => ({}),
      getParamTypes: () => [],
    } as unknown as ExecutionContext;
  }

  function createMockCallHandler(responseBody?: unknown): CallHandler {
    return {
      handle: () => of(responseBody),
    };
  }

  it('should not log when no audit options are set', (done) => {
    mockReflector.get.mockReturnValue(null);
    const context = createMockExecutionContext({ id: 1, role: 'admin' }, {});
    const handler = createMockCallHandler({ id: 123 });

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(auditLogService.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('should log successful actions', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.ORDER_STATUS_UPDATE,
      resourceType: 'order',
    });
    const context = createMockExecutionContext({ id: 1, role: 'admin' }, { status: 'paid' });
    const handler = createMockCallHandler({ id: 123, status: 'paid' });

    auditLogService.log.mockResolvedValue({ id: 1 } as never);

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(auditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            actorId: 1,
            actorRole: 'admin',
            action: AuditAction.ORDER_STATUS_UPDATE,
            resourceType: 'order',
          }),
        );
        done();
      },
    });
  });

  it('should log failed actions', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.ORDER_STATUS_UPDATE,
      resourceType: 'order',
    });
    const context = createMockExecutionContext({ id: 1, role: 'admin' }, {});
    const handler = {
      handle: () => throwError(() => new Error('Bad Request')),
    };

    auditLogService.log.mockResolvedValue({ id: 1 } as never);

    interceptor.intercept(context, handler as CallHandler).subscribe({
      error: () => {
        setTimeout(() => {
          expect(auditLogService.log).toHaveBeenCalled();
          done();
        }, 0);
      },
    });
  });

  it('should prefer request.ip over x-forwarded-for header', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.LOGIN_FAILURE,
      resourceType: 'auth',
    });

    const reqWithProxy = {
      user: { id: 0, role: 'anonymous' },
      body: { email: 'test@example.com' },
      params: {},
      headers: {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        'user-agent': 'Test Agent',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '192.168.1.1' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => reqWithProxy,
      }),
      getHandler: () => ({}),
      getParamTypes: () => [],
    } as unknown as ExecutionContext;

    const handler = createMockCallHandler(null);
    auditLogService.log.mockResolvedValue({ id: 1 } as never);

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(auditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            ip: '127.0.0.1',
          }),
        );
        done();
      },
    });
  });

  it('should fall back to socket remoteAddress when request.ip is missing', (done) => {
    mockReflector.get.mockReturnValue({
      action: AuditAction.LOGIN_FAILURE,
      resourceType: 'auth',
    });

    const reqWithoutIp = {
      user: { id: 0, role: 'anonymous' },
      body: { email: 'test@example.com' },
      params: {},
      headers: {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1',
        'user-agent': 'Test Agent',
      },
      socket: { remoteAddress: '192.168.1.1' },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => reqWithoutIp,
      }),
      getHandler: () => ({}),
      getParamTypes: () => [],
    } as unknown as ExecutionContext;

    const handler = createMockCallHandler(null);
    auditLogService.log.mockResolvedValue({ id: 1 } as never);

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(auditLogService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            ip: '192.168.1.1',
          }),
        );
        done();
      },
    });
  });
});
