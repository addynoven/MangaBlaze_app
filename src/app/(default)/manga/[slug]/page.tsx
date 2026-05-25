import Manga from '@/views/manga'

export default async function MangaPage({ params, searchParams }: { params: { slug: string }, searchParams: { source?: string } }) {
  const { slug } = await params;
  const { source } = await searchParams;
  return <Manga mangaId={slug} sourceId={source} />
}
