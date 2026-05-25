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
      <div className="wrap">
        <div className="container">
          <div className="inner">
            <div>
              <div className="logo">
                <img src="/logo.png" alt="MangaFire" />
              </div>
              <p>© 2023 MangaFire.vercel.app</p>
            </div>
            <nav>
              <Link href="https://discord.com/invite/KRQQKzQ6CS" target="_blank">
                <i className="fa-brands fa-discord"></i>
              </Link>
              <Link href="https://www.reddit.com/r/Mangafire/" target="_blank">
                <i className="fa-brands fa-reddit-alien"></i>
              </Link>
              <ul>
                <li>
                  <Link href="contact">Contact Us</Link>
                </li>
                <li>
                  <Link href="terms">Terms of service</Link>
                </li>
                <li>
                  <Link data-toggle="modal" data-target="#request" href="#">
                    Request
                  </Link>
                </li>
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
