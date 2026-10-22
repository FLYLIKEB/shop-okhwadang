import { fetchSettings } from '@/lib/api-server';
import ThemeEditor from './ThemeEditor';

export const metadata = { title: '테마 편집' };

export default async function ThemeSettingsPage() {
  const initialSettings = await fetchSettings();
  return <ThemeEditor initialSettings={initialSettings} />;
}
