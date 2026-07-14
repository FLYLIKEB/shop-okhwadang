export const HOME_PAGE_CONTENT_ERROR_CODE = 'CMS_HOME_PAGE_MISSING';

type StorefrontDiagnosticError = Error & {
  digest?: string;
  cause?: unknown;
};

export function getHomePageContentErrorDetail(locale: string): string {
  return `DB 에 slug='home' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). 시드 데이터를 확인하세요: scripts/run-seed.sh`;
}

export function createHomePageContentError(locale: string): Error {
  const error = new Error(getHomePageContentErrorDetail(locale)) as StorefrontDiagnosticError;
  error.name = HOME_PAGE_CONTENT_ERROR_CODE;
  error.digest = HOME_PAGE_CONTENT_ERROR_CODE;
  error.cause = { code: HOME_PAGE_CONTENT_ERROR_CODE, locale };
  return error;
}

function hasHomePageContentErrorCode(value: unknown): boolean {
  return Boolean(
    value
      && typeof value === 'object'
      && 'code' in value
      && (value as { code?: unknown }).code === HOME_PAGE_CONTENT_ERROR_CODE,
  );
}

export function isHomePageContentError(error: Error): boolean {
  const diagnosticError = error as StorefrontDiagnosticError;
  return diagnosticError.name === HOME_PAGE_CONTENT_ERROR_CODE
    || diagnosticError.digest === HOME_PAGE_CONTENT_ERROR_CODE
    || hasHomePageContentErrorCode(diagnosticError.cause);
}