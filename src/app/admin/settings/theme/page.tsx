import type { SiteSetting } from '@/lib/api';
import ThemeEditor from './ThemeEditor';

export const metadata = { title: '테마 편집' };

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

export default async function ThemeSettingsPage() {
  let initialSettings: SiteSetting[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings`, { cache: 'no-store' });
    if (res.ok) {
      initialSettings = await res.json() as SiteSetting[];
    }
  } catch {
    // fallback to empty - ThemeEditor handles empty state
  }
  return <ThemeEditor initialSettings={initialSettings} />;
}
