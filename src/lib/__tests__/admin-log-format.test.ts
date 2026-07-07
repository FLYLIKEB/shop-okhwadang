import { describe, expect, it } from 'vitest';
import { getAdminLogField, parseAdminLogContent, parseAdminLogLine } from '../admin-log-format';

describe('admin log formatter', () => {
  it('parses structured JSON logs in the display order used by the admin UI', () => {
    const entry = parseAdminLogLine(
      JSON.stringify({
        body: { orderId: 'ORD-1' },
        txId: 'tx-1',
        requestId: 'req-1',
        level: 'log',
        ts: '2026-07-07T05:03:19.700Z',
        context: 'LoggingInterceptor',
        memberId: 42,
        method: 'POST',
        path: '/api/orders',
        statusCode: 201,
        durationMs: 13,
        event: 'http_request',
        ids: { orderId: 'ORD-1' },
        ip: '203.0.113.10',
      }),
      1,
    );

    expect(entry.parsed).toBe(true);
    expect(entry.fields.map((field) => field.key)).toEqual([
      'ts',
      'level',
      'context',
      'txId',
      'requestId',
      'memberId',
      'method',
      'path',
      'statusCode',
      'durationMs',
      'event',
      'ids',
      'body',
      'ip',
    ]);
    expect(entry.fields[0].order).toBe(1);
    expect(entry.summary).toContain('POST /api/orders');
    expect(getAdminLogField(entry, ['requestId', 'txId'])).toBe('req-1');
    expect(getAdminLogField(entry, ['ip'])).toBe('203.0.113.10');
  });

  it('keeps legacy non-json log lines readable', () => {
    const entry = parseAdminLogLine('[Nest] WARN legacy log', 7);

    expect(entry).toMatchObject({
      lineNumber: 7,
      parsed: false,
      summary: '[Nest] WARN legacy log',
      raw: '[Nest] WARN legacy log',
    });
  });

  it('parses JSON after a PM2-style prefix', () => {
    const [entry] = parseAdminLogContent('0|commerce | {"level":"error","msg":"boom"}');

    expect(entry.parsed).toBe(true);
    expect(entry.fields.map((field) => field.key)).toEqual(['level', 'msg']);
  });
});
