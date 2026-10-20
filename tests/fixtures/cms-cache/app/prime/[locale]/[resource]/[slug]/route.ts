import { buildBackendApiUrl } from '@/lib/backend-url';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; resource: string; slug: string }> }) {
  const { locale, resource, slug } = await params;
  const endpoint = resource === 'page' ? `/pages/${slug}` : resource === 'journal' ? `/journals/${slug}` : '/journals';
  const response = await fetch(`${buildBackendApiUrl(endpoint)}?locale=${locale}`, {
    next: { revalidate: 300, tags: ['cms'] },
  });
  return Response.json(await response.json(), { status: response.status });
}
