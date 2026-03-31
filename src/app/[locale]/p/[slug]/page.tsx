import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { fetchPage } from '@/lib/api-server';

export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchPage(slug);
  if (!page) return { title: '페이지를 찾을 수 없습니다' };
  return {
    title: `${page.title} | 옥화당`,
  };
}

export default async function SlugPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await fetchPage(slug);

  if (!page || !page.is_published) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
