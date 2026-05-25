import Library from './Library'
import Discovery from './components/Discovery/Discovery'

const Home = () => {
  return (
    <>
      <Library />
      <div className="container">
        <hr className="my-5 border-secondary-subtle" />
        <Discovery />
      </div>
    </>
  )
}

export default Home
