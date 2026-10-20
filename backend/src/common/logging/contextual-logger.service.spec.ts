import { ContextualLogger } from './contextual-logger.service';
import { runWithRequestContext } from './request-context';

describe('ContextualLogger', () => {
  let logger: ContextualLogger;
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new ContextualLogger();
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it('writes structured JSON with transaction and member context', () => {
    runWithRequestContext(
      {
        txId: 'tx-123',
        method: 'POST',
        path: '/api/orders',
        ip: '127.0.0.1',
        userAgent: 'jest',
        userId: 42,
        memberId: 42,
        role: 'user',
      },
      () => logger.log({ event: 'checkout', orderId: 'ORD-1' }, 'OrdersService'),
    );

    const raw = String(stdoutSpy.mock.calls[0][0]).trim();
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    expect(parsed).toEqual(expect.objectContaining({
      level: 'log',
      service: 'commerce',
      context: 'OrdersService',
      txId: 'tx-123',
      transactionId: 'tx-123',
      userId: 42,
      memberId: 42,
      event: 'checkout',
      orderId: 'ORD-1',
    }));
  });

  it('redacts sensitive fields from object messages', () => {
    logger.log({ password: 'secret', visible: 'ok' });

    const parsed = JSON.parse(String(stdoutSpy.mock.calls[0][0]).trim()) as Record<string, unknown>;

    expect(parsed.password).toBe('[REDACTED]');
    expect(parsed.visible).toBe('ok');
  });

  it('keeps payment keys out of serialized logs and metadata', () => {
    logger.log({
      body: { paymentKey: 'FAKE-PAYMENT-KEY-AUDIT-ONLY' },
      ids: { payment_key: 'FAKE-PAYMENT-KEY-AUDIT-ONLY', orderId: 'ORD-1', transactionId: 'TX-1' },
    }, { PAYMENT_KEY: 'FAKE-PAYMENT-KEY-AUDIT-ONLY' }, 'PaymentsController');

    const raw = String(stdoutSpy.mock.calls[0][0]);
    expect(raw).not.toContain('FAKE-PAYMENT-KEY-AUDIT-ONLY');
    expect(JSON.parse(raw)).toEqual(expect.objectContaining({
      body: { paymentKey: '[REDACTED]' },
      ids: { payment_key: '[REDACTED]', orderId: 'ORD-1', transactionId: 'TX-1' },
      meta: [{ PAYMENT_KEY: '[REDACTED]' }],
    }));
  });
});
