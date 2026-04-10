import type { SiteSetting } from '@/lib/api';
import { fetchSettings } from '@/lib/api-server';
import ThemeEditor from './ThemeEditor';

export const metadata = { title: '테마 편집' };

export default async function ThemeSettingsPage() {
  let initialSettings: SiteSetting[] = [];
  try {
    initialSettings = await fetchSettings();
  } catch {
    // fallback to empty - ThemeEditor handles empty state
  }
  return <ThemeEditor initialSettings={initialSettings} />;
}
