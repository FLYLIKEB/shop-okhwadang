import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';
import type { Page } from '@/lib/api';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<{ title: string }> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return { title: '옥화당' };
  return {
    title: `${page.title} — 옥화당`,
  };
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;

  const page = await fetchPage(slug);

  if (!page || !page.is_published) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{page.title}</h1>
      <BlockRenderer blocks={(page as Page).blocks} />
    </div>
  );
}
