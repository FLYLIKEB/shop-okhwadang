export const HOME_PAGE_CONTENT_ERROR_CODE = 'CMS_HOME_PAGE_MISSING';

export function createHomePageContentError(locale: string): Error {
  return new Error(
    `[${HOME_PAGE_CONTENT_ERROR_CODE}] DB 에 slug='home' 페이지가 없거나 블록이 비어있습니다 (locale=${locale}). ` +
      '시드 데이터를 확인하세요: scripts/run-seed.sh',
  );
}

export function isHomePageContentError(error: Error): boolean {
  return error.message.includes(`[${HOME_PAGE_CONTENT_ERROR_CODE}]`);
}
