import { NotificationTemplateService } from './notification-template.service';
import { NotificationConfig } from '../../config/notification.config';
import { NotificationTemplate } from './entities/notification-template.entity';
import { Repository } from 'typeorm';
import { SolapiTemplateAdminService } from './solapi-template-admin.service';
import { emailDefault, emailRenderers, EmailTemplateKey, renderEditableEmail, sampleContext } from './templates/editable-templates';

describe('NotificationTemplateService', () => {
  const query = { insert: jest.fn(), values: jest.fn(), orIgnore: jest.fn(), execute: jest.fn() };
  const repository = { find: jest.fn(), findOneBy: jest.fn(), findOneByOrFail: jest.fn(), upsert: jest.fn(), update: jest.fn(), createQueryBuilder: jest.fn() };
  const solapi = { read: jest.fn(), createRevision: jest.fn() };
  const config = { message: { templates: { ORDER_CREATED: 'original' } } } as NotificationConfig;
  const service = new NotificationTemplateService(repository as unknown as Repository<NotificationTemplate>, config, solapi as unknown as SolapiTemplateAdminService);

  beforeEach(() => {
    jest.resetAllMocks();
    repository.find.mockResolvedValue([]);
    repository.findOneBy.mockResolvedValue(null);
    repository.findOneByOrFail.mockResolvedValue({ updatedAt: new Date() });
    repository.createQueryBuilder.mockReturnValue(query);
    query.insert.mockReturnValue(query);
    query.values.mockReturnValue(query);
    query.orIgnore.mockReturnValue(query);
  });

  it('lists all 21 variants without exposing customer data', async () => {
    const result = await service.list();
    expect(result).toHaveLength(21);
    expect(result.every(row => row.updatedAt === null)).toBe(true);
  });

  it.each(Object.keys(emailRenderers))('preserves full existing %s design in both locales', key => {
    for (const locale of ['ko', 'en'] as const) {
      const context = { ...sampleContext, locale };
      const template = emailDefault(key as EmailTemplateKey, locale);
      expect(service.preview('email', key, locale, { ...template, templateId: '' })).toEqual(emailRenderers[key as EmailTemplateKey](context));
    }
  });

  it('escapes variables and retains generated order items', () => {
    const template = emailDefault('ORDER_CONFIRMED', 'ko');
    const rendered = renderEditableEmail(template, { ...sampleContext, recipientName: '<img src=x onerror=alert(1)>', orderItems: [{ productName: '<script>bad</script>', quantity: 1, unitPrice: 100 }] });
    expect(rendered.html).toContain('&lt;img');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.text).toContain('<script>bad</script>');
  });

  it('omits missing optional order links and option suffixes', () => {
    const order = renderEditableEmail(emailDefault('ORDER_CONFIRMED', 'ko'), { recipientName: '고객', orderNumber: '123', totalAmount: 100 });
    expect(order.html).not.toContain('href=""');
    expect(order.text).not.toContain('주문 상세 보기');
    const restock = renderEditableEmail(emailDefault('RESTOCK_ALERT', 'ko'), { recipientName: '고객', productName: '찻잔', productUrl: 'https://example.com' });
    expect(restock.subject).not.toContain('()');
  });

  it('rejects unknown templates, placeholders and missing recovery links', () => {
    const template = { ...emailDefault('PASSWORD_RESET', 'ko'), templateId: '' };
    expect(() => service.validate('email', '__proto__', 'ko', template)).toThrow();
    expect(() => service.validate('email', 'PASSWORD_RESET', 'ko', { ...template, text: '{{password}}' })).toThrow();
    expect(() => service.validate('email', 'PASSWORD_RESET', 'ko', { ...template, html: '<p>no link</p>' })).toThrow();
    expect(() => service.validate('email', 'PASSWORD_RESET', 'ko', { ...template, text: '{{ resetUrl }}' })).toThrow();
  });

  it('renders saved overrides and propagates storage failures to dispatch ownership', async () => {
    repository.findOneBy.mockResolvedValue({ subject: '{{recipientName}}', html: '<b>{{recipientName}}</b>', text: '{{recipientName}}' });
    expect(await service.renderEmail('ORDER_CONFIRMED', sampleContext)).toEqual({ subject: sampleContext.recipientName, html: `<b>${sampleContext.recipientName}</b>`, text: sampleContext.recipientName });
    repository.findOneBy.mockRejectedValue(new Error('database unavailable'));
    await expect(service.renderEmail('ORDER_CONFIRMED', sampleContext)).rejects.toThrow('database unavailable');
  });

  it('requires external approval before activating a new Alimtalk ID', async () => {
    solapi.read.mockResolvedValue({ status: 'PENDING' });
    const input = { subject: '', html: '', text: '안내 {{customerName}}', templateId: 'new-id' };
    await expect(service.save('alimtalk', 'ORDER_CREATED', 'ko', input)).rejects.toThrow('승인');
    expect(repository.upsert).not.toHaveBeenCalled();
    solapi.read.mockResolvedValue({ status: 'APPROVED' });
    await service.save('alimtalk', 'ORDER_CREATED', 'ko', input);
    expect(repository.upsert).toHaveBeenCalled();
  });

  it('persists pending revision without replacing the active template', async () => {
    solapi.createRevision.mockResolvedValue({ templateId: 'pending-id', status: 'PENDING', content: '변경 #{customerName}' });
    await service.createRevision('ORDER_CREATED', { subject: '', html: '', text: '변경 {{customerName}}', templateId: 'original' });
    expect(query.values).toHaveBeenCalledWith(expect.objectContaining({ templateId: 'original', text: expect.stringContaining('접수가 완료') }));
    expect(query.orIgnore).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith({ channel: 'alimtalk', key: 'ORDER_CREATED', locale: 'ko' }, { pendingTemplateId: 'pending-id' });
  });
});
