import Content from './Content'
import Head from './Head'

const RecentlyUpdated = ({ sourceId }: { sourceId?: string }) => {
  return (
    <section>
      <Head />
      <Content sourceId={sourceId} />
    </section>
  )
}

export default RecentlyUpdated
