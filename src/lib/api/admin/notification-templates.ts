import { apiClient } from '../core';

export interface NotificationTemplateContent {
  subject: string;
  html: string;
  text: string;
  templateId: string;
}

export interface NotificationTemplate extends NotificationTemplateContent {
  key: string;
  channel: 'email' | 'alimtalk';
  locale: 'ko' | 'en';
  variables: string[];
  updatedAt: string | null;
  pendingTemplateId?: string | null;
}

export interface AlimtalkTemplateRevision {
  templateId: string;
  content: string;
  status: string;
}

const templatePath = ({ channel, key, locale }: NotificationTemplate) =>
  `/admin/notification-templates/${channel}/${encodeURIComponent(key)}/${locale}`;

export const adminNotificationTemplatesApi = {
  createRevision: (template: NotificationTemplate, content: NotificationTemplateContent) =>
    apiClient.post<AlimtalkTemplateRevision>(`${templatePath(template)}/revision`, content),
  getProvider: (template: NotificationTemplate, templateId: string) =>
    apiClient.get<AlimtalkTemplateRevision>(`${templatePath(template)}/provider`, { params: { templateId } }),
  requestInspection: (template: NotificationTemplate, templateId: string) =>
    apiClient.post<AlimtalkTemplateRevision>(`${templatePath(template)}/inspection`, { templateId }),
  getAll: () => apiClient.get<NotificationTemplate[]>('/admin/notification-templates'),
  update: (template: NotificationTemplate, content: NotificationTemplateContent) =>
    apiClient.put<NotificationTemplate>(templatePath(template), content),
  preview: (template: NotificationTemplate, content: NotificationTemplateContent) =>
    apiClient.post<Pick<NotificationTemplateContent, 'subject' | 'html' | 'text'>>(`${templatePath(template)}/preview`, content),
};
