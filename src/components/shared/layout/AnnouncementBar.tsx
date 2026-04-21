import { fetchAnnouncementBars } from '@/lib/api-server';
import AnnouncementBarClient from './AnnouncementBarClient';

interface AnnouncementBarProps {
  locale: string;
}

export default async function AnnouncementBar({ locale }: AnnouncementBarProps) {
  const items = await fetchAnnouncementBars(locale);

  if (items.length === 0) {
    return <div data-testid="announcement-bar-empty" className="h-0 overflow-hidden" />;
  }

  return <AnnouncementBarClient locale={locale} items={items} />;
}
