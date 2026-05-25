import Link from 'next/link'

const Footer = () => {
  const onScrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <footer>
      <div className="gotop">
        <button onClick={onScrollTop} className="btn" id="go-top">
          <i className="fa-solid fa-rocket-launch fa-xl"></i>
          <p className="mb-0">Go to Surface</p>
        </button>
      </div>
      <div className="wrap border-top border-white/5 bg-secondary-subtle py-5">
        <div className="container">
          <div className="inner d-flex flex-column flex-md-row justify-content-between align-items-center gap-4">
            <div className="text-center text-md-start">
              <div className="logo mb-3">
                <img src="/logo.png" alt="MangaBlaze" style={{ height: 40 }} className="filter-brightness-125" />
              </div>
              <p className="text-muted small mb-0">© 2026 MangaBlaze</p>
            </div>
            <nav className="d-flex flex-column flex-md-row align-items-center gap-4">
              <div className="social-links d-flex gap-3">
                <Link href="https://discord.gg/" target="_blank" className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className="fa-brands fa-discord"></i>
                </Link>
                <Link href="https://reddit.com/" target="_blank" className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                  <i className="fa-brands fa-reddit-alien"></i>
                </Link>
              </div>
              <ul className="d-flex gap-3 list-unstyled mb-0 m-0 p-0 text-muted small">
                <li><Link href="contact" className="text-decoration-none hover-text-white transition-all">Contact Us</Link></li>
                <li><Link href="terms" className="text-decoration-none hover-text-white transition-all">Terms of service</Link></li>
                <li><Link data-toggle="modal" data-target="#request" href="#" className="text-decoration-none hover-text-white transition-all">Request</Link></li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
      <div className="abs-footer">
        <div className="container">
          <div className="wrapper">
            <span>
              MangaFire does not store any files on our server, we only linked
              to the media which is hosted on 3rd party services.
            </span>
            <span>
              Made with <i className="fa-solid fa-heart"></i> for Manga Lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
