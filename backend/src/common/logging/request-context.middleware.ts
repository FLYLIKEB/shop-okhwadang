import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { runWithRequestContext } from './request-context';

function firstHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function cleanHeaderId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= 128 ? trimmed : undefined;
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const txId =
    cleanHeaderId(firstHeaderValue(req.headers['x-request-id'])) ??
    cleanHeaderId(firstHeaderValue(req.headers['x-correlation-id'])) ??
    randomUUID();

  res.setHeader('x-request-id', txId);

  runWithRequestContext(
    {
      txId,
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: firstHeaderValue(req.headers['user-agent']) ?? null,
    },
    next,
  );
}
