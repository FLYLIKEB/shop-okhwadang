import { describe, expect, it } from 'vitest';
import { buildStorefrontShellSnapshot } from '../storefront-shell';

describe('buildStorefrontShellSnapshot', () => {
  it('keeps the storefront shell ready when required settings exist', () => {
    const snapshot = buildStorefrontShellSnapshot({
      mobile_bottom_nav_visible: 'true',
      business_company_name: '옥화당',
      business_ceo: '권준현',
      business_address: '서울특별시 강남구 역삼로 114',
      business_registration_number: '131-72-05631',
      business_mail_order_number: '2026-서울강남-01632',
      business_email: 'support@example.com',
      color_primary: '#123456',
    });

    expect(snapshot.mode).toBe('ready');
    expect(snapshot.issue).toBeUndefined();
    expect(snapshot.mobileBottomNavVisible).toBe(true);
    expect(snapshot.themeStyle).toContain('--db-color-primary: #123456');
    expect(snapshot.businessInfo).toEqual({
      companyName: '옥화당',
      ceo: '권준현',
      address: '서울특별시 강남구 역삼로 114',
      bizNo: '131-72-05631',
      mailOrderNo: '2026-서울강남-01632',
      email: 'support@example.com',
    });
  });

  it('marks the shell degraded when the settings fetch fails', () => {
    const snapshot = buildStorefrontShellSnapshot(null, { fetchFailed: true });

    expect(snapshot.mode).toBe('degraded');
    expect(snapshot.issue).toBe('settings_fetch_failed');
    expect(snapshot.mobileBottomNavVisible).toBe(false);
    expect(snapshot.businessInfo).toBeUndefined();
  });

  it('marks the shell degraded when required settings are missing but keeps partial business info', () => {
    const snapshot = buildStorefrontShellSnapshot({
      business_company_name: '옥화당',
      business_phone: '010-0000-0000',
      business_email: 'support@example.com',
      business_ceo: '  ',
    });

    expect(snapshot.mode).toBe('degraded');
    expect(snapshot.issue).toBe('missing_required_settings');
    expect(snapshot.missingRequiredKeys).toEqual([
      'mobile_bottom_nav_visible',
      'business_ceo',
      'business_address',
      'business_registration_number',
      'business_mail_order_number',
    ]);
    expect(snapshot.businessInfo).toEqual({
      companyName: '옥화당',
      phone: '010-0000-0000',
      email: 'support@example.com',
    });
  });
});
