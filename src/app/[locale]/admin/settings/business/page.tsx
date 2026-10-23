import { localMessage } from '@/utils/localMessages';
import { fetchSettings } from '@/lib/api-server';
import BusinessInfoEditor from './BusinessInfoEditor';

export const metadata = { title: localMessage('admin.guide.topics.business.title') };

export default async function BusinessInfoSettingsPage() {
  const initialSettings = await fetchSettings('business_info');
  return <BusinessInfoEditor initialSettings={initialSettings} />;
}
