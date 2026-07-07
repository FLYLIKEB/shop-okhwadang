import { Injectable, LoggerService } from '@nestjs/common';
import { getRequestLogContext } from './request-context';
import { redactSensitiveFields } from '../utils/redaction.util';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

type LogPayload = Record<string, unknown>;

function normalizeMessage(message: unknown): LogPayload {
  if (message && typeof message === 'object') {
    return redactSensitiveFields(message as Record<string, unknown>) ?? { msg: String(message) };
  }
  return { msg: String(message) };
}

function normalizeContext(optionalParams: unknown[]): { context?: string; meta?: unknown[] } {
  if (optionalParams.length === 0) return {};
  const last = optionalParams[optionalParams.length - 1];
  if (typeof last === 'string') {
    const meta = optionalParams.slice(0, -1);
    return { context: last, ...(meta.length ? { meta } : {}) };
  }
  return { meta: optionalParams };
}

function writeLine(level: LogLevel, line: string): void {
  const stream = level === 'error' || level === 'fatal' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

@Injectable()
export class ContextualLogger implements LoggerService {
  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', message, optionalParams);
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    const [first, ...rest] = optionalParams;
    const stack = typeof first === 'string' && first.includes('\n') ? first : undefined;
    this.write('error', message, stack ? rest : optionalParams, stack);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', message, optionalParams);
  }

  private write(level: LogLevel, message: unknown, optionalParams: unknown[], stack?: string): void {
    const request = getRequestLogContext();
    const { context, meta } = normalizeContext(optionalParams);
    const payload = normalizeMessage(message);

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      service: 'commerce',
      pid: process.pid,
      ...(context ? { context } : {}),
      ...(request
        ? {
            txId: request.txId,
            transactionId: request.txId,
            method: request.method,
            path: request.path,
            ip: request.ip,
            userAgent: request.userAgent,
            userId: request.userId ?? null,
            memberId: request.memberId ?? request.userId ?? null,
            role: request.role ?? null,
          }
        : {}),
      ...payload,
      ...(stack ? { stack } : {}),
      ...(meta ? { meta: redactSensitiveFields({ values: meta })?.values } : {}),
    });

    writeLine(level, line);
  }
}
