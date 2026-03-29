import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockContext = (
    body: Record<string, unknown>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/test',
          body,
        }),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
    }) as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ result: 'ok' }),
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should redact password field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      email: 'test@test.com',
      password: 'secret123',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('secret123'));
        done();
      },
    });
  });

  it('should redact authorization field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      authorization: 'Bearer token123',
      data: 'visible',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Bearer token123'));
        done();
      },
    });
  });

  it('should redact credit_card and cvv fields', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      credit_card: '4111111111111111',
      cvv: '123',
      name: 'John',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('4111111111111111'));
        done();
      },
    });
  });

  it('should redact nested sensitive fields', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      user: { password: 'nested-secret' },
      name: 'John',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('nested-secret'));
        done();
      },
    });
  });

  it('should pass through normal fields unchanged', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      email: 'test@test.com',
      name: 'John',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test@test.com'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('John'));
        done();
      },
    });
  });

  it('should handle null body gracefully', (done) => {
    const context = createMockContext(
      null as unknown as Record<string, unknown>,
    );

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => done(),
    });
  });
});
