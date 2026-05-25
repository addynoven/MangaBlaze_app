import SourceView from '@/views/browse/SourceView'

export default async function SourcePage({ params }: { params: { sourceId: string } }) {
  const { sourceId } = await params;
  return <SourceView sourceId={sourceId} />
}
