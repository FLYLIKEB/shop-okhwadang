import { describe, expect, it } from 'vitest';
import { buildStorefrontShellSnapshot } from '../storefront-shell';

describe('buildStorefrontShellSnapshot', () => {
  it('keeps the storefront shell ready when required settings exist', () => {
    const snapshot = buildStorefrontShellSnapshot({
      mobile_bottom_nav_visible: 'true',
      business_company_name: '옥화당',
      color_primary: '#123456',
    });

    expect(snapshot.mode).toBe('ready');
    expect(snapshot.issue).toBeUndefined();
    expect(snapshot.mobileBottomNavVisible).toBe(true);
    expect(snapshot.themeStyle).toContain('--db-color-primary: #123456');
    expect(snapshot.businessInfo?.companyName).toBe('옥화당');
  });

  it('marks the shell degraded when the settings fetch fails', () => {
    const snapshot = buildStorefrontShellSnapshot(null, { fetchFailed: true });

    expect(snapshot.mode).toBe('degraded');
    expect(snapshot.issue).toBe('settings_fetch_failed');
    expect(snapshot.mobileBottomNavVisible).toBe(false);
    expect(snapshot.businessInfo).toBeUndefined();
  });

  it('marks the shell degraded when required settings are missing', () => {
    const snapshot = buildStorefrontShellSnapshot({
      business_company_name: '옥화당',
    });

    expect(snapshot.mode).toBe('degraded');
    expect(snapshot.issue).toBe('missing_required_settings');
    expect(snapshot.missingRequiredKeys).toEqual(['mobile_bottom_nav_visible']);
    expect(snapshot.businessInfo?.companyName).toBe('옥화당');
  });
});
