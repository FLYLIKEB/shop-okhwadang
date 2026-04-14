export const SITE_URL =
  process.env.SITE_URL
  ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  ?? 'https://ockhwadang.com';
