import { notFound } from 'next/navigation';
import BlockRenderer from '@/components/blocks/BlockRenderer';
import { pagesApi } from '@/lib/api';

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const page = await pagesApi.getBySlug(slug);
    return {
      title: `${page.title} — 옥화당`,
      description: page.title,
    };
  } catch {
    return { title: '옥화당' };
  }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params;

  let page;
  try {
    page = await pagesApi.getBySlug(slug);
  } catch {
    notFound();
  }

  if (!page || !page.is_published) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-2xl font-bold">{page.title}</h1>
      <BlockRenderer blocks={page.blocks} />
    </div>
  );
}
