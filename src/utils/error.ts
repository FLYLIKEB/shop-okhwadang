const HANGUL_PATTERN = /[가-힣]/;

const ENGLISH_GENERIC_ERROR = 'An error occurred.';

const COMMON_KOREAN_ERROR_TRANSLATIONS: Record<string, string> = {
  '오류가 발생했습니다.': ENGLISH_GENERIC_ERROR,
  '접근 권한이 없습니다.': 'You do not have permission to access this.',
  '토큰 갱신 함수가 등록되지 않았습니다.': 'The session refresh handler is not available.',
  '로그인에 실패했습니다.': 'Login failed.',
  '결제에 실패했습니다.': 'Payment failed.',
  '결제 초기화 오류': 'Failed to initialize payment.',
  '적립금을 불러오지 못했습니다.': 'Failed to load points.',
  '저널 목록을 불러오지 못했습니다.': 'Failed to load journal entries.',
};

function isEnglishDocument(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.lang === 'en' || (window.location.pathname ?? '').startsWith('/en');
}

function localizeErrorMessage(message: string, fallback: string): string {
  if (!isEnglishDocument()) return message;
  if (!HANGUL_PATTERN.test(message)) return message;

  const translated = COMMON_KOREAN_ERROR_TRANSLATIONS[message];
  if (translated) return translated;
  if (!HANGUL_PATTERN.test(fallback)) return fallback;
  return ENGLISH_GENERIC_ERROR;
}

export function handleApiError(err: unknown, fallback = '오류가 발생했습니다.'): string {
  const message = err instanceof Error ? err.message : fallback;
  return localizeErrorMessage(message, fallback);
}
