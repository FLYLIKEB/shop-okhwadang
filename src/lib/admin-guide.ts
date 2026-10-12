export const ADMIN_GUIDE_GROUPS = ['start', 'catalog', 'operations', 'content', 'settings'] as const;

interface AdminGuideTopic {
  id: string;
  group: (typeof ADMIN_GUIDE_GROUPS)[number];
  href: string;
  superAdminOnly?: boolean;
}

export const ADMIN_GUIDE_TOPICS: readonly AdminGuideTopic[] = [
  { id: 'dashboard', group: 'start', href: '/admin/dashboard' },
  { id: 'products', group: 'catalog', href: '/admin/products' },
  { id: 'categories', group: 'catalog', href: '/admin/categories' },
  { id: 'attributes', group: 'catalog', href: '/admin/attributes' },
  { id: 'orders', group: 'operations', href: '/admin/orders' },
  { id: 'members', group: 'operations', href: '/admin/members' },
  { id: 'coupons', group: 'operations', href: '/admin/coupons' },
  { id: 'couponRules', group: 'operations', href: '/admin/coupons/rules' },
  { id: 'points', group: 'operations', href: '/admin/points' },
  { id: 'reviews', group: 'operations', href: '/admin/reviews' },
  { id: 'inquiries', group: 'operations', href: '/admin/inquiries' },
  { id: 'pages', group: 'content', href: '/admin/pages' },
  { id: 'navigation', group: 'content', href: '/admin/navigation' },
  { id: 'announcementBars', group: 'content', href: '/admin/announcement-bars' },
  { id: 'journal', group: 'content', href: '/admin/journal' },
  { id: 'faqs', group: 'content', href: '/admin/faqs' },
  { id: 'localization', group: 'content', href: '/admin/localization' },
  { id: 'theme', group: 'settings', href: '/admin/settings/theme' },
  { id: 'business', group: 'settings', href: '/admin/settings/business' },
  { id: 'logs', group: 'settings', href: '/admin/logs', superAdminOnly: true },
];

export function getAdminGuideTopic(pathname: string): AdminGuideTopic | undefined {
  const path = pathname.replace(/^\/(ko|en)(?=\/|$)/, '').split(/[?#]/)[0];
  if (path === '/admin' || path === '/admin/') return ADMIN_GUIDE_TOPICS[0];
  return ADMIN_GUIDE_TOPICS.filter(({ href }) => path === href || path.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export const ADMIN_GUIDE_SCREENSHOTS: Record<string, { first: string; second: string; third: string }> = {
  ...Object.fromEntries(
    ADMIN_GUIDE_TOPICS.map(({ id }) => [id, {
      first: `/images/admin-guide/${id}.webp`,
      second: `/images/admin-guide/${id}.webp`,
      third: `/images/admin-guide/${id}.webp`,
    }]),
  ),
  products: {
    first: '/images/admin-guide/products.webp',
    second: '/images/admin-guide/products-editor.webp',
    third: '/images/admin-guide/products-preview.webp',
  },
  categories: {
    first: '/images/admin-guide/categories-editor.webp',
    second: '/images/admin-guide/categories.webp',
    third: '/images/admin-guide/categories.webp',
  },
  attributes: {
    first: '/images/admin-guide/attributes.webp',
    second: '/images/admin-guide/attributes-values.webp',
    third: '/images/admin-guide/attributes-values.webp',
  },
  orders: {
    first: '/images/admin-guide/orders.webp',
    second: '/images/admin-guide/orders-shipping.webp',
    third: '/images/admin-guide/orders-messages.webp',
  },
  coupons: {
    first: '/images/admin-guide/coupons.webp',
    second: '/images/admin-guide/coupons-editor.webp',
    third: '/images/admin-guide/coupons-issue.webp',
  },
  couponRules: {
    first: '/images/admin-guide/couponRules.webp',
    second: '/images/admin-guide/couponRules.webp',
    third: '/images/admin-guide/couponRules-condition.webp',
  },
  points: {
    first: '/images/admin-guide/points.webp',
    second: '/images/admin-guide/points.webp',
    third: '/images/admin-guide/points-adjust.webp',
  },
  reviews: {
    first: '/images/admin-guide/reviews.webp',
    second: '/images/admin-guide/reviews.webp',
    third: '/images/admin-guide/reviews-detail.webp',
  },
  inquiries: {
    first: '/images/admin-guide/inquiries.webp',
    second: '/images/admin-guide/inquiries-answer.webp',
    third: '/images/admin-guide/inquiries-answer.webp',
  },
  pages: {
    first: '/images/admin-guide/pages.webp',
    second: '/images/admin-guide/pages-editor.webp',
    third: '/images/admin-guide/pages-preview.webp',
  },
  navigation: {
    first: '/images/admin-guide/navigation.webp',
    second: '/images/admin-guide/navigation-editor.webp',
    third: '/images/admin-guide/navigation.webp',
  },
  announcementBars: {
    first: '/images/admin-guide/announcementBars-editor.webp',
    second: '/images/admin-guide/announcementBars-editor.webp',
    third: '/images/admin-guide/announcementBars.webp',
  },
  journal: {
    first: '/images/admin-guide/journal-editor.webp',
    second: '/images/admin-guide/journal-content.webp',
    third: '/images/admin-guide/journal.webp',
  },
  faqs: {
    first: '/images/admin-guide/faqs-editor.webp',
    second: '/images/admin-guide/faqs-editor.webp',
    third: '/images/admin-guide/faqs.webp',
  },
};
