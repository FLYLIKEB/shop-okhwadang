import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationTemplate } from './entities/notification-template.entity';
import { UpdateNotificationTemplateDto } from './dto/update-notification-template.dto';
import { emailDefault, emailRenderers, emailVariables, EmailContext, EmailTemplateKey, messageDefaults, sampleContext, substitute, renderEditableEmail } from './templates/editable-templates';
import { MessageTemplateKey } from './interfaces/message-provider.interface';
import { NOTIFICATION_CONFIG, NotificationConfig } from '../../config/notification.config';
import { SolapiTemplateAdminService } from './solapi-template-admin.service';

@Injectable()
export class NotificationTemplateService {
  constructor(
    @InjectRepository(NotificationTemplate) private readonly repository: Repository<NotificationTemplate>,
    @Inject(NOTIFICATION_CONFIG) private readonly config: NotificationConfig,
    private readonly solapi: SolapiTemplateAdminService,
  ) {}

  definition(channel: string, key: string, locale: string) {
    if (!((channel === 'email' && Object.hasOwn(emailRenderers, key) && ['ko', 'en'].includes(locale)) ||
      (channel === 'alimtalk' && Object.hasOwn(messageDefaults, key) && locale === 'ko'))) {
      throw new NotFoundException('알림 템플릿을 찾을 수 없습니다.');
    }
    const content = channel === 'email' ? emailDefault(key as EmailTemplateKey, locale as 'ko' | 'en')
      : { subject: '', html: '', text: messageDefaults[key as MessageTemplateKey] };
    const variables = [...new Set(Object.values(content).flatMap(value => [...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1])))];
    return { channel: channel as 'email' | 'alimtalk', key, locale: locale as 'ko' | 'en', ...content,
      templateId: channel === 'alimtalk' ? this.config.message.templates[key as MessageTemplateKey] : '', pendingTemplateId: null as string | null, variables, updatedAt: null as string | null };
  }

  async list() {
    const saved = await this.repository.find();
    const defaults = [
      ...Object.keys(emailRenderers).flatMap(key => ['ko', 'en'].map(locale => this.definition('email', key, locale))),
      ...Object.keys(messageDefaults).map(key => this.definition('alimtalk', key, 'ko')),
    ];
    return defaults.map(definition => {
      const override = saved.find(row => row.channel === definition.channel && row.key === definition.key && row.locale === definition.locale);
      return override ? { ...definition, ...override, updatedAt: override.updatedAt.toISOString() } : definition;
    });
  }

  validate(channel: string, key: string, locale: string, input: UpdateNotificationTemplateDto) {
    const definition = this.definition(channel, key, locale);
    for (const field of ['subject', 'html', 'text', 'templateId'] as const) {
      if (typeof input[field] !== 'string' || input[field].length > ({ subject: 255, html: 100000, text: 10000, templateId: 100 })[field]) {
        throw new BadRequestException('템플릿 입력 형식 또는 길이를 확인해 주세요.');
      }
    }
    for (const field of ['subject', 'html', 'text'] as const) {
      const remaining = input[field].replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
        if (!definition.variables.includes(name) || (name === 'orderItemsHtml' && field !== 'html')) throw new BadRequestException(`지원하지 않는 변수: ${name}`);
        return '';
      });
      if (remaining.includes('{{') || remaining.includes('}}')) throw new BadRequestException('변수 형식을 확인해 주세요.');
    }
    if (!input.text.trim() || (channel === 'email' && (!input.subject.trim() || !input.html.trim()))) throw new BadRequestException('제목과 본문을 입력해 주세요.');
    if (/[\r\n]/.test(input.subject)) throw new BadRequestException('제목에는 줄바꿈을 사용할 수 없습니다.');
    if (input.templateId && !/^[a-zA-Z0-9_-]+$/.test(input.templateId)) throw new BadRequestException('템플릿 ID 형식을 확인해 주세요.');
    if (channel === 'email' && input.templateId) throw new BadRequestException('메일에는 알림톡 템플릿 ID를 사용할 수 없습니다.');
    if (channel === 'alimtalk' && (input.subject || input.html)) throw new BadRequestException('알림톡은 텍스트 본문을 사용합니다.');
    const required = key === 'PASSWORD_RESET' ? 'resetUrl' : key === 'EMAIL_VERIFICATION' ? 'verificationUrl' : null;
    if (required && (!input.html.includes(`{{${required}}}`) || !input.text.includes(`{{${required}}}`))) throw new BadRequestException(`필수 링크 변수: ${required}`);
    return definition;
  }

  async save(channel: string, key: string, locale: string, input: UpdateNotificationTemplateDto) {
    const definition = this.validate(channel, key, locale, input);
    if (channel === 'alimtalk' && input.templateId) {
      const existing = await this.repository.findOneBy({ channel: 'alimtalk', key, locale: 'ko' });
      if (input.templateId !== (existing?.templateId ?? definition.templateId)) {
        const remote = await this.solapi.read(input.templateId, definition.variables);
        if (remote.status !== 'APPROVED') throw new BadRequestException('승인 완료된 알림톡 템플릿만 활성화할 수 있습니다.');
      }
    }
    await this.repository.upsert({ channel: definition.channel, key, locale: definition.locale, ...input }, ['channel', 'key', 'locale']);
    if (channel === 'alimtalk' && input.templateId) {
      await this.repository.update({ channel: 'alimtalk', key, locale: 'ko', pendingTemplateId: input.templateId }, { pendingTemplateId: null });
    }
    const saved = await this.repository.findOneByOrFail({ channel: definition.channel, key, locale: definition.locale });
    return { ...definition, ...saved, updatedAt: saved.updatedAt.toISOString() };
  }

  preview(channel: string, key: string, locale: string, input: UpdateNotificationTemplateDto) {
    this.validate(channel, key, locale, input);
    if (channel === 'email') return renderEditableEmail(input, { ...sampleContext, locale: locale as 'ko' | 'en' });
    const variables = emailVariables({ ...sampleContext, locale: locale as 'ko' | 'en' });
    return { subject: substitute(input.subject, variables), html: substitute(input.html, variables, true), text: substitute(input.text, variables) };
  }

  async renderEmail(key: EmailTemplateKey, context: EmailContext) {
    const saved = await this.repository.findOneBy({ channel: 'email', key, locale: context.locale ?? 'ko' });
    if (!saved) {
      const renderer = emailRenderers[key] as (input: EmailContext) => { subject: string; html: string; text: string };
      return renderer(context);
    }
    return renderEditableEmail(saved, context);
  }

  async messageOverride(key: MessageTemplateKey) {
    return this.repository.findOneBy({ channel: 'alimtalk', key, locale: 'ko' });
  }

  async createRevision(key: string, input: UpdateNotificationTemplateDto) {
    const definition = this.validate('alimtalk', key, 'ko', input);
    const remote = await this.solapi.createRevision(input.templateId, input.text.replace(/\{\{(\w+)\}\}/g, '#{$1}'), definition.variables);
    await this.repository.createQueryBuilder().insert().values({
      channel: 'alimtalk', key, locale: 'ko', subject: definition.subject,
      html: definition.html, text: definition.text, templateId: definition.templateId,
    }).orIgnore().execute();
    await this.repository.update({ channel: 'alimtalk', key, locale: 'ko' }, { pendingTemplateId: remote.templateId });
    return remote;
  }
}
