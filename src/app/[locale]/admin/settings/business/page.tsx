import { fetchSettings } from '@/lib/api-server';
import BusinessInfoEditor from './BusinessInfoEditor';

export const metadata = { title: '사업자 정보 설정' };

export default async function BusinessInfoSettingsPage() {
  const initialSettings = await fetchSettings('business_info');
  return <BusinessInfoEditor initialSettings={initialSettings} />;
}
