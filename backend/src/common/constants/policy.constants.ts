export const REQUIRED_CHECKOUT_POLICY_SLUGS = [
  'privacy',
  'returns',
  'shipping',
  'terms',
] as const;

export const REQUIRED_CHECKOUT_POLICY_SQL = REQUIRED_CHECKOUT_POLICY_SLUGS
  .map((slug) => `'${slug}'`)
  .join(', ');
