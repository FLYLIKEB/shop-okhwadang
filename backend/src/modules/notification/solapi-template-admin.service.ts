import { BadGatewayException, BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { createHmac, randomUUID } from 'crypto';
import { NOTIFICATION_CONFIG, NotificationConfig } from '../../config/notification.config';

export interface SolapiTemplateSummary {
  templateId: string;
  content: string;
  status: 'PENDING' | 'INSPECTING' | 'APPROVED' | 'REJECTED';
}

const PRESENTATION_FIELDS = [
  'buttons', 'quickReplies', 'messageType', 'emphasizeType', 'header', 'highlight',
  'item', 'extra', 'ad', 'emphasizeTitle', 'emphasizeSubtitle', 'securityFlag', 'imageId',
] as const;

@Injectable()
export class SolapiTemplateAdminService {
  constructor(@Inject(NOTIFICATION_CONFIG) private readonly config: NotificationConfig) {}

  async read(templateId: string, allowedVariables?: readonly string[]): Promise<SolapiTemplateSummary> {
    const source = await this.readSource(templateId);
    this.validateVariables(source, allowedVariables);
    return this.summarize(source);
  }

  async createRevision(sourceTemplateId: string, content: string, allowedVariables?: readonly string[]): Promise<SolapiTemplateSummary> {
    if (typeof content !== 'string' || !content.trim() || content.length > 1000) {
      throw new BadRequestException('알림톡 내용은 1~1000자로 입력해 주세요.');
    }
    const source = await this.readSource(sourceTemplateId);
    if (typeof source.name !== 'string' || !source.name || typeof source.categoryCode !== 'string' || !source.categoryCode) {
      throw new BadGatewayException('알림톡 원본 템플릿 정보를 확인할 수 없습니다.');
    }
    const payload: Record<string, unknown> = {
      channelId: this.config.message.kakaoChannelId,
      name: source.name,
      categoryCode: source.categoryCode,
      content,
    };
    for (const field of PRESENTATION_FIELDS) {
      if (source[field] !== undefined && source[field] !== null) payload[field] = source[field];
    }
    this.validateVariables(payload, allowedVariables);
    return this.summarize(await this.request('POST', '', payload));
  }

  private validateVariables(template: Record<string, unknown>, allowedVariables?: readonly string[]): void {
    if (!allowedVariables) return;
    const renderedFields = ['content', ...PRESENTATION_FIELDS].map((field) => template[field]);
    const variables = JSON.stringify(renderedFields).matchAll(/#\{([^{}]+)\}/g);
    for (const match of variables) {
      if (!allowedVariables.includes(match[1])) {
        throw new BadRequestException('이 알림에서 지원하지 않는 변수가 알림톡 내용 또는 버튼에 포함되어 있습니다.');
      }
    }
  }

  async requestInspection(templateId: string): Promise<SolapiTemplateSummary> {
    const source = await this.readSource(templateId);
    if (source.status !== 'PENDING' && source.status !== 'REJECTED') {
      throw new BadRequestException('검수 대기 또는 반려된 알림톡만 검수를 요청할 수 있습니다.');
    }
    const result = this.summarize(await this.request('PUT', `/${templateId}/inspection`, {}));
    if (result.templateId !== templateId) throw new BadGatewayException('알림톡 템플릿 응답이 올바르지 않습니다.');
    return result;
  }

  private async readSource(templateId: string): Promise<Record<string, unknown>> {
    if (typeof templateId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(templateId)) {
      throw new BadRequestException('올바른 알림톡 템플릿 ID를 입력해 주세요.');
    }
    const source = await this.request('GET', `/${templateId}`);
    const summary = this.summarize(source);
    if (summary.templateId !== templateId || source.channelId !== this.config.message.kakaoChannelId || source.channelGroupId || source.isDeleted) {
      throw new BadRequestException('현재 카카오 채널에서 사용할 수 없는 템플릿입니다.');
    }
    return source;
  }

  private summarize(value: Record<string, unknown>): SolapiTemplateSummary {
    if (typeof value.templateId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value.templateId)
      || typeof value.content !== 'string'
      || !['PENDING', 'INSPECTING', 'APPROVED', 'REJECTED'].includes(value.status as string)) {
      throw new BadGatewayException('알림톡 템플릿 응답이 올바르지 않습니다.');
    }
    return { templateId: value.templateId, content: value.content, status: value.status as SolapiTemplateSummary['status'] };
  }

  private async request(method: 'GET' | 'POST' | 'PUT', path: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { apiKey, apiSecret, apiBaseUrl } = this.config.message.solapi;
    if (!apiKey || !apiSecret || !this.config.message.kakaoChannelId) {
      throw new ServiceUnavailableException('SOLAPI API 키와 카카오 채널 설정이 필요합니다.');
    }
    const date = new Date().toISOString();
    const salt = randomUUID();
    const signature = createHmac('sha256', apiSecret).update(date + salt).digest('hex');
    let response;
    try {
      response = await axios.request<unknown>({
        method,
        url: `${apiBaseUrl.replace(/\/$/, '')}/kakao/v2/templates${path}`,
        data,
        timeout: 10000,
        maxRedirects: 0,
        headers: {
          Authorization: `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      throw new BadGatewayException('SOLAPI 템플릿 요청에 실패했습니다. SOLAPI에서 처리 상태를 확인해 주세요.');
    }
    if (!response.data || typeof response.data !== 'object' || Array.isArray(response.data)) {
      throw new BadGatewayException('알림톡 템플릿 응답이 올바르지 않습니다.');
    }
    return response.data as Record<string, unknown>;
  }
}
