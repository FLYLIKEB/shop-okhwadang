import { AsyncLocalStorage } from 'async_hooks';

export interface RequestLogContext {
  txId: string;
  method?: string;
  path?: string;
  ip?: string | null;
  userAgent?: string | null;
  userId?: number | string | null;
  memberId?: number | string | null;
  role?: string | null;
}

const requestContextStorage = new AsyncLocalStorage<RequestLogContext>();

export function runWithRequestContext<T>(context: RequestLogContext, callback: () => T): T {
  return requestContextStorage.run(context, callback);
}

export function getRequestLogContext(): RequestLogContext | undefined {
  return requestContextStorage.getStore();
}

export function updateRequestLogContext(patch: Partial<RequestLogContext>): void {
  const context = requestContextStorage.getStore();
  if (!context) return;
  Object.assign(context, patch);
}
