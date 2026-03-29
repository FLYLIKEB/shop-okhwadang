export function formatPrice(value: number | string): string {
  return Math.floor(Number(value)).toLocaleString('ko-KR') + '원';
}

export function calcDiscount(price: number, salePrice: number): number {
  if (price <= 0) return 0;
  return Math.round((1 - salePrice / price) * 100);
}
