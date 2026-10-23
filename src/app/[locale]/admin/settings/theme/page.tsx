import { localMessage } from '@/utils/localMessages';
import { fetchSettings } from '@/lib/api-server';
import ThemeEditor from './ThemeEditor';

export const metadata = { title: localMessage('admin.settings.title') };

export default async function ThemeSettingsPage() {
  const initialSettings = await fetchSettings();
  return <ThemeEditor initialSettings={initialSettings} />;
}
