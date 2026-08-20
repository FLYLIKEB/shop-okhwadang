export function isCheckoutLightPath(pathname: string): boolean {
  return /\/(?:cart|checkout)(?:\/|$)/.test(pathname) || /\/order\/complete(?:\/|$)/.test(pathname);
}
