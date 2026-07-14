import { describe, expect, it } from 'vitest';
import {
  getMissingRequiredShellBusinessInfoSettings,
  resolveFooterBusinessInfo,
  resolveMobileBottomNavVisible,
} from '../shell-settings';

describe('shell-settings helpers', () => {
  it('returns partial footer business info without blank strings', () => {
    const businessInfo = resolveFooterBusinessInfo({
      business_company_name: '옥화당',
      business_ceo: '  ',
      business_email: 'support@example.com',
      business_info_url: 'https://www.ftc.go.kr/example',
    });

    expect(businessInfo).toEqual({
      companyName: '옥화당',
      email: 'support@example.com',
      infoUrl: 'https://www.ftc.go.kr/example',
    });
  });

  it('tracks missing required legal footer settings separately from optional fields', () => {
    const missingKeys = getMissingRequiredShellBusinessInfoSettings({
      business_company_name: '옥화당',
      business_ceo: '권준현',
      business_phone: '010-0000-0000',
    });

    expect(missingKeys).toEqual([
      'business_address',
      'business_registration_number',
      'business_mail_order_number',
    ]);
  });

  it('keeps mobile bottom navigation hidden unless the setting is explicitly true', () => {
    expect(resolveMobileBottomNavVisible({ mobile_bottom_nav_visible: 'true' })).toBe(true);
    expect(resolveMobileBottomNavVisible({ mobile_bottom_nav_visible: 'false' })).toBe(false);
    expect(resolveMobileBottomNavVisible(null)).toBe(false);
  });
});
