import { Genre, Language, Length, Sort, Status, Type, Year, Sources } from './components'

type FilterProps = {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void
}

const Filter = (props: FilterProps) => {
  const { handleSubmit } = props

  return (
    <form id="filters" autoComplete="off" onSubmit={handleSubmit} className="glass-panel p-4 mb-4">
      <div className="d-flex flex-column gap-3">
        <div className="search mb-2">
          <input
            type="text"
            className="form-control bg-black/20 text-white border-white/10"
            placeholder="Search..."
            name="keyword"
          />
        </div>
        <Sources />
        <Type />
...
        <Status />
        <Language />
        <Year />
        <Length />
        <Sort />
        <div className="mt-3">
          <button type="submit" className="btn btn-primary w-100 py-2">
            <i className="fa-regular fa-circles-overlap fa-xs"></i>
            <span>Apply Filters</span> <i className="ml-2 bi bi-intersect"></i>
          </button>
        </div>
      </div>
    </form>
  )
}

export default Filter
