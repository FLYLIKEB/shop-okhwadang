import { fetchJournal, fetchJournals, fetchPage } from '@/lib/api-server';
import { notFound } from 'next/navigation';

export const revalidate = 300;

export default async function Content({ params }: { params: Promise<{ locale: string; resource: string; slug: string }> }) {
  const { locale, resource, slug } = await params;
  const content = resource === 'page' ? await fetchPage(slug, locale)
    : resource === 'journal' ? await fetchJournal(slug, locale) : await fetchJournals({ locale });
  if (!content) notFound();
  return <main>{JSON.stringify(content)}</main>;
}
