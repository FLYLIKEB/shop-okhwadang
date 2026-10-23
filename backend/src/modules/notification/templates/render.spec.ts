import {
  emailDefault,
  emailRenderers,
  EmailTemplateKey,
  renderEditableEmail,
  sampleContext,
} from './editable-templates';
import { renderInquiryAnswered, renderOrderConfirmed } from './render';

describe.each(['ko', 'en'] as const)('email design (%s)', (locale) => {
  it.each(Object.keys(emailRenderers) as EmailTemplateKey[])(
    '%s keeps localized content and editable defaults in the shared responsive layout',
    (key) => {
      const context = { ...sampleContext, locale };
      const rendered = emailRenderers[key](context);
      const editable = renderEditableEmail(emailDefault(key, locale), context);

      expect(editable).toEqual(rendered);
      expect(rendered.subject).toContain(locale === 'ko' ? '옥화당' : 'Ockhwadang');
      expect(rendered.html).toContain(`<html lang="${locale}">`);
      expect(rendered.html).toContain('name="viewport"');
      expect(rendered.html.match(/<h1\b/g)).toHaveLength(1);
      expect(rendered.html).toContain('background:#F9F9F9');
      expect(rendered.html).toContain('background:#FFFFFF');
      expect(rendered.html).not.toMatch(/<script\b|<link\b|@import|url\(/i);
      expect(rendered.text).toContain(sampleContext.recipientName);
      expect(rendered.text).not.toMatch(/<\/?(?:table|td|div|style)\b/);

      const link = key === 'PASSWORD_RESET' ? context.resetUrl
        : key === 'EMAIL_VERIFICATION' ? context.verificationUrl
          : key === 'RESTOCK_ALERT' ? context.productUrl
            : key === 'INQUIRY_ANSWERED' ? undefined : context.orderUrl;
      if (link) {
        expect(rendered.html).toContain(`href="${link}"`);
        expect(rendered.html).toContain('background:#353535;color:#FFFFFF');
        expect(rendered.text).toContain(link);
      }
    },
  );

  it('preserves long and escaped order data without requiring an order link', () => {
    const productName = '<strong>차 & 다구</strong>'.repeat(40);
    const rendered = renderOrderConfirmed({
      ...sampleContext,
      locale,
      orderUrl: undefined,
      orderItems: [{ productName, quantity: 2, unitPrice: 21000,
        optionName: '용량 <100ml>', productUrl: 'https://example.com/product?x=1&y="2"' }],
    });

    expect(rendered.html).not.toContain('<strong>');
    expect(rendered.html).toContain('&lt;strong&gt;차 &amp; 다구&lt;/strong&gt;'.repeat(40));
    expect(rendered.html).toContain('href="https://example.com/product?x=1&amp;y=&quot;2&quot;"');
    expect(rendered.html).toContain('scope="col"');
    expect(rendered.html).toContain('overflow-wrap:anywhere');
    expect(rendered.html).not.toContain(`href="${sampleContext.orderUrl}"`);
    expect(rendered.text).toContain(productName);
    expect(rendered.text).toContain('21,000원');
  });

  it('preserves inquiry answer line breaks while escaping HTML', () => {
    const rendered = renderInquiryAnswered({ ...sampleContext, locale, answer: '<script>alert(1)</script>\n확인했습니다.' });
    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;<br>확인했습니다.');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.text).toContain('<script>alert(1)</script>\n확인했습니다.');
  });
});

describe('USD order email snapshots', () => {
  it('renders the saved USD total and item price in standard and editable English templates', () => {
    const context = {
      ...sampleContext,
      locale: 'en' as const,
      totalUsd: 29.99,
      orderItems: [{ productName: 'Tea', quantity: 1, unitPrice: 40487, unitPriceUsd: 29.99 }],
    };
    const rendered = renderOrderConfirmed(context);
    expect(rendered.html).toContain('$29.99');
    expect(rendered.text).toContain('$29.99');
    expect(renderEditableEmail(emailDefault('ORDER_CONFIRMED', 'en'), context)).toEqual(rendered);
    expect(renderOrderConfirmed({ ...context, locale: 'ko' }).html).not.toContain('$29.99');
  });
});
