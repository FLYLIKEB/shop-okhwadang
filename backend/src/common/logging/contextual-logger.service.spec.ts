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
});
