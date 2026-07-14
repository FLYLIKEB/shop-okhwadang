import { getThemeStyle } from '@/lib/theme-style';

const REQUIRED_STOREFRONT_SETTING_KEYS = ['mobile_bottom_nav_visible'] as const;

export type StorefrontShellIssue = 'settings_fetch_failed' | 'missing_required_settings';

export interface StorefrontBusinessInfo {
  companyName: string;
  ceo: string;
  address: string;
  bizNo: string;
  mailOrderNo: string;
  phone: string;
  email: string;
  hours: string;
  lunchTime: string;
  holidays: string;
  privacyOfficer: string;
  infoUrl: string;
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

  return {
    companyName: settingsMap.business_company_name ?? '',
    ceo: settingsMap.business_ceo ?? '',
    address: settingsMap.business_address ?? '',
    bizNo: settingsMap.business_registration_number ?? '',
    mailOrderNo: settingsMap.business_mail_order_number ?? '',
    phone: settingsMap.business_phone ?? '',
    email: settingsMap.business_email ?? '',
    hours: settingsMap.business_hours ?? '',
    lunchTime: settingsMap.business_lunch_time ?? '',
    holidays: settingsMap.business_holidays ?? '',
    privacyOfficer: settingsMap.business_privacy_officer ?? '',
    infoUrl: settingsMap.business_info_url ?? '',
  };
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
