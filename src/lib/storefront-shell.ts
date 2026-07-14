import { getThemeStyle } from '@/lib/theme-style';

const REQUIRED_STOREFRONT_SETTING_KEYS = [
  'mobile_bottom_nav_visible',
  'business_company_name',
  'business_ceo',
  'business_address',
  'business_registration_number',
  'business_mail_order_number',
] as const;

export type StorefrontShellIssue = 'settings_fetch_failed' | 'missing_required_settings';

export interface StorefrontBusinessInfo {
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

export interface StorefrontShellSnapshot {
  mode: 'ready' | 'degraded';
  issue?: StorefrontShellIssue;
  missingRequiredKeys: string[];
  mobileBottomNavVisible: boolean;
  themeStyle: string;
  businessInfo?: StorefrontBusinessInfo;
}

function hasSettingValue(settingsMap: Record<string, string> | null, key: string): boolean {
  const value = settingsMap?.[key];
  return typeof value === 'string' ? value.trim().length > 0 : value != null;
}

function buildBusinessInfo(settingsMap: Record<string, string> | null): StorefrontBusinessInfo | undefined {
  if (!settingsMap) return undefined;

  const businessInfo: StorefrontBusinessInfo = {};
  const fieldMap = {
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
  } as const satisfies Record<keyof StorefrontBusinessInfo, string>;

  for (const [field, key] of Object.entries(fieldMap)) {
    const value = settingsMap[key]?.trim();
    if (value) {
      businessInfo[field as keyof StorefrontBusinessInfo] = value;
    }
  }

  return Object.keys(businessInfo).length > 0 ? businessInfo : undefined;
}

export function buildStorefrontShellSnapshot(
  settingsMap: Record<string, string> | null,
  options?: { fetchFailed?: boolean },
): StorefrontShellSnapshot {
  const missingRequiredKeys = REQUIRED_STOREFRONT_SETTING_KEYS.filter((key) => !hasSettingValue(settingsMap, key));
  const issue = options?.fetchFailed
    ? 'settings_fetch_failed'
    : missingRequiredKeys.length > 0
      ? 'missing_required_settings'
      : undefined;

  return {
    mode: issue ? 'degraded' : 'ready',
    issue,
    missingRequiredKeys: [...missingRequiredKeys],
    mobileBottomNavVisible: settingsMap?.mobile_bottom_nav_visible === 'true',
    themeStyle: getThemeStyle(settingsMap),
    businessInfo: buildBusinessInfo(settingsMap),
  };
}
