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
      name: 'John',
      quantity: 2,
    });

    interceptor.intercept(context, mockCallHandler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('John'));
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('4111111111111111'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('987654321'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('111-222-333'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('5500005555555559'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'),
        );
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('my-client-secret-value'),
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('900101-1234567'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('010-1234-5678'));
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('서울특별시 강남구 테헤란로 123'),
        );
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
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'));
        expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('user@example.com'));
        done();
      },
    });
  });
});
