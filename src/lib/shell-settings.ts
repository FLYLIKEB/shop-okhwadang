export interface FooterBusinessInfo {
  companyName?: string;
  ceo?: string;
  address?: string;
  bizNo?: string;
  mailOrderNo?: string;
  phone?: string;
  email?: string;
  hours?: string;
  lunchTime?: string;
  holidays?: string;
  privacyOfficer?: string;
  infoUrl?: string;
}

const BUSINESS_INFO_SETTING_KEYS = {
  companyName: 'business_company_name',
  ceo: 'business_ceo',
  address: 'business_address',
  bizNo: 'business_registration_number',
  mailOrderNo: 'business_mail_order_number',
  phone: 'business_phone',
  email: 'business_email',
  hours: 'business_hours',
  lunchTime: 'business_lunch_time',
  holidays: 'business_holidays',
  privacyOfficer: 'business_privacy_officer',
  infoUrl: 'business_info_url',
} as const satisfies Record<keyof FooterBusinessInfo, string>;

export const REQUIRED_SHELL_BUSINESS_INFO_SETTINGS = [
  'business_company_name',
  'business_ceo',
  'business_address',
  'business_registration_number',
  'business_mail_order_number',
] as const;

function readSettingValue(
  settingsMap: Record<string, string> | null,
  key: string,
): string | undefined {
  const value = settingsMap?.[key];
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getMissingRequiredShellBusinessInfoSettings(
  settingsMap: Record<string, string> | null,
): string[] {
  return REQUIRED_SHELL_BUSINESS_INFO_SETTINGS.filter(
    (key) => !readSettingValue(settingsMap, key),
  );
}

export function resolveFooterBusinessInfo(
  settingsMap: Record<string, string> | null,
): FooterBusinessInfo | undefined {
  if (!settingsMap) return undefined;

  const businessInfo: FooterBusinessInfo = {};

  for (const [field, settingKey] of Object.entries(BUSINESS_INFO_SETTING_KEYS)) {
    const value = readSettingValue(settingsMap, settingKey);
    if (value) {
      businessInfo[field as keyof FooterBusinessInfo] = value;
    }
  }

  return Object.keys(businessInfo).length > 0 ? businessInfo : undefined;
}

export function resolveMobileBottomNavVisible(
  settingsMap: Record<string, string> | null,
): boolean {
  return readSettingValue(settingsMap, 'mobile_bottom_nav_visible') === 'true';
}
