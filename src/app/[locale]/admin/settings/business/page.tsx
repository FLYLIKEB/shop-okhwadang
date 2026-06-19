import type { SiteSetting } from '@/lib/api';
import { fetchSettings } from '@/lib/api-server';
import BusinessInfoEditor from './BusinessInfoEditor';

export const metadata = { title: '사업자 정보 설정' };

export default async function BusinessInfoSettingsPage() {
  let initialSettings: SiteSetting[] = [];
  try {
    initialSettings = await fetchSettings('business_info');
  } catch {
    // fallback to empty — BusinessInfoEditor handles empty state
  }
  return <BusinessInfoEditor initialSettings={initialSettings} />;
}
