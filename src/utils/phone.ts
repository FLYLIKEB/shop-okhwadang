export function formatPhone(phone: string | null | undefined | number): string {
  if (!phone) return '';

  const cleaned = String(phone).replace(/[-\s]/g, '');

  if (/^01[016789]\d{8}$/.test(cleaned)) {
    const num = cleaned.slice(1);
    return `+82 ${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6)}`;
  }

  if (/^02\d{7,8}$/.test(cleaned)) {
    return `+82 ${cleaned}`;
  }

  const match = cleaned.match(/^(\d{2,3})(\d{3,4})(\d{4})$/);
  if (match) {
    return `+82 ${match[1]}-${match[2]}-${match[3]}`;
  }

  return String(phone);
}
