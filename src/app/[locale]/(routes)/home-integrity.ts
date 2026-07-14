export const HOME_CMS_INTEGRITY_ERROR_PREFIX = '[home-cms-integrity]';

export function createHomeCmsIntegrityError(locale: string): Error {
  return new Error(
    `${HOME_CMS_INTEGRITY_ERROR_PREFIX} slug='home' page is missing or has no blocks (locale=${locale}). Run scripts/run-seed.sh or republish the CMS page blocks.`,
  );
}

export function isHomeCmsIntegrityError(error: Error): boolean {
  return error.message.includes(HOME_CMS_INTEGRITY_ERROR_PREFIX);
}
