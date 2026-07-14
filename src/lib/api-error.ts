const DEFAULT_API_ERROR_MESSAGE = '오류가 발생했습니다.';

export class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export function normalizeApiErrorMessage(
  rawMessage: unknown,
  status: number,
  fallbackMessage = DEFAULT_API_ERROR_MESSAGE,
): string {
  const message = Array.isArray(rawMessage)
    ? rawMessage.join(', ')
    : typeof rawMessage === 'string' && rawMessage.trim()
      ? rawMessage
      : fallbackMessage;

  if (status === 403 && message === 'Forbidden') {
    return '접근 권한이 없습니다.';
  }

  return message;
}

export async function createApiHttpError(
  response: Pick<Response, 'json' | 'status'>,
  fallbackMessage = DEFAULT_API_ERROR_MESSAGE,
): Promise<ApiHttpError> {
  const payload = (await response.json().catch(() => ({ message: fallbackMessage }))) as {
    message?: unknown;
  };

  return new ApiHttpError(
    normalizeApiErrorMessage(payload.message, response.status, fallbackMessage),
    response.status,
  );
}

export function isEmptyApiResponse(response: Pick<Response, 'status' | 'headers'>): boolean {
  return response.status === 204 || response.headers.get('content-length') === '0';
}
