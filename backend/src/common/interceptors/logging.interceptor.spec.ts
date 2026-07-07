import { LoggingInterceptor } from './logging.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  const createMockContext = (
    body: Record<string, unknown>,
    overrides: Record<string, unknown> = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/test',
          body,
          params: {},
          query: {},
          ...overrides,
        }),
        getResponse: () => ({ statusCode: 201 }),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
    }) as unknown as ExecutionContext;

  const lastLogPayload = (spy: jest.SpyInstance): string =>
    JSON.stringify(spy.mock.calls.at(-1)?.[0]);

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
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('secret123');
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
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('Bearer token123');
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
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('4111111111111111');
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
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('nested-secret');
        done();
      },
    });
  });

  it('should pass through normal fields unchanged', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      productName: 'John',
      quantity: 2,
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('John');
        expect(lastLogPayload(logSpy)).toContain('2');
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

  it('should redact cardnumber field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      cardnumber: '4111111111111111',
      amount: 30000,
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('4111111111111111');
        done();
      },
    });
  });

  it('should redact accountnumber field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      accountnumber: '987654321',
      bank: 'KB',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('987654321');
        done();
      },
    });
  });

  it('should redact bankaccount field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      bankaccount: '111-222-333',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('111-222-333');
        done();
      },
    });
  });

  it('should redact cardno field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      cardno: '5500005555555559',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('5500005555555559');
        done();
      },
    });
  });

  it('should redact refreshtoken field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
        done();
      },
    });
  });

  it('should redact secret field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      clientSecret: 'my-client-secret-value',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('my-client-secret-value');
        done();
      },
    });
  });

  it('should include request ids, member id, status, and duration for easier PM2 tracing', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext(
      { orderId: 'ORD-1', transactionId: 'TX-1', productName: 'tea' },
      { user: { id: 42, role: 'user' }, query: { paymentKey: 'PAY-1' } },
    );

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.objectContaining({
          event: 'http_request',
          outcome: 'completed',
          method: 'POST',
          path: '/api/test',
          statusCode: 201,
          ids: expect.objectContaining({
            orderId: 'ORD-1',
            transactionId: 'TX-1',
            paymentKey: 'PAY-1',
          }),
          durationMs: expect.any(Number),
        }));
        done();
      },
    });
  });

  it('should log failed requests with an error summary', (done) => {
    const errorSpy = jest.spyOn(interceptor['logger'], 'error').mockImplementation();
    const context = createMockContext({ orderId: 'ORD-2' });
    const failingHandler: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    interceptor.intercept(context, failingHandler).subscribe({
      error: () => {
        expect(errorSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'http_request',
            outcome: 'failed',
            error: { name: 'Error', message: 'boom' },
          }),
          expect.any(String),
        );
        done();
      },
    });
  });

  it('should redact ssn field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      ssn: '900101-1234567',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('900101-1234567');
        done();
      },
    });
  });

  it('should redact phone field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      phone: '010-1234-5678',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('010-1234-5678');
        done();
      },
    });
  });

  it('should redact address field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      address: '서울특별시 강남구 테헤란로 123',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('서울특별시 강남구 테헤란로 123');
        done();
      },
    });
  });

  it('should redact email field', (done) => {
    const logSpy = jest.spyOn(interceptor['logger'], 'log');
    const context = createMockContext({
      email: 'user@example.com',
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(lastLogPayload(logSpy)).toContain('[REDACTED]');
        expect(lastLogPayload(logSpy)).not.toContain('user@example.com');
        done();
      },
    });
  });
});
