import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTranslator } from 'next-intl';
import { ADMIN_GUIDE_TOPICS, ADMIN_GUIDE_SCREENSHOTS, getAdminGuideTopic } from '../admin-guide';
import ko from '@/i18n/messages/ko.json';
import en from '@/i18n/messages/en.json';

function adminPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== '__tests__') return adminPages(path);
    return entry.name === 'page.tsx' ? [path] : [];
  });
}

describe('admin guide coverage', () => {
  it('renders the coupon rule JSON example as literal text', () => {
    for (const messages of [ko, en]) {
      const translate = createTranslator({
        locale: messages === ko ? 'ko' : 'en',
        messages: { value: messages.admin.couponRules.form.conditionsPlaceholder },
        onError: (error) => { throw error; },
      });
      expect(translate('value')).toBe('{"minTier":"Silver"}');
    }
  });

  it('ships a real WebP asset for each topic slide', () => {
    for (const { id } of ADMIN_GUIDE_TOPICS) {
      const slides = ADMIN_GUIDE_SCREENSHOTS[id];
      expect(Object.keys(slides)).toEqual(['first', 'second', 'third']);
      for (const path of Object.values(slides)) {
        const bytes = readFileSync(join('public', path));
        expect(bytes.toString('ascii', 0, 4), path).toBe('RIFF');
        expect(bytes.toString('ascii', 8, 12), path).toBe('WEBP');
      }
    }
  });

  it('covers every working admin route, including nested editors', () => {
    for (const file of adminPages('src/app/[locale]/admin')) {
      const route = file.replace('src/app/[locale]', '').replace(/\/page.tsx$/, '');
      if (route === '/admin/guide') continue;
      expect(getAdminGuideTopic(route), route).toBeDefined();
    }
  });

  it('matches nested routes precisely and keeps unknown routes unmatched', () => {
    expect(getAdminGuideTopic('/ko/admin/coupons/rules')?.id).toBe('couponRules');
    expect(getAdminGuideTopic('/en/admin/products/42/edit')?.id).toBe('products');
    expect(getAdminGuideTopic('/admin/orders?status=paid')?.id).toBe('orders');
    expect(getAdminGuideTopic('/admin/products-other')).toBeUndefined();
    expect(getAdminGuideTopic('/admin/guide')).toBeUndefined();
    expect(getAdminGuideTopic('/admin')?.id).toBe('dashboard');
  });

  it('has unique topics, actual destinations and complete copy in both languages', () => {
    expect(new Set(ADMIN_GUIDE_TOPICS.map(({ id }) => id)).size).toBe(ADMIN_GUIDE_TOPICS.length);
    const routes = adminPages('src/app/[locale]/admin').map((file) =>
      file.replace('src/app/[locale]', '').replace(/\/page.tsx$/, ''),
    );
    for (const topic of ADMIN_GUIDE_TOPICS) {
      expect(routes).toContain(topic.href);
      for (const messages of [ko, en]) {
        const topics = messages.admin.guide.topics;
        const copy = topics[topic.id as keyof typeof topics];
        expect(copy, topic.id).toBeDefined();
        for (const text of [copy.title, copy.summary, ...Object.values(copy.steps), copy.caution]) {
          expect(text.trim().length, topic.id).toBeGreaterThan(0);
          const translate = createTranslator({
            locale: messages === ko ? 'ko' : 'en',
            messages: { value: text },
            onError: (error) => { throw error; },
          });
          expect(translate('value')).toBe(text);
        }
        expect(Object.keys(copy.steps)).toEqual(['first', 'second', 'third']);
      }
    }
    expect(ADMIN_GUIDE_TOPICS.find(({ id }) => id === 'logs')?.superAdminOnly).toBe(true);
  });
});
