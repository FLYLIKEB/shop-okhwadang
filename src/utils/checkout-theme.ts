export function isCheckoutLightPath(pathname: string): boolean {
  return /\/checkout(?:\/|$)/.test(pathname) || /\/order\/complete(?:\/|$)/.test(pathname);
}
