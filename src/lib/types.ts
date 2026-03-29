/** 폼 에러 타입 — 로컬 재정의 제거용 공통 타입 */
export type FormErrors<T extends Record<string, unknown>> = Partial<Record<keyof T, string>>;
