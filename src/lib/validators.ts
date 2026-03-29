/** 전화번호: 010-1234-5678 형식 */
export function isValidPhone(phone: string): boolean {
  return /^01[0-9]-\d{3,4}-\d{4}$/.test(phone);
}

/** 우편번호: 5자리 숫자 */
export function isValidZipcode(zipcode: string): boolean {
  return /^\d{5}$/.test(zipcode);
}

/** 이메일 기본 형식 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** 비밀번호: 최소 8자 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}
